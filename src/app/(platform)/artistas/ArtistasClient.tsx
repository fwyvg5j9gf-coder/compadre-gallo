'use client'

import { useState } from 'react'
import ArtistTile from '@/components/ArtistTile'
import type { Artist } from '@/lib/data'

const FILTERS = ['todos', 'preventa', 'en vivo', 'guadalajara', 'cdmx', 'monterrey']

export default function ArtistasClient({ artists }: { artists: Artist[] }) {
  const [active, setActive] = useState('todos')

  const filtered = artists.filter(a => {
    if (active === 'todos')    return true
    if (active === 'preventa') return a.tag === 'preventa'
    if (active === 'en vivo')  return a.tag === 'en vivo'
    return a.city.toLowerCase().includes(active)
  })

  return (
    <>
      <div style={{ padding: '0 var(--outer-px)', marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} className={`chip${active === f ? ' is-active' : ''}`} onClick={() => setActive(f)}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 var(--outer-px)', paddingBottom: 'var(--space-9)' }}>
        <div className="grid-4">
          {filtered.map(a => <ArtistTile key={a.slug} artist={a} />)}
        </div>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>nada por aquí todavía.</p>
        )}
      </div>
    </>
  )
}
