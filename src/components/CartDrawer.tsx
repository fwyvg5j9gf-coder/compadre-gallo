'use client'

import Link from 'next/link'
import { useCart } from '@/context/CartContext'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconMinus = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconPlus = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)
const IconBag = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)

export default function CartDrawer() {
  const { items, open, totalMxn, totalItems, closeCart, removeItem, setQty } = useCart()

  return (
    <>
      {open && (
        <div
          onClick={closeCart}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,10,0.3)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 'min(400px, 100vw)',
        background: '#fff',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms cubic-bezier(0.32,0,0.15,1)',
        boxShadow: open ? '-8px 0 32px rgba(0,0,0,0.1)' : 'none',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: 60,
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
            letterSpacing: '-0.03em', textTransform: 'lowercase',
          }}>
            carrito
            {totalItems > 0 && (
              <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 600, fontFamily: 'var(--font-sans)', marginLeft: 6 }}>
                ({totalItems})
              </span>
            )}
          </span>
          <button onClick={closeCart} aria-label="cerrar carrito" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--fg-muted)', display: 'flex', alignItems: 'center',
            padding: 6, borderRadius: 4, transition: 'color 120ms',
          }}>
            <IconX />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {items.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 16, padding: '80px 20px',
              color: 'var(--fg-muted)',
            }}>
              <div style={{ opacity: 0.2 }}><IconBag /></div>
              <p style={{ fontSize: 14, margin: 0, textAlign: 'center' }}>tu carrito está vacío</p>
              <button onClick={closeCart} style={{
                fontSize: 13, color: 'var(--gallo-blue)', fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}>
                seguir comprando
              </button>
            </div>
          ) : items.map(item => (
            <div key={`${item.productId}-${item.size}`} style={{
              display: 'grid', gridTemplateColumns: '64px 1fr auto',
              gap: 12, alignItems: 'start',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              {/* Imagen */}
              <div style={{
                width: 64, height: 64, borderRadius: 6,
                overflow: 'hidden', background: 'var(--bg-soft)',
                border: '1px solid var(--border)', flexShrink: 0,
              }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: '#0a0a0a' }} />
                }
              </div>

              {/* Info + cantidad */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                {item.size !== 'única' && (
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>talla {item.size}</span>
                )}
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  border: '1px solid var(--border)', borderRadius: 4,
                  overflow: 'hidden', width: 'fit-content',
                }}>
                  <button type="button"
                    onClick={() => setQty(item.productId, item.size, item.qty - 1)}
                    disabled={item.qty <= 1}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--fg-muted)',
                      opacity: item.qty <= 1 ? 0.25 : 1,
                    }}>
                    <IconMinus />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'center', lineHeight: '28px' }}>
                    {item.qty}
                  </span>
                  <button type="button"
                    onClick={() => setQty(item.productId, item.size, item.qty + 1)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--fg-muted)',
                    }}>
                    <IconPlus />
                  </button>
                </div>
              </div>

              {/* Precio + eliminar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>
                  {fmt(item.price_mxn * item.qty)}
                </span>
                <button type="button" onClick={() => removeItem(item.productId, item.size)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center',
                    padding: 2, transition: 'color 120ms',
                  }}>
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{
            padding: '20px', borderTop: '1px solid var(--border)',
            flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>subtotal</span>
              <span style={{
                fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.03em',
              }}>
                {fmt(totalMxn)}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>
              envío calculado al finalizar la compra
            </p>
            <Link href="/carrito/checkout" onClick={closeCart}
              className="btn btn-primary btn-lg"
              style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
              ir al checkout →
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
