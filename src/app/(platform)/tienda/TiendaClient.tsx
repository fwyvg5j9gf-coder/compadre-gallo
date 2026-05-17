'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Product } from '@/lib/supabase'
import { totalStock } from '@/lib/supabase'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function ProductCard({ product }: { product: Product }) {
  const stock = totalStock(product.product_variants)
  const soldOut = stock === 0
  const lowStock = !soldOut && stock <= 5

  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Link href={`/tienda/${product.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          aspectRatio: '4/5',
          borderRadius: 'var(--r-md)',
          background: '#0a0a0a',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          cursor: 'pointer',
        }}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: 10, background: 'var(--gallo-red)',
              }} />
              <div style={{
                position: 'absolute', bottom: 16, left: 20, right: 12,
                fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: 'clamp(15px, 2vw, 20px)',
                letterSpacing: 'var(--track-snug)', lineHeight: 1.1,
                textTransform: 'lowercase', color: '#fff',
              }}>
                {product.name}
              </div>
            </>
          )}

          {product.category && (
            <span style={{
              position: 'absolute', top: 12, right: 12,
              background: '#0a0a0a', color: '#fff',
              fontSize: 9, fontWeight: 800, letterSpacing: '0.07em',
              textTransform: 'uppercase', padding: '3px 7px', lineHeight: 1.4,
            }}>
              {product.category}
            </span>
          )}

          {soldOut && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(10,10,10,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#fff',
                background: '#0a0a0a', padding: '5px 10px',
              }}>agotado</span>
            </div>
          )}
        </div>
      </Link>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{product.name}</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14, flexShrink: 0 }}>
            {fmt(product.price_mxn)}
          </span>
        </div>

        {product.description && (
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.5 }}>
            {product.description.length > 80
              ? product.description.slice(0, 80) + '…'
              : product.description}
          </p>
        )}

        {lowStock && (
          <span style={{ fontSize: 12, color: 'var(--gallo-red)', fontWeight: 600 }}>
            {stock === 1 ? 'última disponible' : `solo ${stock} disponibles`}
          </span>
        )}

        <Link href={`/tienda/${product.id}`}
          className={`btn btn-md ${soldOut ? 'btn-ghost' : 'btn-primary'}`}
          style={{ marginTop: 4, textAlign: 'center', textDecoration: 'none', display: 'block', opacity: soldOut ? 0.4 : 1, pointerEvents: soldOut ? 'none' : 'auto' }}>
          {soldOut ? 'agotado' : 'ver producto'}
        </Link>
      </div>
    </article>
  )
}

export default function TiendaClient({
  products,
  categories,
  tagline,
}: {
  products: Product[]
  categories: string[]
  tagline?: string
}) {
  const allCategories = ['todo', ...categories]
  const [active, setActive] = useState('todo')

  const filtered = active === 'todo'
    ? products
    : products.filter(p => p.category === active)

  return (
    <>
      <div style={{ padding: '0 var(--outer-px)', marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {allCategories.map(c => (
          <button
            key={c}
            className={`chip${active === c ? ' is-active' : ''}`}
            onClick={() => setActive(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 var(--outer-px)', paddingBottom: 'var(--space-9)' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-9) 0', color: 'var(--fg-muted)' }}>
            <p style={{ fontStyle: 'italic' }}>no hay productos en esta categoría todavía.</p>
          </div>
        ) : (
          <div className="grid-4">
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      <section className="section section-alt" style={{ textAlign: 'center', paddingTop: 'var(--space-7)', paddingBottom: 'var(--space-7)' }}>
        <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic', maxWidth: '40ch', margin: '0 auto' }}>
          {tagline ?? 'todo es tiraje limitado. cuando se acaba, se acaba.'}
        </p>
      </section>
    </>
  )
}
