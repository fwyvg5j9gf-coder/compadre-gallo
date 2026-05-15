'use client'

import { useState, useTransition, useRef } from 'react'
import { createArtist, toggleArtistPublished, deleteArtist } from './actions'

const B = '#e8e7e1'
const M = '#6b6a64'

type Artist = {
  id: string; slug: string; name: string; city: string | null; genre: string | null
  image_url: string | null; is_published: boolean
  bg_color: string; stripe_color: string
  shows_count: number; tasks_done: number; tasks_total: number
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ── Modal nuevo artista ────────────────────────────────────────────────────────
function NuevoModal({ onClose }: { onClose: () => void }) {
  const [name, setName]   = useState('')
  const [slug, setSlug]   = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [pending, start]  = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleNameChange(v: string) {
    setName(v)
    if (!slugEdited) setSlug(slugify(v))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px -16px rgba(10,10,10,0.3)',
      }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${B}` }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>
            nuevo artista
          </div>
        </div>
        <form ref={formRef} action={createArtist} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              nombre artístico
            </label>
            <input
              name="name" value={name} onChange={e => handleNameChange(e.target.value)}
              required className="adm-inp" style={{ width: '100%', height: 36 }}
              placeholder="ej. paloma"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              slug (URL)
            </label>
            <input
              name="slug" value={slug}
              onChange={e => { setSlug(e.target.value); setSlugEdited(true) }}
              required className="adm-inp" style={{ width: '100%', height: 36, fontFamily: 'monospace', fontSize: 13 }}
              placeholder="paloma"
            />
            <div style={{ fontSize: 11, color: '#9a9994', marginTop: 4 }}>
              compadregallo.com/artista/{slug || '…'}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>ciudad</label>
              <input name="city" className="adm-inp" style={{ width: '100%', height: 36 }} placeholder="guadalajara" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>género</label>
              <input name="genre" className="adm-inp" style={{ width: '100%', height: 36 }} placeholder="electrónica" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} className="adm-btn-secondary" style={{ height: 36, padding: '0 16px', fontSize: 13 }}>
              cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !name || !slug}
              className="adm-btn-primary"
              style={{ height: 36, padding: '0 16px', fontSize: 13 }}
              onClick={() => start(() => {})}
            >
              {pending ? 'creando…' : 'crear artista →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Card de artista ────────────────────────────────────────────────────────────
function ArtistCard({ artist }: { artist: Artist }) {
  const [pubPending, startPub] = useTransition()

  return (
    <div style={{
      background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Banner / foto */}
      <a href={`/casa/artistas/${artist.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          height: 100, background: artist.bg_color, position: 'relative', overflow: 'hidden',
          cursor: 'pointer',
        }}>
          {artist.image_url ? (
            <img src={artist.image_url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
          ) : (
            <div style={{ position: 'absolute', bottom: 12, left: 16 }}>
              <div style={{ width: 40, height: 3, background: artist.stripe_color, borderRadius: 2 }} />
            </div>
          )}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
            background: artist.is_published ? 'rgba(26,107,53,0.9)' : 'rgba(10,10,10,0.5)',
            color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {artist.is_published ? 'publicado' : 'borrador'}
          </div>
        </div>
      </a>

      {/* Info */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <a href={`/casa/artistas/${artist.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0a0a0a', letterSpacing: '-0.01em', marginBottom: 2 }}>
              {artist.name}
            </div>
          </a>
          <div style={{ fontSize: 12, color: M }}>
            {[artist.city, artist.genre].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <div style={{ color: M }}>
            <strong style={{ color: '#0a0a0a', fontWeight: 700 }}>{artist.shows_count}</strong>{' '}
            <span>shows</span>
          </div>
          <div style={{ color: M }}>
            <strong style={{ color: '#0a0a0a', fontWeight: 700 }}>{artist.tasks_done}/{artist.tasks_total}</strong>{' '}
            <span>tareas</span>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${B}` }}>
          <a href={`/casa/artistas/${artist.id}`} className="adm-btn-secondary" style={{ flex: 1, textAlign: 'center', fontSize: 12, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            editar
          </a>
          <button
            onClick={() => startPub(() => toggleArtistPublished(artist.id, !artist.is_published))}
            disabled={pubPending}
            className="adm-btn-secondary"
            style={{ flex: 1, fontSize: 12, height: 30, cursor: 'pointer' }}
          >
            {pubPending ? '…' : artist.is_published ? 'despublicar' : 'publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ArtistasAdmin({ artists }: { artists: Artist[] }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      {showModal && <NuevoModal onClose={() => setShowModal(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900,
            letterSpacing: '-0.03em', color: '#0a0a0a', textTransform: 'lowercase', marginBottom: 4,
          }}>
            artistas
          </h1>
          <div style={{ fontSize: 13, color: M }}>
            <strong style={{ color: '#0a0a0a' }}>{artists.length}</strong> en catálogo
            · <strong style={{ color: '#0a0a0a' }}>{artists.filter(a => a.is_published).length}</strong> publicados
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="adm-btn-primary" style={{ height: 36, padding: '0 18px', fontSize: 13 }}>
          + nuevo artista
        </button>
      </div>

      {artists.length === 0 ? (
        <div style={{
          background: '#fff', border: `1px solid ${B}`, borderRadius: 8,
          padding: '64px 32px', textAlign: 'center', color: M, fontSize: 14, fontStyle: 'italic',
        }}>
          todavía no hay artistas. crea el primero.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {artists.map(a => <ArtistCard key={a.id} artist={a} />)}
        </div>
      )}
    </>
  )
}
