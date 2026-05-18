'use client'

import { useState, useTransition, useRef } from 'react'
import {
  updateArtistProfile, updateArtistSections,
  createShow, updateShow, deleteShow,
  createTask, updateTaskStatus, deleteTask,
  createContent, updateContentStatus, deleteContent,
  createExternalIncome, deleteExternalIncome,
  linkArtistClerkUser,
} from './actions'
import { getArtistUploadUrl } from '../actions'
import ImageCropper, { cropAndCompress } from '../../tienda/ImageCropper'
import type { Area } from 'react-easy-crop'

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Show = { id: string; venue: string; city: string; date: string; ticket_url: string | null; price_mxn: number | null; capacity: number | null; is_published: boolean }
type Task = { id: string; title: string; description: string | null; due_date: string | null; status: string; priority: string }
type Content = { id: string; title: string; description: string | null; platform: string; content_type: string; scheduled_date: string | null; status: string }
type Income = { id: string; description: string; amount_mxn: number; date: string; category: string; notes: string | null }
type Artist = {
  id: string; slug: string; name: string; bio: string | null; city: string | null
  genre: string | null; image_url: string | null; is_published: boolean
  bg_color: string; stripe_color: string; fg_color: string
  instagram: string | null; tiktok: string | null; spotify: string | null; youtube: string | null
  page_sections?: { key: string; visible: boolean }[] | null
  clerk_user_id: string | null
  shows: Show[]; tasks: Task[]; content: Content[]; income: Income[]
  merch_total: number
}

