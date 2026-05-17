'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
  updateBlock, updateBlockSpacing, toggleBlockVisible, moveBlock, deleteBlock,
  addBlock, getBlockUploadUrl, publishPage, saveSiteSettings,
} from './actions'
import {
  addCategory, updateCategory, deleteCategory, reorderCategory,
} from '@/app/casa/tienda/configuracion/actions'
import {
  BLOCK_META, BLOCK_FIELDS, type Block, type BlockType,
  type NavSettings, type FooterSettings, type NavLink, type FooterLink,
} from '@/lib/blocks'

type Category = { id: string; name: string }

const B = '#e8e7e1', M = '#6b6a64', S = '#9a9994'

const PAGES = [
  { key: 'home',     label: 'inicio',   path: '/' },
  { key: 'artistas', label: 'artistas', path: '/artistas' },
  { key: 'tienda',   label: 'tienda',   path: '/tienda' },
]

const DEVICES = [
  { key: 'mobile',   label: 'móvil',      width: 390 },
  { key: 'tablet',   label: 'tablet',     width: 768 },
  { key: 'desktop',  label: 'escritorio', width: '100%' as const },
]

const SPACING_OPTS = [
  { label: '─', val: 0 },
  { label: 'S',  val: 24 },
  { label: 'M',  val: 48 },
  { label: 'L',  val: 96 },
  { label: 'XL', val: 192 },
]

type ViewMode = 'blocks' | 'header' | 'footer'

// ── Image field ────────────────────────────────────────────────────────────────
function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const { signedUrl, publicUrl } = await getBlockUploadUrl(file.name)
      await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      onChange(publicUrl)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="URL de imagen o sube una"
          className="adm-inp" style={{ flex: 1, height: 34, fontSize: 12 }} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="adm-btn-secondary" style={{ height: 34, padding: '0 12px', fontSize: 12, flexShrink: 0 }}>
          {uploading ? '…' : 'subir'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {value && <img src={value} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6, border: `1px solid ${B}` }} />}
    </div>
  )
}

