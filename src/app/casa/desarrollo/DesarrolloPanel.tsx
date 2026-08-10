'use client'

import { useMemo, useState, useTransition } from 'react'
import AdminShell from '../AdminShell'
import { addDevTask, deleteDevTask, setDevTaskStatus } from './actions'
import type { DevTask, DevTaskStatus } from './actions'
import type { Commit, CommitType, RepoFile } from './github'

const B = '#e8e7e1'
const M = '#6b6a64'
const S = '#9a9994'

// ── Formato ───────────────────────────────────────────────────────────────────
// Las fechas se derivan del string ISO sin convertir zona horaria: el servidor
// renderiza en UTC y el navegador en local, y cualquier conversión provocaría
// un desajuste de hidratación.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function dayKey(iso: string) {
  return iso.slice(0, 10)
}

function fmtDay(key: string) {
  const [y, m, d] = key.split('-')
  if (!y || !m || !d) return key || 'sin fecha'
  const mes = MESES[Number(m) - 1] ?? m
  return `${Number(d)} ${mes} ${y}`
}

function fmtKb(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

// ── Estilos compartidos ───────────────────────────────────────────────────────
const TYPE_COLORS: Record<CommitType, { bg: string; text: string; label: string }> = {
  feature:  { bg: 'rgba(0,58,135,0.07)',   text: '#003a87', label: 'feature' },
  fix:      { bg: 'rgba(255,1,0,0.06)',    text: '#cc0000', label: 'fix' },
  security: { bg: 'rgba(204,85,0,0.07)',   text: '#993300', label: 'security' },
  doc:      { bg: 'rgba(0,0,0,0.04)',      text: '#6b6a64', label: 'doc' },
  chore:    { bg: 'rgba(0,0,0,0.04)',      text: '#9a9994', label: 'chore' },
}

const STATUS_META: Record<DevTaskStatus, { icon: string; color: string; label: string }> = {
  done:    { icon: '✓', color: '#1a6b35', label: 'hecho' },
  pending: { icon: '○', color: M,         label: 'pendiente' },
  blocked: { icon: '✗', color: '#cc0000', label: 'bloqueado' },
}

const NEXT_STATUS: Record<DevTaskStatus, DevTaskStatus> = {
  pending: 'done',
  done:    'blocked',
  blocked: 'pending',
}

// Áreas del código. El orden manda en la vista.
const AREAS: { prefix: string; label: string; accent: string }[] = [
  { prefix: 'src/app/casa',       label: 'panel admin',          accent: '#003a87' },
  { prefix: 'src/app/(platform)', label: 'sitio público',        accent: '#ff0100' },
  { prefix: 'src/app/api',        label: 'endpoints y webhooks', accent: '#cc5500' },
  { prefix: 'src/lib',            label: 'lógica compartida',    accent: '#1a6b35' },
  { prefix: 'src/components',     label: 'componentes',          accent: '#00c4df' },
  { prefix: 'src/context',        label: 'contextos',            accent: '#ffd49a' },
]

// Anotaciones a mano. Solo se pintan si el archivo existe de verdad en el
// árbol del repo — así la lista no puede volver a mentir sobre archivos
// que ya no están.
const NOTES: Record<string, string> = {
  'src/proxy.ts':                          'middleware de Clerk (Next 16 lo llama proxy): exige sesión iniciada en /casa y /cuenta. No revisa rol — el admin lo comprueba cada página',
  'src/lib/auth.server.ts':                'requireAdmin, requireAdminOrThrow, requireAdminOrArtista, isAdmin',
  'src/lib/checkout.server.ts':            'quoteOrder: única fuente de verdad del total. Re-lee precios y re-deriva el descuento desde el código',
  'src/lib/skydropx.ts':                   'cliente Skydropx: cotizar, guía, rastrear, cancelar, balance',
  'src/lib/emails.ts':                     'Resend: confirmación, envío, bienvenida, cancelación, masivos',
  'src/lib/sku.ts':                        'buildProductSku (CAT3-SEQ4) y buildVariantSku',
  'src/app/api/stripe/create-intent/route.ts': 'crea el PaymentIntent usando quoteOrder — nunca el monto que manda el cliente',
  'src/app/api/stripe/webhook/route.ts':   'webhook de Stripe, verifica firma con constructEvent',
  'src/app/api/clerk/webhook/route.ts':    'webhook de Clerk verificado con svix',
  'src/app/api/email/inbound/route.ts':    'Resend Inbound → tabla support_messages',
  'src/app/api/ai/route.ts':               'asistente del panel (Anthropic). Se apaga con store_settings.ai_chat_enabled',
  'src/app/casa/AdminShell.tsx':           'header del panel y selector de secciones',
  'src/app/casa/desarrollo/github.ts':     'lee commits y árbol del repo para esta misma página',
  'next.config.ts':                        'security headers: CSP, X-Frame-Options, nosniff',
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function SectionHeader({ title, count, total }: { title: string; count?: number; total?: number }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: S, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {title}
      {count !== undefined && total !== undefined && (
        <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: count === total ? '#1a6b35' : M }}>
          {count}/{total}
        </span>
      )}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function Aviso({ text }: { text: string }) {
  return (
    <div style={{
      background: 'rgba(255,100,0,0.06)', border: '1px solid rgba(255,100,0,0.2)',
      borderRadius: 8, padding: '12px 18px', fontSize: 13, color: '#993300',
    }}>
      {text}
    </div>
  )
}

// ── Changelog ─────────────────────────────────────────────────────────────────
function ChangelogTab({ commits, error, repo }: { commits: Commit[]; error: string | null; repo: string }) {
  const days = useMemo(() => {
    const map = new Map<string, Commit[]>()
    for (const c of commits) {
      if (!c.date) continue
      const k = dayKey(c.date)
      const list = map.get(k)
      if (list) list.push(c)
      else map.set(k, [c])
    }
    return [...map.entries()]
  }, [commits])

  if (error) return <Aviso text={error} />
  if (commits.length === 0) return <Aviso text="No hay commits que mostrar." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 12, color: S, margin: 0 }}>
        últimos {commits.length} commits de <code style={{ fontFamily: 'var(--font-mono)' }}>main</code> en {repo}. se refresca solo cada 5 minutos.
      </p>

      {days.map(([day, items]) => (
        <Card key={day}>
          <div style={{
            padding: '12px 18px', borderBottom: `1px solid ${B}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0a0a0a' }}>
              {fmtDay(day)}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '2px 8px', borderRadius: 999, background: '#f0efe9', color: M,
            }}>
              {items.length} commit{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ padding: '8px 0' }}>
            {items.map(c => {
              const meta = TYPE_COLORS[c.type]
              return (
                <div key={c.sha} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 18px' }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '2px 7px', borderRadius: 999, background: meta.bg, color: meta.text,
                    flexShrink: 0, marginTop: 2,
                  }}>
                    {meta.label}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.5 }}>{c.title}</div>
                    {c.body && (
                      <div style={{ fontSize: 12, color: M, lineHeight: 1.55, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                        {c.body}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: S, marginTop: 5, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontFamily: 'var(--font-mono)', color: M, textDecoration: 'none', borderBottom: `1px dotted ${S}` }}
                      >
                        {c.shortSha}
                      </a>
                      <span>·</span>
                      <span>{c.author}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── Tareas ────────────────────────────────────────────────────────────────────
function TareasTab({ initial }: { initial: DevTask[] }) {
  const [tasks, setTasks] = useState<DevTask[]>(initial)
  const [section, setSection] = useState('')
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const sections = useMemo(() => {
    const map = new Map<string, DevTask[]>()
    for (const t of tasks) {
      const list = map.get(t.section)
      if (list) list.push(t)
      else map.set(t.section, [t])
    }
    return [...map.entries()]
  }, [tasks])

  const knownSections = useMemo(() => [...new Set(tasks.map(t => t.section))], [tasks])

  function handleAdd() {
    const cleanText = text.trim()
    if (!cleanText || pending) return
    const cleanSection = section.trim() || 'general'
    const optimistic: DevTask = {
      id: `tmp-${Date.now()}`,
      section: cleanSection,
      text: cleanText,
      note: note.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    const before = tasks
    setTasks([optimistic, ...tasks])
    setText(''); setNote(''); setError(null)
    start(async () => {
      try {
        await addDevTask(cleanSection, cleanText, optimistic.note)
      } catch {
        setTasks(before)
        setError('no se pudo guardar la tarea')
      }
    })
  }

  function handleCycle(task: DevTask) {
    if (pending) return
    const next = NEXT_STATUS[task.status]
    const before = tasks
    setTasks(tasks.map(t => (t.id === task.id ? { ...t, status: next } : t)))
    setError(null)
    start(async () => {
      try {
        await setDevTaskStatus(task.id, next)
      } catch {
        setTasks(before)
        setError('no se pudo cambiar el estado')
      }
    })
  }

  function handleDelete(task: DevTask) {
    if (pending) return
    const before = tasks
    setTasks(tasks.filter(t => t.id !== task.id))
    setError(null)
    start(async () => {
      try {
        await deleteDevTask(task.id)
      } catch {
        setTasks(before)
        setError('no se pudo borrar la tarea')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Alta */}
      <Card style={{ padding: 16 }}>
        <SectionHeader title="nueva tarea" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="adm-inp"
            list="dev-secciones"
            placeholder="sección"
            value={section}
            onChange={e => setSection(e.target.value)}
            style={{ width: 150 }}
          />
          <datalist id="dev-secciones">
            {knownSections.map(s => <option key={s} value={s} />)}
          </datalist>
          <input
            className="adm-inp"
            placeholder="qué falta hacer"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            style={{ flex: 1, minWidth: 220 }}
          />
          <input
            className="adm-inp"
            placeholder="nota (opcional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <button className="adm-btn-primary" onClick={handleAdd} disabled={!text.trim() || pending}>
            agregar
          </button>
        </div>
        {error && <p style={{ fontSize: 12, color: '#cc0000', margin: '10px 0 0' }}>{error}</p>}
      </Card>

      {tasks.length === 0 && (
        <p style={{ fontSize: 13, color: M, fontStyle: 'italic', margin: 0 }}>
          no hay tareas todavía. agrega la primera arriba.
        </p>
      )}

      {sections.map(([name, items]) => {
        const done = items.filter(i => i.status === 'done').length
        return (
          <div key={name}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 24, height: 3, background: '#0a0a0a', borderRadius: 2 }} />
              <SectionHeader title={name} count={done} total={items.length} />
            </div>

            <Card>
              {items.map((t, i) => {
                const meta = STATUS_META[t.status]
                return (
                  <div
                    key={t.id}
                    className="adm-row"
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 16px',
                      borderTop: i === 0 ? 'none' : `1px solid ${B}`,
                    }}
                  >
                    <button
                      onClick={() => handleCycle(t)}
                      title={`${meta.label} — clic para cambiar`}
                      style={{
                        border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                        color: meta.color, fontSize: 14, lineHeight: 1.4, flexShrink: 0, width: 16,
                      }}
                    >
                      {meta.icon}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, lineHeight: 1.5,
                        color: t.status === 'done' ? M : '#0a0a0a',
                        textDecoration: t.status === 'done' ? 'line-through' : 'none',
                      }}>
                        {t.text}
                      </div>
                      {t.note && (
                        <div style={{ fontSize: 12, color: S, lineHeight: 1.5, marginTop: 3 }}>{t.note}</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(t)}
                      title="borrar"
                      className="adm-btn-icon"
                      style={{ flexShrink: 0 }}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </Card>
          </div>
        )
      })}
    </div>
  )
}

// ── Código ────────────────────────────────────────────────────────────────────
function CodigoTab({ files, error, truncated }: { files: RepoFile[]; error: string | null; truncated: boolean }) {
  const areas = useMemo(() => {
    return AREAS.map(area => {
      const own = files.filter(f => f.path.startsWith(area.prefix + '/'))
      return {
        ...area,
        count: own.length,
        bytes: own.reduce((s, f) => s + f.size, 0),
        annotated: own
          .filter(f => NOTES[f.path])
          .map(f => ({ path: f.path, size: f.size, note: NOTES[f.path] })),
      }
    }).filter(a => a.count > 0)
  }, [files])

  const rootNotes = useMemo(
    () => files.filter(f => NOTES[f.path] && !f.path.startsWith('src/app/') && !AREAS.some(a => f.path.startsWith(a.prefix + '/')))
               .map(f => ({ path: f.path, size: f.size, note: NOTES[f.path] })),
    [files],
  )

  if (error) return <Aviso text={error} />
  if (files.length === 0) return <Aviso text="No se pudo leer el árbol del repo." />

  const srcFiles = files.filter(f => f.path.startsWith('src/'))
  const srcBytes = srcFiles.reduce((s, f) => s + f.size, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p style={{ fontSize: 12, color: S, margin: 0 }}>
        {srcFiles.length} archivos en <code style={{ fontFamily: 'var(--font-mono)' }}>src/</code> · {fmtKb(srcBytes)} ·
        leído del repo, no escrito a mano.
        {truncated && ' (GitHub truncó el árbol: el repo es grande)'}
      </p>

      {areas.map(area => (
        <div key={area.prefix}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 24, height: 3, background: area.accent, borderRadius: 2 }} />
            <SectionHeader title={area.label} />
            <span style={{ fontSize: 11, color: S, marginTop: -12 }}>
              {area.count} archivos · {fmtKb(area.bytes)}
            </span>
          </div>

          {area.annotated.length > 0 && (
            <Card>
              {area.annotated.map((f, i) => (
                <div key={f.path} style={{
                  padding: '10px 16px', borderTop: i === 0 ? 'none' : `1px solid ${B}`,
                }}>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#0a0a0a' }}>{f.path}</code>
                  <div style={{ fontSize: 12, color: M, lineHeight: 1.5, marginTop: 3 }}>{f.note}</div>
                </div>
              ))}
            </Card>
          )}
        </div>
      ))}

      {rootNotes.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 24, height: 3, background: '#6b6a64', borderRadius: 2 }} />
            <SectionHeader title="raíz" />
          </div>
          <Card>
            {rootNotes.map((f, i) => (
              <div key={f.path} style={{ padding: '10px 16px', borderTop: i === 0 ? 'none' : `1px solid ${B}` }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#0a0a0a' }}>{f.path}</code>
                <div style={{ fontSize: 12, color: M, lineHeight: 1.5, marginTop: 3 }}>{f.note}</div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────
const TABS = ['changelog', 'tareas', 'código'] as const
type Tab = typeof TABS[number]

export default function DesarrolloPanel({
  repo, commits, commitsError, files, filesTruncated, filesError, tasks,
}: {
  repo: string
  commits: Commit[]
  commitsError: string | null
  files: RepoFile[]
  filesTruncated: boolean
  filesError: string | null
  tasks: DevTask[]
}) {
  const [tab, setTab] = useState<Tab>('tareas')

  const done = tasks.filter(t => t.status === 'done').length
  const blocked = tasks.filter(t => t.status === 'blocked').length
  const lastCommit = commits[0]
  const srcFiles = files.filter(f => f.path.startsWith('src/'))
  const srcBytes = srcFiles.reduce((s, f) => s + f.size, 0)

  const kpis = [
    {
      label: 'tareas completadas',
      value: tasks.length === 0 ? '—' : `${done}/${tasks.length}`,
      sub: blocked > 0 ? `${blocked} bloqueada${blocked !== 1 ? 's' : ''}` : `${tasks.length - done} pendientes`,
      color: blocked > 0 ? '#cc0000' : done === tasks.length && tasks.length > 0 ? '#1a6b35' : '#003a87',
    },
    {
      label: 'commits en main',
      value: commits.length === 0 ? '—' : commits.length,
      sub: lastCommit ? `último: ${fmtDay(dayKey(lastCommit.date))}` : 'sin datos de GitHub',
      color: '#0a0a0a',
    },
    {
      label: 'código',
      value: srcFiles.length === 0 ? '—' : srcFiles.length,
      sub: srcFiles.length === 0 ? 'sin datos de GitHub' : `archivos en src/ · ${fmtKb(srcBytes)}`,
      color: '#6b6a64',
    },
  ]

  return (
    <AdminShell crumb="desarrollo">
      <main style={{ maxWidth: 960, margin: '0 auto' }} className="adm-main-pad">

        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900,
            letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 6, textTransform: 'lowercase',
          }}>
            panel de desarrollo
          </h1>
          <p style={{ color: M, fontSize: 13, margin: 0 }}>
            changelog y estado del código leídos del repo; las tareas las llevas tú.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {kpis.map(kpi => (
            <div key={kpi.label} style={{
              background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 22px',
            }}>
              <div style={{ width: 28, height: 3, background: kpi.color, borderRadius: 2, marginBottom: 14 }} />
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0a0a0a', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: M, marginTop: 6 }}>{kpi.label}</div>
              <div style={{ fontSize: 11, color: S, marginTop: 3 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: '#f0efe9', borderRadius: 6, padding: 3, width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '7px 18px', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#0a0a0a' : M,
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'background 100ms, color 100ms',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'changelog' && <ChangelogTab commits={commits} error={commitsError} repo={repo} />}
        {tab === 'tareas'    && <TareasTab initial={tasks} />}
        {tab === 'código'    && <CodigoTab files={files} error={filesError} truncated={filesTruncated} />}

      </main>
    </AdminShell>
  )
}
