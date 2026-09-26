'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ETAPAS, FICHA, TIPOS, contentTypeFor, fmtBytes, fmtMinutos, isImage,
  type Etapa, type Proyecto, type TipoArchivo,
} from '@/lib/biblioteca'
import {
  deleteArchivo, deleteProyecto, getDownloadUrl, prepareUploads, registerUploads,
  setEtapa, setPortada, setTipoArchivo, updateProyecto, type ArchivoView,
} from '../actions'

const B = '#e8e7e1'
const M = '#6b6a64'
const S = '#9a9994'

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${B}`, borderRadius: 8 }
const eyebrow: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: S, margin: '0 0 10px' }
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 14, fontFamily: 'var(--font-sans)', background: '#fff' }
const smallBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: M, cursor: 'pointer' }

const GALERIA: { tipo: TipoArchivo; label: string }[] = [
  { tipo: 'render', label: 'renders' },
  { tipo: 'boceto', label: 'bocetos' },
  { tipo: 'foto', label: 'fotos de prueba' },
]

// ── Etapa ────────────────────────────────────────────────────────────────────
function EtapaSwitch({ id, etapa }: { id: string; etapa: Etapa }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <div role="radiogroup" aria-label="etapa" style={{ display: 'inline-flex', border: '1px solid #0a0a0a', borderRadius: 4, overflow: 'hidden', opacity: pending ? 0.5 : 1 }}>
      {ETAPAS.map((e, i) => {
        const active = e.key === etapa
        return (
          <button key={e.key} type="button" role="radio" aria-checked={active} disabled={pending || active}
            title={e.desc}
            onClick={() => start(async () => { await setEtapa(id, e.key); router.refresh() })}
            style={{
              padding: '8px 16px', border: 'none', borderLeft: i ? '1px solid #0a0a0a' : 'none',
              background: active ? '#0a0a0a' : '#fff', color: active ? '#fff' : '#0a0a0a',
              fontWeight: 700, fontSize: 13, cursor: active ? 'default' : 'pointer',
            }}>
            {i > 0 && <span aria-hidden="true" style={{ marginRight: 6, color: active ? '#9a9994' : S }}>→</span>}
            {e.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Subida ───────────────────────────────────────────────────────────────────
function Uploader({ proyectoId }: { proyectoId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function upload(files: File[]) {
    if (!files.length || busy) return
    setBusy(true)
    try {
      setStatus(`preparando ${files.length} archivo(s)…`)
      const slots = await prepareUploads(proyectoId, files.map(f => ({ name: f.name, size: f.size })))
      const done: Parameters<typeof registerUploads>[1] = []
      for (let i = 0; i < slots.length; i++) {
        const f = files[i], s = slots[i]
        setStatus(`subiendo ${i + 1} de ${slots.length}: ${s.nombre} (${fmtBytes(f.size)})`)
        const ct = f.type || contentTypeFor(s.nombre)
        const res = await fetch(s.signedUrl, { method: 'PUT', body: f, headers: { 'Content-Type': ct, 'x-upsert': 'true' } })
        if (!res.ok) throw new Error(`no se pudo subir ${s.nombre} (${res.status})`)
        done.push({ nombre: s.nombre, path: s.path, tipo: s.tipo, bytes: f.size, contentType: ct })
      }
      await registerUploads(proyectoId, done)
      setStatus(`listo: ${done.length} archivo(s).`)
      router.refresh()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'falló la subida')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); upload(Array.from(e.dataTransfer.files)) }}
      style={{
        ...card, borderStyle: 'dashed', borderColor: over ? '#0a0a0a' : '#d5d3cc',
        background: over ? '#fffbe0' : '#fff', padding: 20, textAlign: 'center',
      }}
    >
      <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>arrastra aquí bocetos, renders, fotos, STL, 3MF o PDF</p>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} style={{
        height: 36, padding: '0 14px', borderRadius: 4, border: '1px solid #0a0a0a', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      }}>{busy ? 'subiendo…' : 'elegir archivos'}</button>
      <input ref={inputRef} type="file" multiple hidden onChange={e => upload(Array.from(e.target.files ?? []))} />
      <p style={{ margin: '10px 0 0', fontSize: 12, color: S }}>máximo 50 MB por archivo. si ya existe uno con el mismo nombre, se reemplaza.</p>
      {status && <p role="status" style={{ margin: '8px 0 0', fontSize: 13, color: M }}>{status}</p>}
    </div>
  )
}

// ── Galería ──────────────────────────────────────────────────────────────────
function Galeria({ proyecto, archivos }: { proyecto: Proyecto; archivos: ArchivoView[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const grupos = GALERIA
    .map(g => ({ ...g, items: archivos.filter(a => a.tipo === g.tipo && isImage(a.nombre)) }))
    .filter(g => g.items.length)
  if (!grupos.length) return null

  return (
    <div style={{ display: 'grid', gap: 20, opacity: pending ? 0.6 : 1 }}>
      {grupos.map(g => (
        <section key={g.tipo}>
          <h3 style={eyebrow}>{g.label} · {g.items.length}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {g.items.map(a => {
              const esPortada = proyecto.portada === a.path
              return (
                <figure key={a.id} style={{ ...card, margin: 0, overflow: 'hidden', borderColor: esPortada ? '#0a0a0a' : B }}>
                  <a href={a.url ?? '#'} target="_blank" rel="noreferrer" style={{ display: 'block', aspectRatio: '1', background: '#f6f5f1' }}>
                    {a.url && <img src={a.url} alt={a.nombre} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                  </a>
                  <figcaption style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: M, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.nombre}>{a.nombre}</span>
                    <span style={{ display: 'flex', gap: 10 }}>
                      {esPortada
                        ? <span style={{ fontSize: 12, fontWeight: 700 }}>portada</span>
                        : <button type="button" style={smallBtn} onClick={() => start(async () => { await setPortada(proyecto.id, a.path); router.refresh() })}>hacer portada</button>}
                      <BorrarArchivo id={a.id} />
                    </span>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function BorrarArchivo({ id }: { id: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  if (!confirm) return <button type="button" style={smallBtn} onClick={() => setConfirm(true)}>borrar</button>
  return (
    <button type="button" disabled={pending} style={{ ...smallBtn, color: '#cc0000' }}
      onClick={() => start(async () => { await deleteArchivo(id); router.refresh() })}>
      {pending ? 'borrando…' : '¿seguro? sí'}
    </button>
  )
}

// ── Archivos de impresión y documentos ───────────────────────────────────────
function ListaArchivos({ archivos }: { archivos: ArchivoView[] }) {
  const router = useRouter()
  const [, start] = useTransition()
  const [bajando, setBajando] = useState<string | null>(null)
  const items = archivos.filter(a => !isImage(a.nombre))
  if (!items.length) return null

  async function bajar(id: string) {
    setBajando(id)
    try { window.location.href = await getDownloadUrl(id) } finally { setBajando(null) }
  }

  return (
    <section>
      <h3 style={eyebrow}>archivos · {items.length}</h3>
      <div style={{ ...card, overflow: 'hidden' }}>
        {items.map((a, i) => (
          <div key={a.id} style={{
            display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px 70px auto', gap: 12, alignItems: 'center',
            padding: '10px 14px', borderTop: i ? `1px solid ${B}` : 'none',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.nombre}>{a.nombre}</span>
            <select value={a.tipo} aria-label="tipo" onChange={e => start(async () => { await setTipoArchivo(a.id, e.target.value as TipoArchivo); router.refresh() })}
              style={{ ...input, padding: '4px 6px', fontSize: 12 }}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 12, color: S, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmtBytes(a.bytes)}</span>
            <span style={{ display: 'flex', gap: 12 }}>
              <button type="button" style={{ ...smallBtn, color: '#0a0a0a' }} onClick={() => bajar(a.id)} disabled={bajando === a.id}>
                {bajando === a.id ? '…' : 'descargar'}
              </button>
              <BorrarArchivo id={a.id} />
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Ficha ────────────────────────────────────────────────────────────────────
function Ficha({ proyecto }: { proyecto: Proyecto }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const num = (name: keyof Proyecto, label: string, hint: string) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
      {label}
      <input name={name} type="number" min="0" defaultValue={(proyecto[name] as number | null) ?? ''} placeholder={hint} style={input} />
    </label>
  )

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setMsg(null)
        start(async () => {
          try { await updateProyecto(proyecto.id, fd); setMsg('guardado.'); router.refresh() }
          catch (err) { setMsg(err instanceof Error ? err.message : 'no se pudo guardar') }
        })
      }}
      style={{ ...card, padding: 18, display: 'grid', gap: 12 }}
    >
      <h3 style={{ ...eyebrow, margin: 0 }}>ficha</h3>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
        nombre
        <input name="nombre" required defaultValue={proyecto.nombre} style={input} />
      </label>
      {FICHA.map(f => (
        <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
          {f.label}
          {'long' in f && f.long
            ? <textarea name={f.key} rows={3} defaultValue={proyecto[f.key] ?? ''} placeholder={f.hint} style={{ ...input, resize: 'vertical' }} />
            : <input name={f.key} defaultValue={proyecto[f.key] ?? ''} placeholder={f.hint} style={input} />}
        </label>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {num('tiempo_min', 'tiempo de máquina (min)', 'del slicer')}
        {num('gramos', 'gramos', 'del slicer')}
        {num('costo_pesos', 'costo directo ($)', 'material + luz')}
        {num('precio_pesos', 'precio meta ($)', '')}
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
        notas
        <textarea name="notas" rows={5} defaultValue={proyecto.notas ?? ''} placeholder="qué aprendimos, qué medir en la próxima prueba…" style={{ ...input, resize: 'vertical' }} />
      </label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="submit" disabled={pending} style={{ height: 38, padding: '0 18px', borderRadius: 4, border: 'none', background: '#0a0a0a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {pending ? 'guardando…' : 'guardar ficha'}
        </button>
        {msg && <span role="status" style={{ fontSize: 13, color: M }}>{msg}</span>}
      </div>
    </form>
  )
}

function BorrarProyecto({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  return confirm ? (
    <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
      ¿borrar {nombre} y todos sus archivos?
      <button type="button" disabled={pending} style={{ ...smallBtn, color: '#cc0000', fontSize: 13 }}
        onClick={() => start(async () => { await deleteProyecto(id); router.push('/casa/biblioteca') })}>
        {pending ? 'borrando…' : 'sí, borrar'}
      </button>
      <button type="button" style={{ ...smallBtn, fontSize: 13 }} onClick={() => setConfirm(false)}>no</button>
    </span>
  ) : (
    <button type="button" style={{ ...smallBtn, fontSize: 13 }} onClick={() => setConfirm(true)}>borrar proyecto</button>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function ProyectoDetail({ proyecto, archivos, portadaUrl }: {
  proyecto: Proyecto
  archivos: ArchivoView[]
  portadaUrl: string | null
}) {
  const tiempo = fmtMinutos(proyecto.tiempo_min)
  const datos = [
    proyecto.medidas,
    tiempo && `${tiempo} de máquina`,
    proyecto.gramos && `${proyecto.gramos} g`,
    proyecto.precio_pesos && `$${proyecto.precio_pesos.toLocaleString('es-MX')} meta`,
  ].filter(Boolean)

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px 64px' }}>
      <Link href="/casa/biblioteca" style={{ fontSize: 13, color: M, textDecoration: 'none' }}>← biblioteca</Link>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between', margin: '12px 0 24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.04em', lineHeight: 0.95, margin: 0 }}>
            {proyecto.nombre}
          </h1>
          {proyecto.frase && <p style={{ fontSize: 16, color: M, margin: '8px 0 0', maxWidth: '60ch' }}>{proyecto.frase}</p>}
          {datos.length > 0 && <p style={{ fontSize: 13, color: S, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>{datos.join(' · ')}</p>}
        </div>
        <EtapaSwitch id={proyecto.id} etapa={proyecto.etapa} />
      </div>

      <div className="bib-detail" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, 1fr)', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 24 }}>
          {portadaUrl && (
            <div style={{ ...card, background: '#f6f5f1', aspectRatio: '16 / 10', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              <img src={portadaUrl} alt={proyecto.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <Uploader proyectoId={proyecto.id} />
          <Galeria proyecto={proyecto} archivos={archivos} />
          <ListaArchivos archivos={archivos} />
          {archivos.length === 0 && <p style={{ fontSize: 13, color: S, margin: 0 }}>todavía no hay archivos en este proyecto.</p>}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <Ficha proyecto={proyecto} />
          <div style={{ textAlign: 'right' }}><BorrarProyecto id={proyecto.id} nombre={proyecto.nombre} /></div>
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .bib-detail { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
