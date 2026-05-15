'use client';

import { useState } from 'react';
import ArtistTile from '@/components/ArtistTile';
import { ARTISTS } from '@/lib/data';

const filters = ['todos', 'preventa', 'en vivo', 'guadalajara', 'cdmx', 'monterrey'];

export default function ArtistasPage() {
  const [active, setActive] = useState('todos');

  const filtered = ARTISTS.filter(a => {
    if (active === 'todos')    return true;
    if (active === 'preventa') return a.tag === 'preventa';
    if (active === 'en vivo')  return a.tag === 'en vivo';
    return a.city.toLowerCase().includes(active);
  });

  return (
    <>
      <div className="section" style={{ paddingBottom: 'var(--space-5)' }}>
        <div className="eyebrow" style={{ marginBottom: 'var(--space-4)' }}>catálogo completo</div>
        <h1>artistas</h1>
      </div>

      <div style={{ padding: '0 var(--outer-px)', marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button
            key={f}
            className={`chip${active === f ? ' is-active' : ''}`}
            onClick={() => setActive(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 var(--outer-px)', paddingBottom: 'var(--space-9)' }}>
        <div className="grid-4">
          {filtered.map(a => (
            <ArtistTile key={a.slug} artist={a} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>
            nada por aquí todavía.
          </p>
        )}
      </div>
    </>
  );
}
