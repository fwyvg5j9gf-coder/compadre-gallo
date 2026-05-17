'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { updateBlock, toggleBlockVisible, moveBlock, deleteBlock, addBlock, getBlockUploadUrl } from './actions'
import { BLOCK_META, BLOCK_FIELDS, type Block, type BlockType } from '@/lib/blocks'

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

// ── Block edit panel — auto-save on change ─────────────────────────────────────
function BlockEditPanel({
  block, pageKey, onSaved, onLocalChange,
}: {
  block: Block
  pageKey: string
  onSaved: (newContent: Record<string, string>) => void
  onLocalChange: (newContent: Record<string, string>) => void
}) {
  const [values, setValues] = useState<Record<string, string>>(block.content)
  const [, start] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const fields = BLOCK_FIELDS[block.type] ?? []

  // Reset if block changes (navigating between blocks)
  useEffect(() => { setValues(block.content) }, [block.id])

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

  if (!fields.length) return (
    <div style={{ padding: 20, fontSize: 13, color: M, fontStyle: 'italic' }}>
      Este bloque no tiene campos editables — su contenido viene de la base de datos.
    </div>
  )

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 20 }}>
        {status === 'saving' && (
          <>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffe200', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 11, color: '#7a6600' }}>guardando...</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a6b35' }} />
            <span style={{ fontSize: 11, color: '#1a6b35' }}>guardado — preview actualizado</span>
          </>
        )}
      </div>

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
function BlockRow({ block, pageKey, index, total, onEdit, isEditing, onAction, onSaved, onLocalChange }:
  {
    block: Block; pageKey: string; index: number; total: number
    onEdit: () => void; isEditing: boolean
    onAction: () => void
    onSaved: (newContent: Record<string, string>) => void
    onLocalChange: (newContent: Record<string, string>) => void
  }) {
  const [pending, start] = useTransition()
  const meta = BLOCK_META[block.type]

  function run(fn: () => Promise<void>) {
    start(async () => { await fn(); onAction() })
  }

  return (
    <div style={{ border: `1px solid ${isEditing ? '#003a87' : B}`, borderRadius: 8, overflow: 'hidden', background: '#fff', boxShadow: isEditing ? '0 0 0 2px rgba(0,58,135,0.12)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f6f5f1', cursor: 'pointer' }} onClick={onEdit}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{meta?.label ?? block.type}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); run(() => toggleBlockVisible(block.id, pageKey, !block.visible)) }}
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
          <button onClick={e => { e.stopPropagation(); run(() => moveBlock(block.id, pageKey, -1)) }}
            disabled={pending || index === 0} className="adm-btn-icon"
            style={{ height: 24, width: 24, fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
          <button onClick={e => { e.stopPropagation(); run(() => moveBlock(block.id, pageKey, 1)) }}
            disabled={pending || index === total - 1} className="adm-btn-icon"
            style={{ height: 24, width: 24, fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
        </div>
        <button onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar este bloque?')) run(() => deleteBlock(block.id, pageKey)) }}
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
        />
      )}
    </div>
  )
}

// ── Main shell ─────────────────────────────────────────────────────────────────
export default function EditorShell({ initialBlocks }: { initialBlocks: Block[] }) {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [pageKey, setPageKey] = useState('home')
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

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
        // fallback: remount iframe
        const iframe = iframeRef.current
        if (iframe) { iframe.src = iframe.src }
      }
      setTimeout(() => setPreviewLoading(false), 800)
    }, delay)
  }

  // Reload iframe when page changes
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = page.path
    }
  }, [pageKey])

  function handleBlockSaved(blockId: string, newContent: Record<string, string>) {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: newContent } : b))
    refreshPreview()
  }

  function handleBlockAction() {
    refreshPreview(600)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div style={{ width: 160, background: '#0a0a0a', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '14px 16px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>páginas</div>
        {PAGES.map(p => (
          <button key={p.key} onClick={() => { setPageKey(p.key); setEditingId(null) }}
            style={{
              padding: '10px 16px', background: pageKey === p.key ? 'rgba(255,255,255,0.08)' : 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600,
              color: pageKey === p.key ? '#fff' : 'rgba(255,255,255,0.45)',
              borderLeft: `2px solid ${pageKey === p.key ? '#003a87' : 'transparent'}`,
              transition: 'all 120ms',
            }}>
            {p.label}
          </button>
        ))}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />

        <div style={{ padding: '6px 16px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>dispositivo</div>
        {DEVICES.map(d => (
          <button key={d.key} onClick={() => setDevice(d.key as typeof device)}
            style={{
              padding: '8px 16px', background: device === d.key ? 'rgba(255,255,255,0.08)' : 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12,
              color: device === d.key ? '#fff' : 'rgba(255,255,255,0.4)',
              transition: 'all 120ms',
            }}>
            {d.label}
          </button>
        ))}
      </div>

      {/* ── Center: iframe preview ────────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#1e1e1c', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto', padding: '16px 0' }}>
        {/* address bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, background: 'rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: 8, minWidth: 220 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: previewLoading ? '#ffe200' : '#1a6b35', transition: 'background 200ms', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', flex: 1 }}>{page.path}</span>
          <button onClick={() => refreshPreview(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
            title="Actualizar preview">↻</button>
        </div>

        {/* iframe container */}
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
              animation: 'slideIn 1s ease-in-out',
              zIndex: 10,
            }} />
          )}
          <iframe
            ref={iframeRef}
            src={page.path}
            style={{
              width: '100%',
              height: device === 'mobile' ? 844 : device === 'tablet' ? 1024 : 800,
              border: 'none', display: 'block',
              opacity: previewLoading ? 0.6 : 1,
              transition: 'opacity 200ms',
            }}
          />
        </div>
      </div>

      {/* ── Right: blocks panel ───────────────────────────────────────────── */}
      <div style={{ width: 300, background: '#fff', borderLeft: `1px solid ${B}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${B}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>bloques · {page.label}</span>
          <span style={{ fontSize: 11, color: S }}>{visible.length}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.length === 0 && (
            <div style={{ fontSize: 13, color: S, fontStyle: 'italic', textAlign: 'center', paddingTop: 32 }}>
              esta página no tiene bloques todavía.
            </div>
          )}
          {visible.map((b, i) => (
            <BlockRow
              key={b.id}
              block={b}
              pageKey={pageKey}
              index={i}
              total={visible.length}
              isEditing={editingId === b.id}
              onEdit={() => setEditingId(editingId === b.id ? null : b.id)}
              onAction={handleBlockAction}
              onSaved={(newContent) => handleBlockSaved(b.id, newContent)}
              onLocalChange={(newContent) => setBlocks(prev => prev.map(x => x.id === b.id ? { ...x, content: newContent } : x))}
            />
          ))}
        </div>

        <div style={{ padding: 12, borderTop: `1px solid ${B}` }}>
          <button onClick={() => setShowAddModal(true)} className="adm-btn-primary" style={{ width: '100%', height: 38, fontSize: 13 }}>
            + agregar bloque
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddBlockModal
          pageKey={pageKey}
          onClose={() => setShowAddModal(false)}
          onAdded={() => refreshPreview(800)}
        />
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