// ── Constantes ─────────────────────────────────────────────────────────────────
const B = '#e8e7e1', M = '#6b6a64', S = '#9a9994'
const fmt = (cents: number) => (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#e1306c', tiktok: '#010101', youtube: '#ff0000',
  spotify: '#1db954', twitter: '#1da1f2', otro: '#6b6a64',
}
const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  baja:   { bg: '#f0efe9', text: '#6b6a64' },
  normal: { bg: 'rgba(0,58,135,0.08)', text: '#003a87' },
  alta:   { bg: 'rgba(255,1,0,0.08)', text: '#cc0000' },
}
const STATUS_CONTENT: Record<string, { bg: string; text: string }> = {
  idea:       { bg: '#f0efe9',             text: '#6b6a64' },
  en_progreso: { bg: 'rgba(0,58,135,0.08)', text: '#003a87' },
  programado: { bg: 'rgba(0,196,223,0.1)', text: '#007a8c' },
  publicado:  { bg: 'rgba(26,107,53,0.08)', text: '#1a6b35' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 20px', background: '#f6f5f1', borderBottom: `1px solid ${B}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

function TrashBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="adm-btn-icon" style={{ height: 28, width: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
    </button>
  )
}

// ── Subida de imagen del artista ───────────────────────────────────────────────
function ArtistImageUpload({ currentUrl, onUploaded }: { currentUrl?: string | null; onUploaded: (url: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'cropping' | 'uploading' | 'done'>(currentUrl ? 'done' : 'idle')
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function openFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('solo JPG, PNG o WebP'); return }
    setError(null); setPendingFile(file)
    setCropSrc(URL.createObjectURL(file)); setPhase('cropping')
  }

  async function handleCropConfirm(pixels: Area) {
    if (!cropSrc || !pendingFile) return
    setPhase('uploading'); setProgress(0)
    try {
      const croppedFile = await cropAndCompress(cropSrc, pixels, pendingFile.name)
      setPreview(URL.createObjectURL(croppedFile))
      const { signedUrl, publicUrl } = await getArtistUploadUrl(croppedFile.name, croppedFile.type)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)) })
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}`))
        xhr.onerror = () => reject(new Error('red'))
        xhr.open('PUT', signedUrl); xhr.setRequestHeader('Content-Type', croppedFile.type); xhr.send(croppedFile)
      })
      URL.revokeObjectURL(cropSrc); onUploaded(publicUrl); setPhase('done')
    } catch (e) { setError(e instanceof Error ? e.message : 'error'); setPhase(preview ? 'done' : 'idle') }
  }

  return (
    <>
      {phase === 'cropping' && cropSrc && (
        <ImageCropper src={cropSrc} onConfirm={handleCropConfirm} onCancel={() => { URL.revokeObjectURL(cropSrc!); setCropSrc(null); setPhase(preview ? 'done' : 'idle') }} />
      )}
      <div
        onClick={() => (phase === 'idle' || phase === 'done') && inputRef.current?.click()}
        style={{
          width: '100%', aspectRatio: '1/1', maxWidth: 220, borderRadius: 8,
          border: `2px dashed ${B}`, background: preview ? '#0a0a0a' : '#f6f5f1',
          cursor: 'pointer', overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {preview && <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {phase === 'idle' && <div style={{ textAlign: 'center', fontSize: 12, color: M }}>arrastra o clic<br /><span style={{ fontSize: 11, color: S }}>1:1 · máx 10MB</span></div>}
        {phase === 'uploading' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{progress}%</span>
          </div>
        )}
        {phase === 'done' && (
          <button type="button" onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
            style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(10,10,10,0.75)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
            cambiar
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: '#ff0100', marginTop: 4 }}>{error}</div>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = '' }} />
    </>
  )
}

// ── Tab: Perfil ────────────────────────────────────────────────────────────────
// ── Secciones del perfil ───────────────────────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
  canciones: 'canciones',
  fechas:    'fechas / boletos',
  merch:     'merch',
}

function SeccionesCard({ artist }: { artist: Artist }) {
  const DEFAULT = [
    { key: 'canciones', visible: true },
    { key: 'fechas',    visible: true },
    { key: 'merch',     visible: true },
  ]
  const [sections, setSections] = useState(
    (artist.page_sections as { key: string; visible: boolean }[] | undefined) ?? DEFAULT
  )
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)

  function move(i: number, dir: -1 | 1) {
    const next = [...sections]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setSections(next)
  }

  function toggle(i: number) {
    const next = [...sections]
    next[i] = { ...next[i], visible: !next[i].visible }
    setSections(next)
  }

  function save() {
    start(async () => {
      await updateArtistSections(artist.id, sections)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <SectionCard
      title="secciones del perfil público"
      action={
        <button onClick={save} disabled={pending} className="adm-btn-primary" style={{ height: 28, padding: '0 14px', fontSize: 11 }}>
          {pending ? '…' : saved ? 'guardado ✓' : 'guardar orden'}
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sections.map((s, i) => (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', background: s.visible ? '#fff' : '#f6f5f1',
            border: `1px solid ${B}`, borderRadius: 6,
          }}>
            {/* drag handle visual */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, cursor: 'default' }}>
              <div style={{ width: 14, height: 1.5, background: S, borderRadius: 1 }} />
              <div style={{ width: 14, height: 1.5, background: S, borderRadius: 1 }} />
              <div style={{ width: 14, height: 1.5, background: S, borderRadius: 1 }} />
            </div>

            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: s.visible ? '#0a0a0a' : S }}>
              {SECTION_LABELS[s.key] ?? s.key}
            </span>

            {/* visible toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: M }}>
              <input type="checkbox" checked={s.visible} onChange={() => toggle(i)}
                style={{ width: 15, height: 15, accentColor: '#1a6b35', cursor: 'pointer' }} />
              {s.visible ? 'visible' : 'oculto'}
            </label>

            {/* reorder arrows */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="adm-btn-icon"
                style={{ height: 26, width: 26, padding: 0, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ↑
              </button>
              <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="adm-btn-icon"
                style={{ height: 26, width: 26, padding: 0, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function ClerkLinkCard({ artist }: { artist: Artist }) {
  const [val, setVal] = useState(artist.clerk_user_id ?? '')
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)

  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        acceso del artista al panel
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="user_xxxxxxxxxxxxxx (Clerk User ID)"
          style={{
            flex: 1, minWidth: 240, padding: '8px 12px', borderRadius: 6,
            border: `1px solid ${B}`, fontSize: 13, fontFamily: 'monospace',
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => {
            await linkArtistClerkUser(artist.id, val)
            setSaved(true); setTimeout(() => setSaved(false), 2000)
          })}
          className="adm-btn-primary"
          style={{ height: 36, padding: '0 16px', fontSize: 13 }}
        >
          {pending ? 'guardando…' : saved ? 'vinculado ✓' : 'vincular'}
        </button>
        {artist.clerk_user_id && (
          <button
            type="button"
            disabled={pending}
            onClick={() => { setVal(''); start(async () => { await linkArtistClerkUser(artist.id, ''); setSaved(true); setTimeout(() => setSaved(false), 2000) }) }}
            style={{ fontSize: 12, color: '#cc0000', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
          >
            desvincular
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: M, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
        {artist.clerk_user_id
          ? `el artista puede iniciar sesión en /casa/login con su cuenta de Clerk y ver solo este perfil`
          : 'pega el Clerk User ID del artista para darle acceso a su perfil. lo encuentras en /casa/usuarios'}
      </p>
    </div>
  )
}

function PerfilTab({ artist, isAdmin }: { artist: Artist; isAdmin: boolean }) {
  const [imageUrl, setImageUrl] = useState(artist.image_url ?? '')
  const [bgColor, setBgColor]   = useState(artist.bg_color)
  const [pending, start]        = useTransition()
  const [saved, setSaved]       = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('image_url', imageUrl)
    fd.set('bg_color', bgColor)
    start(async () => {
      await updateArtistProfile(artist.id, fd)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>
        {/* Foto */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>foto</div>
          <ArtistImageUpload currentUrl={artist.image_url} onUploaded={setImageUrl} />
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="nombre artístico">
              <input name="name" defaultValue={artist.name} required className="adm-inp" style={{ width: '100%', height: 36 }} />
            </Field>
            <Field label="slug (URL)">
              <input name="slug" defaultValue={artist.slug} required className="adm-inp" style={{ width: '100%', height: 36, fontFamily: 'monospace', fontSize: 13 }} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="ciudad">
              <input name="city" defaultValue={artist.city ?? ''} className="adm-inp" style={{ width: '100%', height: 36 }} />
            </Field>
            <Field label="género">
              <input name="genre" defaultValue={artist.genre ?? ''} className="adm-inp" style={{ width: '100%', height: 36 }} placeholder="electrónica · ambient" />
            </Field>
          </div>
          <Field label="bio">
            <textarea name="bio" defaultValue={artist.bio ?? ''} rows={4} className="adm-inp" style={{ width: '100%', resize: 'vertical' }} />
          </Field>
        </div>
      </div>

      {/* Redes */}
      <SectionCard title="redes sociales">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { name: 'instagram', label: 'Instagram', placeholder: '@artista' },
            { name: 'tiktok',    label: 'TikTok',    placeholder: '@artista' },
            { name: 'spotify',   label: 'Spotify',   placeholder: 'URL del perfil' },
            { name: 'youtube',   label: 'YouTube',   placeholder: 'URL del canal' },
          ].map(r => (
            <Field key={r.name} label={r.label}>
              <input name={r.name} defaultValue={(artist as Record<string, unknown>)[r.name] as string ?? ''} className="adm-inp" style={{ width: '100%', height: 36, fontSize: 13 }} placeholder={r.placeholder} />
            </Field>
          ))}
        </div>
      </SectionCard>

      {/* Identidad visual */}
      <SectionCard title="identidad visual">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {[
            { name: 'bg_color', label: 'Fondo', val: bgColor, onChange: setBgColor },
            { name: 'stripe_color', label: 'Acento', val: artist.stripe_color, onChange: () => {} },
            { name: 'fg_color', label: 'Texto', val: artist.fg_color, onChange: () => {} },
          ].map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" name={c.name} defaultValue={c.val} onChange={e => c.onChange(e.target.value)}
                style={{ width: 36, height: 36, border: `1px solid ${B}`, borderRadius: 6, cursor: 'pointer', padding: 2 }} />
              <span style={{ fontSize: 13, color: M }}>{c.label}</span>
            </div>
          ))}

          {/* Preview */}
          <div style={{
            height: 36, paddingLeft: 16, paddingRight: 20, borderRadius: 6,
            background: bgColor, display: 'flex', alignItems: 'center', gap: 10,
            border: `1px solid ${B}`, minWidth: 160,
          }}>
            <div style={{ width: 20, height: 3, background: artist.stripe_color, borderRadius: 2 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: artist.fg_color }}>{artist.name}</span>
          </div>
        </div>
      </SectionCard>

      {/* Secciones */}
      <SeccionesCard artist={artist} />

      {/* Publicado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '16px 20px' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a' }}>publicar en el sitio</div>
          <div style={{ fontSize: 12, color: M, marginTop: 2 }}>visible en /artistas y en la homepage</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="hidden" name="is_published" value="false" />
          <input type="checkbox" name="is_published" value="true" defaultChecked={artist.is_published}
            style={{ width: 18, height: 18, accentColor: '#1a6b35', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: M }}>publicado</span>
        </label>
      </div>

      {/* Guardar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="submit" disabled={pending} className="adm-btn-primary" style={{ height: 38, padding: '0 24px', fontSize: 13 }}>
          {pending ? 'guardando…' : saved ? 'guardado ✓' : 'guardar cambios'}
        </button>
      </div>

      {isAdmin && <ClerkLinkCard artist={artist} />}
    </form>
  )
}

// ── Tab: Shows ─────────────────────────────────────────────────────────────────
function ShowForm({ show, onCancel, onSave, pending }: { show?: Show; onCancel: () => void; onSave: (fd: FormData) => void; pending: boolean }) {
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(new FormData(e.currentTarget)) }}
      style={{ background: '#f9f8f4', border: `1px solid ${B}`, borderRadius: 6, padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Field label="venue"><input name="venue" defaultValue={show?.venue} required className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} /></Field>
      <Field label="ciudad"><input name="city" defaultValue={show?.city} required className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} /></Field>
      <Field label="fecha y hora"><input name="date" type="datetime-local" defaultValue={show?.date?.slice(0, 16)} required className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} /></Field>
      <Field label="precio (MXN)"><input name="price_mxn" type="number" min="0" defaultValue={show?.price_mxn ? show.price_mxn / 100 : ''} className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} placeholder="350" /></Field>
      <Field label="URL boletos" ><input name="ticket_url" defaultValue={show?.ticket_url ?? ''} className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} placeholder="https://…" /></Field>
      <Field label="aforo"><input name="capacity" type="number" min="0" defaultValue={show?.capacity ?? ''} className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} /></Field>
      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} className="adm-btn-secondary" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>cancelar</button>
        <button type="submit" disabled={pending} className="adm-btn-primary" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>
          {pending ? '…' : show ? 'actualizar' : 'agregar show'}
        </button>
      </div>
    </form>
  )
}

function ShowRow({ show, artistId, editing, onSetEditing }: { show: Show; artistId: string; editing: string | null; onSetEditing: (id: string | null) => void }) {
  const [pending, start] = useTransition()
  const isPast = new Date(show.date) < new Date()
  return (
    <>
      {editing === show.id ? (
        <ShowForm show={show} pending={pending} onCancel={() => onSetEditing(null)}
          onSave={fd => { fd.set('is_published', String(show.is_published)); start(() => updateShow(show.id, artistId, fd).then(() => onSetEditing(null))) }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 60px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${B}` }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: isPast ? M : '#0a0a0a' }}>{show.venue}</div>
            <div style={{ fontSize: 12, color: M }}>{show.city} · {new Date(show.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>
          <div style={{ fontSize: 13, fontFamily: 'monospace', color: M }}>{show.price_mxn ? fmt(show.price_mxn) : '—'}</div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: show.is_published ? 'rgba(26,107,53,0.08)' : '#f0efe9', color: show.is_published ? '#1a6b35' : M, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {show.is_published ? 'activo' : 'borrador'}
          </span>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <button onClick={() => onSetEditing(show.id)} className="adm-btn-icon" style={{ height: 28, width: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <TrashBtn onClick={() => start(() => deleteShow(show.id, artistId))} disabled={pending} />
          </div>
        </div>
      )}
    </>
  )
}

