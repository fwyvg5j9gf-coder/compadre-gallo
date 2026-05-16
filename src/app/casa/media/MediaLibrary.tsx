'use client'

import { useState, useRef, useTransition, useCallback } from 'react'
import { getUploadUrl, deleteMedia, type MediaFile } from './actions'

const FOLDERS = [
  { key: 'media/',    label: 'general' },
  { key: 'artists/',  label: 'artistas' },
  { key: 'products/', label: 'productos' },
  { key: 'pages/',    label: 'páginas' },
]

const B = '#e8e7e1', M = '#6b6a64', S = '#9a9994'

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function mime2type(mime: string): 'image' | 'video' | 'audio' | 'other' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'other'
}

// ── Thumbnail ──────────────────────────────────────────────────────────────────
function Thumb({ file, onClick }: { file: MediaFile; onClick: () => void }) {
  const type = mime2type(file.mimeType)
  return (
    <button
      onClick={onClick}
      title={file.name}
      style={{
        all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column',
        borderRadius: 6, overflow: 'hidden', border: `1px solid ${B}`,
        background: '#fff', transition: 'box-shadow 140ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,10,10,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ width: '100%', aspectRatio: '4/3', background: '#f6f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {type === 'image' ? (
          <img src={file.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : type === 'video' ? (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><polygon points="11,7 25,16 11,25" fill="#ff0100"/></svg>
        ) : type === 'audio' ? (
          <img src="/icons/color/music-note.svg" width={32} height={32} alt="" />
        ) : (
          <img src="/icons/color/box.svg" width={32} height={32} alt="" />
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
        <div style={{ fontSize: 10, color: S, marginTop: 2 }}>{fmtSize(file.size)}</div>
      </div>
    </button>
  )
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function DetailModal({ file, onClose, onDelete }: { file: MediaFile; onClose: () => void; onDelete: (path: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [deleting, startDelete] = useTransition()
  const type = mime2type(file.mimeType)

  function copyUrl() {
    navigator.clipboard.writeText(file.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar "${file.name}"? Esta acción no se puede deshacer.`)) return
    startDelete(async () => {
      await deleteMedia(file.path)
      onDelete(file.id)
      onClose()
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, boxShadow: '0 24px 64px -16px rgba(10,10,10,0.3)', overflow: 'hidden' }}>
        {/* Preview */}
        <div style={{ background: '#f6f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280, maxHeight: 360, overflow: 'hidden' }}>
          {type === 'image' ? (
            <img src={file.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }} />
          ) : type === 'video' ? (
            <video src={file.url} controls style={{ maxWidth: '100%', maxHeight: 360 }} />
          ) : type === 'audio' ? (
            <audio src={file.url} controls style={{ width: '80%' }} />
          ) : (
            <div style={{ fontSize: 48, color: S }}>📄</div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', marginBottom: 4, wordBreak: 'break-all' }}>{file.name}</div>
            <div style={{ fontSize: 12, color: M }}>{fmtSize(file.size)} · {file.mimeType}</div>
          </div>

          {/* URL */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              readOnly
              value={file.url}
              style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', padding: '6px 10px', background: '#f6f5f1', border: `1px solid ${B}`, borderRadius: 4, color: M, overflow: 'hidden', textOverflow: 'ellipsis' }}
              onFocus={e => e.target.select()}
            />
            <button
              onClick={copyUrl}
              className="adm-btn-primary"
              style={{ padding: '6px 14px', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {copied ? '✓ copiado' : 'copiar URL'}
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${B}` }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ fontSize: 13, color: '#cc0000', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {deleting ? 'eliminando…' : 'eliminar archivo'}
            </button>
            <button onClick={onClose} className="adm-btn" style={{ fontSize: 13 }}>cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Upload dropzone ───────────────────────────────────────────────────────────
function UploadZone({ folder, onUploaded }: { folder: string; onUploaded: (file: MediaFile) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)

  const uploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setProgress([])

    for (const file of Array.from(files)) {
      setProgress(p => [...p, `subiendo ${file.name}…`])
      try {
        const { signedUrl, publicUrl, path } = await getUploadUrl(file.name, folder)
        const res = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
        if (!res.ok) throw new Error('upload failed')
        onUploaded({
          id: path,
          name: file.name,
          path,
          url: publicUrl,
          size: file.size,
          mimeType: file.type,
          createdAt: new Date().toISOString(),
        })
        setProgress(p => p.map(l => l.startsWith(`subiendo ${file.name}`) ? `✓ ${file.name}` : l))
      } catch {
        setProgress(p => p.map(l => l.startsWith(`subiendo ${file.name}`) ? `✗ error: ${file.name}` : l))
      }
    }
    setUploading(false)
    setTimeout(() => setProgress([]), 3000)
  }, [folder, onUploaded])

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? '#003a87' : B}`,
        borderRadius: 8, padding: '32px 24px', textAlign: 'center',
        cursor: 'pointer', background: dragging ? 'rgba(0,58,135,0.04)' : '#fafaf8',
        transition: 'all 140ms',
      }}
    >
      <input ref={inputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.svg" style={{ display: 'none' }} onChange={e => uploadFiles(e.target.files)} />
      <img src="/icons/color/camera.svg" width={32} height={32} alt="" style={{ marginBottom: 8, opacity: uploading ? 0.4 : 1 }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', marginBottom: 4 }}>
        {uploading ? 'subiendo…' : 'arrastra archivos aquí'}
      </div>
      <div style={{ fontSize: 12, color: M }}>o haz click para seleccionar · imágenes, video, audio</div>
      {progress.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
          {progress.map((p, i) => (
            <div key={i} style={{ fontSize: 12, color: p.startsWith('✓') ? '#1a6b35' : p.startsWith('✗') ? '#cc0000' : M, fontFamily: 'monospace' }}>{p}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MediaLibrary({ initialFiles }: { initialFiles: MediaFile[] }) {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles)
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all')
  const [folder, setFolder] = useState('media/')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<MediaFile | null>(null)

  const filtered = files.filter(f => {
    if (filter !== 'all' && mime2type(f.mimeType) !== filter) return false
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleUploaded(file: MediaFile) {
    setFiles(prev => [file, ...prev])
  }

  function handleDeleted(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const counts = {
    all: files.length,
    image: files.filter(f => mime2type(f.mimeType) === 'image').length,
    video: files.filter(f => mime2type(f.mimeType) === 'video').length,
    audio: files.filter(f => mime2type(f.mimeType) === 'audio').length,
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 6, textTransform: 'lowercase' }}>
          biblioteca de medios
        </h1>
        <div style={{ fontSize: 13, color: M }}>{files.length} archivos en total</div>
      </div>

      {/* Upload */}
      <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: M, fontWeight: 600 }}>carpeta:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {FOLDERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFolder(f.key)}
                style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 999, border: `1px solid ${folder === f.key ? '#0a0a0a' : B}`,
                  background: folder === f.key ? '#0a0a0a' : '#fff', color: folder === f.key ? '#fff' : M,
                  cursor: 'pointer', fontWeight: folder === f.key ? 700 : 400, transition: 'all 120ms',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <UploadZone folder={folder} onUploaded={handleUploaded} />
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'image', 'video', 'audio'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                fontSize: 12, padding: '5px 14px', borderRadius: 999, border: `1px solid ${filter === t ? '#003a87' : B}`,
                background: filter === t ? 'rgba(0,58,135,0.08)' : '#fff', color: filter === t ? '#003a87' : M,
                cursor: 'pointer', fontWeight: filter === t ? 700 : 400, transition: 'all 120ms',
              }}
            >
              {t === 'all' ? `todos (${counts.all})` : t === 'image' ? `imágenes (${counts.image})` : t === 'video' ? `video (${counts.video})` : `audio (${counts.audio})`}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="buscar por nombre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="adm-inp"
          style={{ marginLeft: 'auto', width: 220, height: 34, fontSize: 13 }}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '64px 32px', textAlign: 'center', color: M, fontSize: 14, fontStyle: 'italic' }}>
          {files.length === 0 ? 'todavía no hay archivos. sube el primero arriba.' : 'no hay archivos que coincidan con el filtro.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {filtered.map(f => (
            <Thumb key={f.id} file={f} onClick={() => setSelected(f)} />
          ))}
        </div>
      )}

      {selected && (
        <DetailModal file={selected} onClose={() => setSelected(null)} onDelete={handleDeleted} />
      )}
    </main>
  )
}