// ── Add block modal ────────────────────────────────────────────────────────────
function AddBlockModal({ pageKey, onClose, onAdded }: { pageKey: string; onClose: () => void; onAdded: () => void }) {
  const [pending, start] = useTransition()
  const available = Object.entries(BLOCK_META).filter(([, m]) =>
    m.pages.includes('*') || m.pages.includes(pageKey)
  )
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px -16px rgba(10,10,10,0.3)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${B}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>agregar bloque</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: M, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
          {available.map(([type, meta]) => (
            <button key={type} disabled={pending}
              onClick={() => start(async () => { await addBlock(pageKey, type as BlockType); onAdded(); onClose() })}
              style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 16px', background: '#f6f5f1', border: `1px solid ${B}`, borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{meta.label}</div>
              <div style={{ fontSize: 12, color: M }}>{meta.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Categories panel (only for product-grid blocks) ───────────────────────────
function CategoriesPanel({ categories, onRefreshPreview }: { categories: Category[]; onRefreshPreview: () => void }) {
  const [items, setItems]     = useState<Category[]>(categories)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pending, start]      = useTransition()

  function refresh() { onRefreshPreview() }

  function add() {
    if (!newName.trim()) return
    const name = newName.trim().toLowerCase().replace(/\s+/g, '-')
    const optimistic = { id: `_tmp_${Date.now()}`, name }
    setItems(prev => [...prev, optimistic])
    setNewName('')
    start(async () => {
      await addCategory(name)
      refresh()
    })
  }

  function update(id: string) {
    const name = editingName.trim().toLowerCase().replace(/\s+/g, '-')
    setItems(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    setEditingId(null)
    start(async () => { await updateCategory(id, name); refresh() })
  }

  function remove(id: string) {
    setItems(prev => prev.filter(c => c.id !== id))
    start(async () => { await deleteCategory(id); refresh() })
  }

  function move(id: string, dir: 'up' | 'down') {
    setItems(prev => {
      const idx = prev.findIndex(c => c.id === id)
      const swap = dir === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
    start(async () => { await reorderCategory(id, dir); refresh() })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          categorías
        </label>
        <span style={{ fontSize: 10, color: M }}>también en /configuracion</span>
      </div>

      <div style={{ border: `1px solid ${B}`, borderRadius: 6, overflow: 'hidden' }}>
        {items.length === 0 && (
          <div style={{ padding: '10px 12px', fontSize: 12, color: M, fontStyle: 'italic' }}>sin categorías</div>
        )}
        {items.map((cat, i) => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderBottom: i < items.length - 1 ? `1px solid ${B}` : 'none', background: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
              <button disabled={i === 0 || pending} onClick={() => move(cat.id, 'up')} className="adm-btn-icon" style={{ height: 14, width: 18, fontSize: 9, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
              <button disabled={i === items.length - 1 || pending} onClick={() => move(cat.id, 'down')} className="adm-btn-icon" style={{ height: 14, width: 18, fontSize: 9, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
            </div>
            {editingId === cat.id ? (
              <>
                <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') update(cat.id); if (e.key === 'Escape') setEditingId(null) }}
                  className="adm-inp" style={{ flex: 1, height: 26, fontSize: 12 }} />
                <button onClick={() => update(cat.id)} className="adm-btn-secondary" style={{ height: 26, fontSize: 11, padding: '0 8px' }}>ok</button>
                <button onClick={() => setEditingId(null)} className="adm-btn-icon" style={{ height: 26, width: 24, fontSize: 12, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13, color: '#0a0a0a' }}>{cat.name}</span>
                <button onClick={() => { setEditingId(cat.id); setEditingName(cat.name) }} className="adm-btn-icon" style={{ height: 24, width: 24, fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
                <button onClick={() => remove(cat.id)} className="adm-btn-icon" style={{ height: 24, width: 24, fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cc0000' }}>✕</button>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="nueva categoría" className="adm-inp" style={{ flex: 1, height: 30, fontSize: 12 }} />
        <button disabled={!newName.trim() || pending} onClick={add}
          className="adm-btn-primary" style={{ height: 30, padding: '0 12px', fontSize: 12 }}>
          agregar
        </button>
      </div>
    </div>
  )
}

// ── Block edit panel ───────────────────────────────────────────────────────────
function BlockEditPanel({
  block, pageKey, onSaved, onLocalChange, onSpacingChanged, onRefreshPreview, categories,
}: {
  block: Block
  pageKey: string
  onSaved: (newContent: Record<string, string>) => void
  onLocalChange: (newContent: Record<string, string>) => void
  onSpacingChanged: (id: string, spacing: number) => void
  onRefreshPreview: () => void
  categories: Category[]
}) {
  const [values, setValues] = useState<Record<string, string>>(block.draft_content ?? block.content)
  const [, start] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const fields = BLOCK_FIELDS[block.type] ?? []

  useEffect(() => { setValues(block.draft_content ?? block.content) }, [block.id])

  function set(key: string, val: string) {
    const next = { ...values, [key]: val }
    setValues(next)
    onLocalChange(next)
    clearTimeout(debounceRef.current)
    setStatus('saving')
    debounceRef.current = setTimeout(() => {
      start(async () => {
        await updateBlock(block.id, pageKey, next)
        setStatus('saved')
        onSaved(next)
        setTimeout(() => setStatus('idle'), 2000)
      })
    }, 600)
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Spacing */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          espaciado inferior
        </label>
        <div style={{ display: 'flex', gap: 4 }}>
          {SPACING_OPTS.map(opt => (
            <button key={opt.val} onClick={() => onSpacingChanged(block.id, opt.val)}
              style={{
                height: 28, padding: '0 8px', fontSize: 11, fontWeight: 700,
                background: (block.spacing_bottom ?? 0) === opt.val ? '#003a87' : '#f6f5f1',
                color: (block.spacing_bottom ?? 0) === opt.val ? '#fff' : M,
                border: `1px solid ${(block.spacing_bottom ?? 0) === opt.val ? '#003a87' : B}`,
                borderRadius: 4, cursor: 'pointer',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {fields.length > 0 && <div style={{ borderTop: `1px solid ${B}` }} />}

      {/* Status */}
      {fields.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 16 }}>
          {status === 'saving' && (
            <><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffe200', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 11, color: '#7a6600' }}>guardando...</span></>
          )}
          {status === 'saved' && (
            <><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a6b35' }} />
            <span style={{ fontSize: 11, color: '#1a6b35' }}>borrador guardado</span></>
          )}
        </div>
      )}

      {block.type === 'product-grid' && (
        <>
          <div style={{ borderTop: `1px solid ${B}` }} />
          <CategoriesPanel categories={categories} onRefreshPreview={onRefreshPreview} />
        </>
      )}

      {fields.length === 0 && block.type !== 'product-grid' && (
        <div style={{ fontSize: 13, color: M, fontStyle: 'italic' }}>
          Este bloque no tiene campos editables — su contenido viene de la base de datos.
        </div>
      )}

      {fields.map(f => (
        <div key={f.key}>
          <label style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
            {f.label}
          </label>
          {f.type === 'image' ? (
            <ImageField value={values[f.key] ?? ''} onChange={v => set(f.key, v)} />
          ) : f.type === 'color' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={values[f.key] ?? '#000000'} onChange={e => set(f.key, e.target.value)}
                style={{ width: 36, height: 36, border: `1px solid ${B}`, borderRadius: 6, padding: 2, cursor: 'pointer' }} />
              <input value={values[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                className="adm-inp" style={{ width: 100, height: 36, fontFamily: 'monospace', fontSize: 12 }} />
            </div>
          ) : f.type === 'textarea' ? (
            <textarea value={values[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
              rows={3} className="adm-inp" style={{ width: '100%', resize: 'vertical', fontSize: 13 }} />
          ) : (
            <input value={values[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
              className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Block row ──────────────────────────────────────────────────────────────────
function BlockRow({ block, pageKey, index, total, onEdit, isEditing, onSaved, onLocalChange, onVisibilityToggled, onMoved, onDeleted, onSpacingChanged, onRefreshPreview, categories }:
  {
    block: Block; pageKey: string; index: number; total: number
    onEdit: () => void; isEditing: boolean
    onSaved: (newContent: Record<string, string>) => void
    onLocalChange: (newContent: Record<string, string>) => void
    onVisibilityToggled: (id: string, visible: boolean) => void
    onMoved: (id: string, dir: -1 | 1) => void
    onDeleted: (id: string) => void
    onSpacingChanged: (id: string, spacing: number) => void
    onRefreshPreview: () => void
    categories: Category[]
  }) {
  const [pending, start] = useTransition()
  const meta = BLOCK_META[block.type]

  function runToggle() {
    const next = !block.visible
    onVisibilityToggled(block.id, next)
    start(() => toggleBlockVisible(block.id, pageKey, next))
  }
  function runMove(dir: -1 | 1) {
    onMoved(block.id, dir)
    start(() => moveBlock(block.id, pageKey, dir))
  }
  function runDelete() {
    if (!confirm('¿Eliminar este bloque?')) return
    onDeleted(block.id)
    start(() => deleteBlock(block.id, pageKey))
  }

  return (
    <div style={{ border: `1px solid ${isEditing ? '#003a87' : B}`, borderRadius: 8, overflow: 'hidden', background: '#fff', boxShadow: isEditing ? '0 0 0 2px rgba(0,58,135,0.12)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f6f5f1', cursor: 'pointer' }} onClick={onEdit}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{meta?.label ?? block.type}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); runToggle() }}
          disabled={pending} title={block.visible ? 'Ocultar' : 'Mostrar'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: block.visible ? 1 : 0.35, padding: '2px 4px', lineHeight: 1 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {block.visible
              ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
              : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
            }
          </svg>
        </button>
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={e => { e.stopPropagation(); runMove(-1) }}
            disabled={pending || index === 0} className="adm-btn-icon"
            style={{ height: 24, width: 24, fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
          <button onClick={e => { e.stopPropagation(); runMove(1) }}
            disabled={pending || index === total - 1} className="adm-btn-icon"
            style={{ height: 24, width: 24, fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
        </div>
        <button onClick={e => { e.stopPropagation(); runDelete() }}
          disabled={pending} className="adm-btn-icon"
          style={{ height: 24, width: 24, fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cc0000' }}>✕</button>
        <span style={{ fontSize: 11, color: M, transition: 'transform 150ms', transform: isEditing ? 'rotate(180deg)' : 'none', userSelect: 'none' }}>▼</span>
      </div>
      {isEditing && (
        <BlockEditPanel
          block={block}
          pageKey={pageKey}
          onSaved={onSaved}
          onLocalChange={onLocalChange}
          onSpacingChanged={onSpacingChanged}
          onRefreshPreview={onRefreshPreview}
          categories={categories}
        />
      )}
    </div>
  )
}

// ── Link list editor (shared between nav and footer extra links) ────────────────
function LinkListEditor({ links, onChange }: { links: (NavLink | FooterLink)[]; onChange: (links: (NavLink | FooterLink)[]) => void }) {
  function update(i: number, field: 'label' | 'href', val: string) {
    const next = links.map((l, idx) => idx === i ? { ...l, [field]: val } : l)
    onChange(next)
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...links]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    onChange(next)
  }
  function remove(i: number) { onChange(links.filter((_, idx) => idx !== i)) }
  function add() { onChange([...links, { label: '', href: '' }]) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {links.map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input value={l.label} onChange={e => update(i, 'label', e.target.value)}
            placeholder="nombre" className="adm-inp" style={{ flex: 1, height: 30, fontSize: 12 }} />
          <input value={l.href} onChange={e => update(i, 'href', e.target.value)}
            placeholder="/ruta" className="adm-inp" style={{ flex: 1.5, height: 30, fontSize: 12 }} />
          <button onClick={() => move(i, -1)} disabled={i === 0} className="adm-btn-icon"
            style={{ height: 24, width: 20, fontSize: 10, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
          <button onClick={() => move(i, 1)} disabled={i === links.length - 1} className="adm-btn-icon"
            style={{ height: 24, width: 20, fontSize: 10, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↓</button>
          <button onClick={() => remove(i)} className="adm-btn-icon"
            style={{ height: 24, width: 20, fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cc0000', flexShrink: 0 }}>✕</button>
        </div>
      ))}
      <button onClick={add} className="adm-btn-secondary"
        style={{ height: 30, fontSize: 11, marginTop: 2 }}>+ agregar link</button>
    </div>
  )
}

// ── Globals panels ─────────────────────────────────────────────────────────────
function NavPanel({ settings, onRefreshPreview }: { settings: NavSettings; onRefreshPreview: () => void }) {
  const [links, setLinks] = useState<NavLink[]>(settings.links)
  const [saving, startSave] = useTransition()
  const [saved, setSaved] = useState(false)

  function save() {
    startSave(async () => {
      await saveSiteSettings('nav', { links })
      setSaved(true)
      onRefreshPreview()
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', marginBottom: 4 }}>links de navegación</div>
        <div style={{ fontSize: 11, color: M }}>cambios van directo a live al guardar</div>
      </div>
      <LinkListEditor links={links} onChange={setLinks as (l: (NavLink | FooterLink)[]) => void} />
      <button onClick={save} disabled={saving} className="adm-btn-primary" style={{ height: 36, fontSize: 12, marginTop: 4 }}>
        {saving ? 'guardando…' : 'guardar y publicar'}
      </button>
      {saved && <span style={{ fontSize: 11, color: '#1a6b35', textAlign: 'center' }}>guardado ✓ — nav actualizada en live</span>}
    </div>
  )
}

function FooterPanel({ settings, onRefreshPreview }: { settings: FooterSettings; onRefreshPreview: () => void }) {
  const [email, setEmail]       = useState(settings.email)
  const [copyright, setCopyright] = useState(settings.copyright)
  const [links, setLinks]       = useState<FooterLink[]>(settings.links)
  const [saving, startSave]     = useTransition()
  const [saved, setSaved]       = useState(false)

  function save() {
    startSave(async () => {
      await saveSiteSettings('footer', { email, copyright, links })
      setSaved(true)
      onRefreshPreview()
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', marginBottom: 4 }}>pie de página</div>
        <div style={{ fontSize: 11, color: M }}>cambios van directo a live al guardar</div>
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>email de contacto</label>
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="info@ejemplo.com" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} />
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>copyright</label>
        <input value={copyright} onChange={e => setCopyright(e.target.value)}
          placeholder="© 2026 tu empresa" className="adm-inp" style={{ width: '100%', height: 34, fontSize: 13 }} />
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>links adicionales</label>
        <LinkListEditor links={links} onChange={setLinks as (l: (NavLink | FooterLink)[]) => void} />
      </div>

      <button onClick={save} disabled={saving} className="adm-btn-primary" style={{ height: 36, fontSize: 12 }}>
        {saving ? 'guardando…' : 'guardar y publicar'}
      </button>
      {saved && <span style={{ fontSize: 11, color: '#1a6b35', textAlign: 'center' }}>guardado ✓ — footer actualizado en live</span>}
    </div>
  )
}

// ── Main shell ─────────────────────────────────────────────────────────────────
export default function EditorShell({
  initialBlocks, navSettings, footerSettings, initialCategories,
}: {
  initialBlocks: Block[]
  navSettings: NavSettings
  footerSettings: FooterSettings
  initialCategories: Category[]
}) {
  const [blocks, setBlocks]         = useState(initialBlocks)
  const [categories]                = useState(initialCategories)
  const [pageKey, setPageKey]       = useState('home')
  const [device, setDevice]         = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [viewMode, setViewMode]     = useState<ViewMode>('blocks')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [hasDraft, setHasDraft]     = useState(() => initialBlocks.some(b => b.draft_content !== null))
  const [publishing, startPublish]  = useTransition()
  const [, startSpacing]            = useTransition()
  const iframeRef                   = useRef<HTMLIFrameElement>(null)
  const previewTimerRef             = useRef<ReturnType<typeof setTimeout>>(undefined)

  const page    = PAGES.find(p => p.key === pageKey)!
  const devConf = DEVICES.find(d => d.key === device)!
  const visible = blocks.filter(b => b.page_key === pageKey)

  function refreshPreview(delay = 400) {
    clearTimeout(previewTimerRef.current)
    setPreviewLoading(true)
    previewTimerRef.current = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.location.reload()
      } else {
        const iframe = iframeRef.current
        if (iframe) { iframe.src = iframe.src }
      }
      setTimeout(() => setPreviewLoading(false), 800)
    }, delay)
  }

  useEffect(() => {
    if (iframeRef.current) iframeRef.current.src = page.path
  }, [pageKey])

  function handleBlockSaved(blockId: string, newContent: Record<string, string>) {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, draft_content: newContent } : b))
    setHasDraft(true)
    refreshPreview()
  }

  function handleVisibilityToggled(id: string, vis: boolean) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: vis } : b))
    refreshPreview(600)
  }

  function handleMoved(id: string, dir: -1 | 1) {
    setBlocks(prev => {
      const pg   = prev.filter(b => b.page_key === pageKey)
      const rest = prev.filter(b => b.page_key !== pageKey)
      const idx  = pg.findIndex(b => b.id === id)
      const swap = idx + dir
      if (swap < 0 || swap >= pg.length) return prev
      const next = [...pg]
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return [...rest, ...next]
    })
    refreshPreview(600)
  }

  function handleDeleted(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id))
    refreshPreview(600)
  }

  function handleSpacingChanged(id: string, spacing_bottom: number) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, spacing_bottom } : b))
    startSpacing(() => updateBlockSpacing(id, spacing_bottom))
    refreshPreview(300)
  }

  function handlePublish() {
    startPublish(async () => {
      await publishPage(pageKey)
      setBlocks(prev => prev.map(b => b.page_key === pageKey ? { ...b, draft_content: null } : b))
      setHasDraft(false)
      refreshPreview(600)
    })
  }

  // ── Sidebar button helper ────────────────────────────────────────────────────
  function SideBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button onClick={onClick} style={{
        padding: '9px 16px', background: active ? 'rgba(255,255,255,0.08)' : 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: 600,
        color: active ? '#fff' : 'rgba(255,255,255,0.45)',
        borderLeft: `2px solid ${active ? '#00c4df' : 'transparent'}`,
        transition: 'all 120ms',
      }}>
        {children}
      </button>
    )
  }

  // ── Right panel header helper ────────────────────────────────────────────────
  const rightTitle = viewMode === 'header' ? 'cabecera' : viewMode === 'footer' ? 'pie de página' : `bloques · ${page.label}`

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── Left sidebar ───────────────────────────────────────────────────── */}
      <div style={{ width: 160, background: '#0a0a0a', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        <div style={{ padding: '14px 16px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>páginas</div>
        {PAGES.map(p => (
          <SideBtn key={p.key} active={viewMode === 'blocks' && pageKey === p.key}
            onClick={() => { setPageKey(p.key); setViewMode('blocks'); setEditingId(null) }}>
            {p.label}
          </SideBtn>
        ))}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />

        <div style={{ padding: '6px 16px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>dispositivo</div>
        {DEVICES.map(d => (
          <SideBtn key={d.key} active={device === d.key} onClick={() => setDevice(d.key as typeof device)}>
            {d.label}
          </SideBtn>
        ))}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />

        <div style={{ padding: '6px 16px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>globales</div>
        <SideBtn active={viewMode === 'header'} onClick={() => { setViewMode('header'); setEditingId(null) }}>
          cabecera
        </SideBtn>
        <SideBtn active={viewMode === 'footer'} onClick={() => { setViewMode('footer'); setEditingId(null) }}>
          pie de página
        </SideBtn>
      </div>

      {/* ── Center: iframe preview ──────────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#1e1e1c', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto', padding: '16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, background: 'rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: 8, minWidth: 220 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: previewLoading ? '#ffe200' : '#1a6b35', transition: 'background 200ms', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', flex: 1 }}>{page.path}</span>
          <button onClick={() => refreshPreview(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
            title="Actualizar preview">↻</button>
        </div>

        <div style={{
          width: devConf.width === '100%' ? 'calc(100% - 32px)' : devConf.width,
          background: '#fff', borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          transition: 'width 300ms ease',
          flexShrink: 0, position: 'relative',
        }}>
          {previewLoading && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, #003a87, #00c4df, #ffe200)',
              animation: 'slideIn 1s ease-in-out', zIndex: 10,
            }} />
          )}
          <iframe ref={iframeRef} src={page.path} style={{
            width: '100%',
            height: device === 'mobile' ? 844 : device === 'tablet' ? 1024 : 800,
            border: 'none', display: 'block',
            opacity: previewLoading ? 0.6 : 1, transition: 'opacity 200ms',
          }} />
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div style={{ width: 300, background: '#fff', borderLeft: `1px solid ${B}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${B}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{rightTitle}</span>
            {viewMode === 'blocks' && hasDraft && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#ffe200', color: '#5a4800', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em', flexShrink: 0 }}>
                BORRADOR
              </span>
            )}
          </div>
          {viewMode === 'blocks' && (
            <button onClick={handlePublish} disabled={!hasDraft || publishing}
              style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 700,
                background: hasDraft ? '#003a87' : '#e8e7e1',
                color: hasDraft ? '#fff' : '#9a9994',
                border: 'none', borderRadius: 6,
                cursor: hasDraft ? 'pointer' : 'default', transition: 'all 150ms', flexShrink: 0,
              }}>
              {publishing ? 'publicando…' : 'publicar'}
            </button>
          )}
        </div>

        {/* Body */}
        {viewMode === 'blocks' ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visible.length === 0 && (
                <div style={{ fontSize: 13, color: S, fontStyle: 'italic', textAlign: 'center', paddingTop: 32 }}>
                  esta página no tiene bloques todavía.
                </div>
              )}
              {visible.map((b, i) => (
                <BlockRow
                  key={b.id} block={b} pageKey={pageKey} index={i} total={visible.length}
                  isEditing={editingId === b.id}
                  onEdit={() => setEditingId(editingId === b.id ? null : b.id)}
                  onSaved={(newContent) => handleBlockSaved(b.id, newContent)}
                  onLocalChange={(newContent) => setBlocks(prev => prev.map(x => x.id === b.id ? { ...x, content: newContent } : x))}
                  onVisibilityToggled={handleVisibilityToggled}
                  onMoved={handleMoved}
                  onDeleted={handleDeleted}
                  onSpacingChanged={handleSpacingChanged}
                  onRefreshPreview={() => refreshPreview(600)}
                  categories={categories}
                />
              ))}
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${B}` }}>
              <button onClick={() => setShowAddModal(true)} className="adm-btn-primary" style={{ width: '100%', height: 38, fontSize: 13 }}>
                + agregar bloque
              </button>
            </div>
          </>
        ) : viewMode === 'header' ? (
          <NavPanel settings={navSettings} onRefreshPreview={() => refreshPreview(800)} />
        ) : (
          <FooterPanel settings={footerSettings} onRefreshPreview={() => refreshPreview(800)} />
        )}
      </div>

      {showAddModal && (
        <AddBlockModal
          pageKey={pageKey}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { refreshPreview(800) }}
        />
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  )
}