function ShowsTab({ artist }: { artist: Artist }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const upcoming = artist.shows.filter(s => new Date(s.date) >= new Date()).sort((a, b) => a.date.localeCompare(b.date))
  const past     = artist.shows.filter(s => new Date(s.date) <  new Date()).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title={`próximos · ${upcoming.length}`} action={
        !adding && <button onClick={() => setAdding(true)} className="adm-btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 11 }}>+ agregar</button>
      }>
        {adding && <div style={{ marginBottom: 16 }}><ShowForm pending={pending} onCancel={() => setAdding(false)}
          onSave={fd => { fd.set('is_published', 'true'); start(() => createShow(artist.id, fd).then(() => setAdding(false))) }} /></div>}
        {upcoming.length === 0 && !adding ? (
          <p style={{ color: M, fontSize: 13, fontStyle: 'italic', margin: 0 }}>sin shows próximos.</p>
        ) : upcoming.map(s => <ShowRow key={s.id} show={s} artistId={artist.id} editing={editing} onSetEditing={setEditing} />)}
      </SectionCard>

      {past.length > 0 && (
        <SectionCard title={`pasados · ${past.length}`}>
          {past.slice(0, 5).map(s => <ShowRow key={s.id} show={s} artistId={artist.id} editing={editing} onSetEditing={setEditing} />)}
        </SectionCard>
      )}
    </div>
  )
}

