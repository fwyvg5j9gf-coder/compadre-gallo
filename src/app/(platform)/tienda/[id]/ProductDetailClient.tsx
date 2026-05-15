'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Product, ProductVariant } from '@/lib/supabase'
import { useCart } from '@/context/CartContext'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconMinus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

export default function ProductDetailClient({ product }: { product: Product }) {
  const { addItem, openCart } = useCart()

  const variants: ProductVariant[] = product.product_variants ?? []
  const isUnica = variants.length === 0 ||
    (variants.length === 1 && variants[0].size === 'única')

  const [selectedSize, setSelectedSize] = useState<string | null>(
    isUnica ? 'única' : null,
  )
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const selectedVariant = isUnica
    ? variants[0] ?? null
    : variants.find(v => v.size === selectedSize) ?? null

  const availableStock = selectedVariant?.stock ?? (isUnica ? 0 : null)
  const soldOut = isUnica
    ? (variants[0]?.stock ?? 0) === 0
    : selectedVariant ? selectedVariant.stock === 0 : false

  const canAdd = !soldOut && selectedSize !== null && qty > 0

  function handleAdd() {
    if (!canAdd) return
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      size: selectedSize!,
      name: product.name,
      price_mxn: product.price_mxn,
      qty,
      imageUrl: product.image_url,
      packagingTypeId: product.packaging_type_id,
    })
    setAdded(true)
    openCart()
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: 'var(--space-7) var(--outer-px) var(--space-9)' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
        <Link href="/tienda" style={{ color: 'var(--fg-muted)', textDecoration: 'none' }}>tienda</Link>
        <span>/</span>
        <span style={{ color: 'var(--fg)' }}>{product.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', alignItems: 'start' }}>

        {/* Imagen */}
        <div style={{
          aspectRatio: '4/5', borderRadius: 'var(--r-md)',
          background: '#0a0a0a', overflow: 'hidden',
          border: '1px solid var(--border)', position: 'relative',
        }}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: 12, background: 'var(--gallo-red)',
              }} />
              <div style={{
                position: 'absolute', bottom: 24, left: 28,
                fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: 'clamp(20px, 3vw, 32px)',
                letterSpacing: 'var(--track-snug)', lineHeight: 1.1,
                textTransform: 'lowercase', color: '#fff',
              }}>
                {product.name}
              </div>
            </>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', position: 'sticky', top: 80 }}>

          {product.category && (
            <div className="eyebrow">{product.category}</div>
          )}

          <div>
            <h1 style={{ marginBottom: 'var(--space-3)' }}>{product.name}</h1>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {fmt(product.price_mxn)}
            </div>
          </div>

          {product.description && (
            <p style={{ fontSize: 15, color: 'var(--fg-muted)', lineHeight: 1.65, margin: 0 }}>
              {product.description}
            </p>
          )}

          {/* Selector de tallas */}
          {!isUnica && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                talla
                {selectedSize && (
                  <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 8, color: 'var(--fg)' }}>
                    — {selectedSize}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {variants.map(v => {
                  const out = v.stock === 0
                  const active = selectedSize === v.size
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={out}
                      onClick={() => { setSelectedSize(v.size); setQty(1) }}
                      style={{
                        padding: '9px 18px', borderRadius: 4,
                        fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13,
                        cursor: out ? 'not-allowed' : 'pointer',
                        border: active ? '2px solid var(--fg)' : '1px solid var(--border)',
                        background: active ? 'var(--fg)' : 'transparent',
                        color: active ? '#fff' : out ? 'var(--fg-subtle)' : 'var(--fg)',
                        opacity: out ? 0.35 : 1,
                        transition: 'all 120ms',
                        position: 'relative',
                      }}
                    >
                      {v.size}
                    </button>
                  )
                })}
              </div>
              {selectedVariant && selectedVariant.stock <= 5 && selectedVariant.stock > 0 && (
                <p style={{ fontSize: 12, color: 'var(--gallo-red)', fontWeight: 600, marginTop: 8 }}>
                  {selectedVariant.stock === 1 ? 'última disponible' : `solo ${selectedVariant.stock} disponibles`}
                </p>
              )}
            </div>
          )}

          {/* Cantidad */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              cantidad
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden',
            }}>
              <button type="button"
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={qty <= 1}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--fg-muted)',
                  opacity: qty <= 1 ? 0.25 : 1,
                }}>
                <IconMinus />
              </button>
              <span style={{ fontWeight: 700, fontSize: 16, minWidth: 40, textAlign: 'center' }}>{qty}</span>
              <button type="button"
                onClick={() => setQty(q => Math.min(availableStock ?? 99, q + 1))}
                disabled={availableStock !== null && qty >= availableStock}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--fg-muted)',
                  opacity: (availableStock !== null && qty >= availableStock) ? 0.25 : 1,
                }}>
                <IconPlus />
              </button>
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd || added}
              className={`btn btn-lg ${added ? 'btn-yellow' : 'btn-primary'}`}
            >
              {soldOut
                ? 'agotado'
                : !selectedSize && !isUnica
                  ? 'elige una talla'
                  : added
                    ? 'agregado al carrito ✓'
                    : 'agregar al carrito'}
            </button>

            {!isUnica && !selectedSize && (
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0, textAlign: 'center' }}>
                selecciona una talla para continuar
              </p>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
            <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0, lineHeight: 1.6 }}>
              envío calculado al finalizar la compra. tiraje limitado, sin restock.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile: stack layout override */}
      <style>{`
        @media (max-width: 720px) {
          .product-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
