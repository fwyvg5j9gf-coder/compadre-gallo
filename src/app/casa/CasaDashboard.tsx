'use client'

import { UserButton } from '@clerk/nextjs'
import AdminShell from './AdminShell'

const CARDS = [
  {
    title: 'tienda',
    desc: 'productos, stock, precios e imágenes',
    href: '/casa/tienda',
    accent: '#ff0100',
  },
  {
    title: 'órdenes',
    desc: 'compras, envíos y estados',
    href: '/casa/ordenes',
    accent: '#003a87',
  },
  {
    title: 'artistas',
    desc: 'catálogo, bios y shows',
    href: '/casa/artistas',
    accent: '#00c4df',
  },
  {
    title: 'editor',
    desc: 'contenido y apariencia del sitio',
    href: '/casa/editor',
    accent: '#ffe200',
  },
]

export default function CasaDashboard({ email, firstName }: { email: string; firstName: string }) {
  return (
    <AdminShell
      crumb="casa"
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#6b6a64' }}>{email}</span>
          <UserButton />
        </div>
      }
    >
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '52px 32px' }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 900,
            letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 6, textTransform: 'lowercase',
          }}>
            hola, {firstName}.
          </h1>
          <p style={{ color: '#6b6a64', fontSize: 14, margin: 0 }}>
            desde aquí controlas todo lo que aparece en compadregallo.com
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {CARDS.map(card => (
            <a
              key={card.title}
              href={card.href}
              style={{
                display: 'block', background: '#fff',
                border: '1px solid #e8e7e1', borderRadius: 8,
                padding: '22px 24px', textDecoration: 'none',
                cursor: 'pointer', transition: 'box-shadow 150ms, border-color 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 20px -8px rgba(10,10,10,0.12)'
                e.currentTarget.style.borderColor = '#d4d3cd'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = '#e8e7e1'
              }}
            >
              <div style={{ width: 32, height: 3, background: card.accent, borderRadius: 2, marginBottom: 18 }} />
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0a0a0a', marginBottom: 5, letterSpacing: '-0.01em' }}>
                {card.title}
              </div>
              <div style={{ fontSize: 13, color: '#6b6a64', lineHeight: 1.5 }}>{card.desc}</div>
            </a>
          ))}
        </div>
      </main>
    </AdminShell>
  )
}