// ── Tab: Tareas (Kanban) ───────────────────────────────────────────────────────
const TASK_COLS = [
  { key: 'pendiente',   label: 'pendiente',   color: '#9a9994' },
  { key: 'en_progreso', label: 'en progreso', color: '#003a87' },
  { key: 'listo',       label: 'listo',       color: '#1a6b35' },
]

function TaskCard({ task, artistId }: { task: Task; artistId: string }) {
  const [pending, start] = useTransition()
  const pc = PRIORITY_COLORS[task.priority]
  const next = TASK_COLS[(TASK_COLS.findIndex(c => c.key === task.status) + 1) % TASK_COLS.length]
  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 6, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.4, flex: 1 }}>{task.title}</span>
        <TrashBtn onClick={() => start(() => deleteTask(task.id, artistId))} disabled={pending} />
      </div>
      {task.description && <p style={{ fontSize: 12, color: M, margin: 0, lineHeight: 1.5 }}>{task.description}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: pc.bg, color: pc.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {task.priority}
        </span>
        {task.due_date && <span style={{ fontSize: 11, color: S }}>{new Date(task.due_date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</span>}
      </div>
      {task.status !== 'listo' && (
        <button onClick={() => start(() => updateTaskStatus(task.id, artistId, next.key))} disabled={pending}
          style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: next.color, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
          → mover a {next.label}
        </button>
      )}
    </div>
  )
}

function TareasTab({ artist }: { artist: Artist }) {
  const [adding, setAdding]     = useState(false)
  const [pending, start]        = useTransition()

  const done  = artist.tasks.filter(t => t.status === 'listo').length
  const total = artist.tasks.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Progreso */}
      {total > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, height: 5, background: '#f0efe9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #003a87 0%, #1a6b35 100%)', width: `${Math.round(done / total * 100)}%`, transition: 'width 400ms' }} />
          </div>
          <span style={{ fontSize: 13, color: M, flexShrink: 0 }}><strong style={{ color: '#0a0a0a' }}>{done}/{total}</strong> completadas</span>
        </div>
      )}

      {/* Agregar tarea */}
      {adding && (
        <form onSubmit={e => { e.preventDefault(); start(() => createTask(artist.id, new FormData(e.currentTarget)).then(() => setAdding(false))) }}
          style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="título">
              <input name="title" required className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="prioridad">
                <select name="priority" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }}>
                  <option value="baja">baja</option>
                  <option value="normal" selected>normal</option>
                  <option value="alta">alta</option>
                </select>
              </Field>
              <Field label="fecha límite">
                <input name="due_date" type="date" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} />
              </Field>
            </div>
          </div>
          <Field label="descripción (opcional)">
            <textarea name="description" rows={2} className="adm-inp" style={{ width: '100%', resize: 'vertical', fontSize: 13 }} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setAdding(false)} className="adm-btn-secondary" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>cancelar</button>
            <button type="submit" disabled={pending} className="adm-btn-primary" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>agregar tarea</button>
          </div>
        </form>
      )}

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {TASK_COLS.map(col => {
          const tasks = artist.tasks.filter(t => t.status === col.key)
          return (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col.label}</span>
                </div>
                <span style={{ fontSize: 12, color: S }}>{tasks.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map(t => <TaskCard key={t.id} task={t} artistId={artist.id} />)}
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={() => setAdding(true)} className="adm-btn-secondary" style={{ height: 34, padding: '0 16px', fontSize: 12, alignSelf: 'flex-start' }}>
        + nueva tarea
      </button>
    </div>
  )
}

// ── Tab: Contenido ─────────────────────────────────────────────────────────────
function ContentRow({ item, artistId }: { item: Content; artistId: string }) {
  const [pending, start] = useTransition()
  const sc  = STATUS_CONTENT[item.status]
  const pc  = PLATFORM_COLORS[item.platform]
  const nextStatus = { idea: 'en_progreso', en_progreso: 'programado', programado: 'publicado', publicado: 'idea' }[item.status] ?? 'idea'
  const nextLabel  = { idea: 'en progreso', en_progreso: 'programado', programado: 'publicado', publicado: 'idea' }[item.status] ?? 'idea'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${B}` }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: pc, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>{item.title}</div>
        <div style={{ fontSize: 11, color: M }}>{item.platform} · {item.content_type}{item.scheduled_date ? ` · ${new Date(item.scheduled_date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}` : ''}</div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.text, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {item.status.replace('_', ' ')}
      </span>
      <button onClick={() => start(() => updateContentStatus(item.id, artistId, nextStatus))} disabled={pending}
        style={{ fontSize: 11, color: M, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', padding: '4px 8px' }}>
        → {nextLabel}
      </button>
      <TrashBtn onClick={() => start(() => deleteContent(item.id, artistId))} disabled={pending} />
    </div>
  )
}

function ContenidoTab({ artist }: { artist: Artist }) {
  const [adding, setAdding] = useState(false)
  const [pending, start]    = useTransition()

  const byStatus = {
    idea:        artist.content.filter(c => c.status === 'idea'),
    en_progreso: artist.content.filter(c => c.status === 'en_progreso'),
    programado:  artist.content.filter(c => c.status === 'programado'),
    publicado:   artist.content.filter(c => c.status === 'publicado'),
  }

  const totalPublicado = byStatus.publicado.length
  const totalTotal     = artist.content.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      {totalTotal > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '16px 20px', display: 'flex', gap: 24 }}>
          {Object.entries(byStatus).map(([s, items]) => (
            <div key={s}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#0a0a0a' }}>{items.length}</div>
              <div style={{ fontSize: 11, color: M, textTransform: 'capitalize' }}>{s.replace('_', ' ')}</div>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 80, height: 4, background: '#f0efe9', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#1a6b35', width: `${totalTotal > 0 ? Math.round(totalPublicado / totalTotal * 100) : 0}%` }} />
            </div>
            <span style={{ fontSize: 12, color: M }}>{totalTotal > 0 ? Math.round(totalPublicado / totalTotal * 100) : 0}% publicado</span>
          </div>
        </div>
      )}

      {/* Agregar */}
      {adding && (
        <form onSubmit={e => { e.preventDefault(); start(() => createContent(artist.id, new FormData(e.currentTarget)).then(() => setAdding(false))) }}
          style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="título"><input name="title" required className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} /></Field>
            <Field label="plataforma">
              <select name="platform" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }}>
                {['instagram','tiktok','youtube','spotify','twitter','otro'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="tipo">
              <select name="content_type" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }}>
                {['post','reel','story','video','audio','otro'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="fecha programada"><input name="scheduled_date" type="date" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} /></Field>
            <Field label="estado">
              <select name="status" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }}>
                {['idea','en_progreso','programado','publicado'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </Field>
            <Field label="descripción">
              <input name="description" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setAdding(false)} className="adm-btn-secondary" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>cancelar</button>
            <button type="submit" disabled={pending} className="adm-btn-primary" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>agregar</button>
          </div>
        </form>
      )}

      <SectionCard title={`calendario · ${artist.content.length}`} action={
        !adding && <button onClick={() => setAdding(true)} className="adm-btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 11 }}>+ agregar</button>
      }>
        {artist.content.length === 0 ? (
          <p style={{ color: M, fontSize: 13, fontStyle: 'italic', margin: 0 }}>sin contenido planificado.</p>
        ) : (
          artist.content
            .sort((a, b) => (a.scheduled_date ?? 'z').localeCompare(b.scheduled_date ?? 'z'))
            .map(c => <ContentRow key={c.id} item={c} artistId={artist.id} />)
        )}
      </SectionCard>
    </div>
  )
}

// ── Tab: Ingresos ──────────────────────────────────────────────────────────────
function IngresosTab({ artist }: { artist: Artist }) {
  const [adding, setAdding] = useState(false)
  const [pending, start]    = useTransition()

  const externalTotal = artist.income.reduce((s, i) => s + i.amount_mxn, 0)
  const grandTotal    = externalTotal + artist.merch_total

  const CATEGORY_LABEL: Record<string, string> = {
    show: 'show', feature: 'feature', licensing: 'licensing',
    merch_externo: 'merch externo', sync: 'sync', otro: 'otro',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { label: 'merch (tienda)', value: artist.merch_total, color: '#003a87' },
          { label: 'ingresos externos', value: externalTotal, color: '#6b6a64' },
          { label: 'total', value: grandTotal, color: '#0a0a0a', bold: true },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: '#9a9994', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{fmt(s.value)}</div>
          </div>
        ))}
      </div>

      {/* Agregar ingreso */}
      {adding && (
        <form onSubmit={e => { e.preventDefault(); start(() => createExternalIncome(artist.id, new FormData(e.currentTarget)).then(() => setAdding(false))) }}
          style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="descripción"><input name="description" required className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} placeholder="show en el Foro" /></Field>
            <Field label="monto (MXN)"><input name="amount" type="number" min="0.01" step="0.01" required className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} placeholder="5000" /></Field>
            <Field label="fecha"><input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} /></Field>
            <Field label="categoría">
              <select name="category" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }}>
                {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="notas (opcional)"><input name="notes" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setAdding(false)} className="adm-btn-secondary" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>cancelar</button>
            <button type="submit" disabled={pending} className="adm-btn-primary" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>registrar ingreso</button>
          </div>
        </form>
      )}

      {/* Lista ingresos externos */}
      <SectionCard title="ingresos externos" action={
        !adding && <button onClick={() => setAdding(true)} className="adm-btn-primary" style={{ height: 28, padding: '0 12px', fontSize: 11 }}>+ registrar</button>
      }>
        {artist.income.length === 0 ? (
          <p style={{ color: M, fontSize: 13, fontStyle: 'italic', margin: 0 }}>sin ingresos registrados.</p>
        ) : (
          [...artist.income].sort((a, b) => b.date.localeCompare(a.date)).map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${B}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>{item.description}</div>
                <div style={{ fontSize: 11, color: M }}>{new Date(item.date + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })} · {CATEGORY_LABEL[item.category]}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#0a0a0a' }}>{fmt(item.amount_mxn)}</div>
              <TrashBtn onClick={() => start(() => deleteExternalIncome(item.id, artist.id))} disabled={pending} />
            </div>
          ))
        )}
      </SectionCard>
    </div>
  )
}

// ── Tab: Resumen ───────────────────────────────────────────────────────────────
function ResumenTab({ artist, onGoTo }: { artist: Artist; onGoTo: (tab: TabKey) => void }) {
  const now = new Date()

  const upcoming = [...artist.shows]
    .filter(s => new Date(s.date) >= now)
    .sort((a, b) => a.date.localeCompare(b.date))
  const nextShow  = upcoming[0]
  const daysUntil = nextShow
    ? Math.ceil((new Date(nextShow.date).getTime() - now.getTime()) / 86400000)
    : null

  const tasksDone  = artist.tasks.filter(t => t.status === 'listo').length
  const openTasks  = artist.tasks
    .filter(t => t.status !== 'listo')
    .sort((a, b) => {
      const p: Record<string, number> = { alta: 0, normal: 1, baja: 2 }
      return (p[a.priority] ?? 1) - (p[b.priority] ?? 1)
    })

  const inNext30 = artist.content
    .filter(c => {
      if (!c.scheduled_date) return false
      const diff = (new Date(c.scheduled_date + 'T12:00:00').getTime() - now.getTime()) / 86400000
      return diff >= -1 && diff <= 30
    })
    .sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''))

  const externalTotal = artist.income.reduce((s, i) => s + i.amount_mxn, 0)
  const totalRevenue  = externalTotal + artist.merch_total
  const published     = artist.content.filter(c => c.status === 'publicado').length

  const kpis = [
    {
      label: 'ingresos totales',
      value: fmt(totalRevenue),
      sub: `merch gallo: ${fmt(artist.merch_total)}`,
      color: '#0a0a0a',
      tab: 'ingresos' as TabKey,
    },
    {
      label: 'shows próximos',
      value: String(upcoming.length),
      sub: nextShow
        ? `próximo: ${new Date(nextShow.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}`
        : 'sin shows agendados',
      color: '#003a87',
      tab: 'shows' as TabKey,
    },
    {
      label: 'tareas',
      value: `${tasksDone} / ${artist.tasks.length}`,
      sub: openTasks.length === 0 ? 'todo al corriente' : `${openTasks.length} pendiente${openTasks.length > 1 ? 's' : ''}`,
      color: openTasks.filter(t => t.priority === 'alta').length > 0 ? '#cc0000' : '#1a6b35',
      tab: 'tareas' as TabKey,
    },
    {
      label: 'contenido · 30 días',
      value: String(inNext30.length),
      sub: `${published} publicado${published !== 1 ? 's' : ''} en total`,
      color: '#6b6a64',
      tab: 'contenido' as TabKey,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {kpis.map(k => (
          <button key={k.label} onClick={() => onGoTo(k.tab)} style={{
            background: '#fff', border: `1px solid ${B}`, borderRadius: 8,
            padding: '18px 20px', textAlign: 'left', cursor: 'pointer',
            transition: 'border-color 140ms', fontFamily: 'var(--font-sans)',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#0a0a0a')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = B)}
          >
            <div style={{ fontSize: 11, color: S, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, fontFamily: 'monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: M, marginTop: 6 }}>{k.sub}</div>
          </button>
        ))}
      </div>

      {/* Próximo show */}
      {nextShow && (
        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: S, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 4 }}>próximo show</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#003a87', fontFamily: 'monospace', lineHeight: 1 }}>{daysUntil}</div>
            <div style={{ fontSize: 11, color: M }}>día{daysUntil !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ width: 1, height: 56, background: B, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.01em' }}>{nextShow.venue}</div>
            <div style={{ fontSize: 13, color: M, marginTop: 3 }}>
              {nextShow.city} · {new Date(nextShow.date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            {nextShow.price_mxn && (
              <div style={{ fontSize: 12, color: M, marginTop: 3 }}>
                {fmt(nextShow.price_mxn)}{nextShow.capacity ? ` · aforo ${nextShow.capacity.toLocaleString('es-MX')}` : ''}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {nextShow.ticket_url && (
              <a href={nextShow.ticket_url} target="_blank" rel="noopener noreferrer" className="adm-btn-secondary"
                style={{ height: 34, padding: '0 16px', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                ver boletos →
              </a>
            )}
            <button onClick={() => onGoTo('shows')} className="adm-btn-secondary" style={{ height: 34, padding: '0 14px', fontSize: 12 }}>
              todos los shows
            </button>
          </div>
        </div>
      )}

      {/* Tareas + Calendario */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Tareas pendientes */}
        <SectionCard
          title={`tareas pendientes · ${openTasks.length}`}
          action={
            <button onClick={() => onGoTo('tareas')} style={{ fontSize: 11, color: M, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ver todas →
            </button>
          }
        >
          {openTasks.length === 0 ? (
            <p style={{ color: '#1a6b35', fontSize: 13, margin: 0, fontWeight: 600 }}>todo al corriente</p>
          ) : (
            <div>
              {openTasks.slice(0, 6).map(t => {
                const pc = PRIORITY_COLORS[t.priority]
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${B}` }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                      background: pc.bg, color: pc.text, textTransform: 'uppercase',
                      letterSpacing: '0.04em', flexShrink: 0,
                    }}>{t.priority}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </span>
                    {t.due_date && (
                      <span style={{ fontSize: 11, color: S, flexShrink: 0 }}>
                        {new Date(t.due_date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                )
              })}
              {openTasks.length > 6 && (
                <button onClick={() => onGoTo('tareas')} style={{ fontSize: 12, color: M, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 0', display: 'block' }}>
                  +{openTasks.length - 6} más →
                </button>
              )}
            </div>
          )}
        </SectionCard>

        {/* Calendario próximos 30 días */}
        <SectionCard
          title="calendario · próximos 30 días"
          action={
            <button onClick={() => onGoTo('contenido')} style={{ fontSize: 11, color: M, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              gestionar →
            </button>
          }
        >
          {inNext30.length === 0 ? (
            <p style={{ color: M, fontSize: 13, fontStyle: 'italic', margin: 0 }}>sin contenido programado.</p>
          ) : (
            <div>
              {inNext30.map(c => {
                const pc = PLATFORM_COLORS[c.platform]
                const sc = STATUS_CONTENT[c.status]
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${B}` }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: pc, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: M }}>{c.platform} · {c.content_type}</div>
                    </div>
                    {c.scheduled_date && (
                      <span style={{ fontSize: 11, color: S, flexShrink: 0 }}>
                        {new Date(c.scheduled_date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                      background: sc.bg, color: sc.text, textTransform: 'uppercase',
                      letterSpacing: '0.04em', flexShrink: 0,
                    }}>{c.status.replace('_', ' ')}</span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Shows próximos completo (si hay más de 1) */}
      {upcoming.length > 1 && (
        <SectionCard title={`todos los shows próximos · ${upcoming.length}`} action={
          <button onClick={() => onGoTo('shows')} style={{ fontSize: 11, color: M, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>editar →</button>
        }>
          {upcoming.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: `1px solid ${B}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>{s.venue}</div>
                <div style={{ fontSize: 12, color: M }}>{s.city}</div>
              </div>
              <div style={{ fontSize: 13, color: M }}>
                {new Date(s.date).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              {s.price_mxn && <div style={{ fontSize: 13, fontFamily: 'monospace', color: M }}>{fmt(s.price_mxn)}</div>}
              {s.capacity && <div style={{ fontSize: 12, color: S }}>{s.capacity.toLocaleString('es-MX')} lugares</div>}
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  )
}

// ── Main: ArtistDetail ─────────────────────────────────────────────────────────
const ALL_TABS = [
  { key: 'resumen',    label: 'resumen',    adminOnly: false },
  { key: 'perfil',     label: 'perfil',     adminOnly: false },
  { key: 'shows',      label: 'shows',      adminOnly: false },
  { key: 'tareas',     label: 'tareas',     adminOnly: false },
  { key: 'contenido',  label: 'contenido',  adminOnly: false },
  { key: 'ingresos',   label: 'ingresos',   adminOnly: true  },
] as const

type TabKey = typeof ALL_TABS[number]['key']

export default function ArtistDetail({ artist, isAdmin = true }: { artist: Artist; isAdmin?: boolean }) {
  const TABS = ALL_TABS.filter(t => !t.adminOnly || isAdmin)
  const [tab, setTab] = useState<TabKey>('resumen')

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        {artist.image_url ? (
          <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', background: artist.bg_color, flexShrink: 0 }}>
            <img src={artist.image_url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: 8, background: artist.bg_color, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: 8 }}>
            <div style={{ width: 20, height: 3, background: artist.stripe_color, borderRadius: 2 }} />
          </div>
        )}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: '#0a0a0a', textTransform: 'lowercase', marginBottom: 4 }}>
            {artist.name}
          </h1>
          <div style={{ fontSize: 12, color: M, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {artist.city  && <span>{artist.city}</span>}
            {artist.genre && <span>{artist.genre}</span>}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: artist.is_published ? 'rgba(26,107,53,0.08)' : '#f0efe9',
              color: artist.is_published ? '#1a6b35' : '#6b6a64',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {artist.is_published ? 'publicado' : 'borrador'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: `2px solid ${B}` }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none',
              cursor: 'pointer', color: tab === t.key ? '#0a0a0a' : M,
              borderBottom: `2px solid ${tab === t.key ? '#0a0a0a' : 'transparent'}`,
              marginBottom: -2, transition: 'color 150ms',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {tab === 'resumen'   && <ResumenTab   artist={artist} onGoTo={setTab} />}
      {tab === 'perfil'    && <PerfilTab    artist={artist} isAdmin={isAdmin} />}
      {tab === 'shows'     && <ShowsTab     artist={artist} />}
      {tab === 'tareas'    && <TareasTab    artist={artist} />}
      {tab === 'contenido' && <ContenidoTab artist={artist} />}
      {tab === 'ingresos'  && <IngresosTab  artist={artist} />}
    </div>
  )
}
