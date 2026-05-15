'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const STATUS_LABEL: Record<string, string> = {
  pending: 'pendiente', paid: 'pagado', shipped: 'enviado',
  delivered: 'entregado', refunded: 'reembolsado', failed: 'fallido',
}
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: 'rgba(107,106,100,0.1)', text: '#6b6a64' },
  paid:      { bg: 'rgba(0,58,135,0.08)',   text: '#003a87' },
  shipped:   { bg: 'rgba(0,196,223,0.1)',   text: '#007a8c' },
  delivered: { bg: 'rgba(26,107,53,0.08)',  text: '#1a6b35' },
  refunded:  { bg: 'rgba(255,212,154,0.3)', text: '#6b4a10' },
  failed:    { bg: 'rgba(255,1,0,0.07)',    text: '#cc0000' },
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function folio(n: number) {
  return `GALLO-${String(n).padStart(5, '0')}`
}

type OrderItem = { product_name: string; quantity: number; unit_price_mxn: number; size: string | null }
type Order = {
  id: string
  folio_number: number
  status: string
  total_mxn: number
  subtotal_mxn: number
  shipping_mxn: number
  created_at: string
  tracking_number: string | null
  shipping_carrier: string | null
  shipping_address: Record<string, string> | null
  order_items: OrderItem[]
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false)
  const items = order.order_items ?? []
  const sc = STATUS_COLOR[order.status] ?? { bg: 'rgba(107,106,100,0.1)', text: '#6b6a64' }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)', background: '#fff', border: 'none',
          cursor: 'pointer', gap: 'var(--space-4)', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#003a87', flexShrink: 0 }}>
            {folio(order.folio_number)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)', flexShrink: 0 }}>
            {new Date(order.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: sc.bg, color: sc.text,
            textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 15 }}>{fmt(order.total_mxn)}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms', color: 'var(--fg-muted)' }}>
            <polyline points="4 6 8 10 12 6"/>
          </svg>
        </div>
      </button>

      {/* Detalle expandido */}
      {expanded && (
        <div style={{ padding: 'var(--space-5)', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Productos */}
          <div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{item.product_name}</span>
                  {item.size && item.size !== 'única' && (
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)', marginLeft: 6 }}>talla {item.size}</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(item.unit_price_mxn * item.quantity)}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)', marginLeft: 6 }}>×{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desglose */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fg-muted)' }}>
              <span>subtotal</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(order.subtotal_mxn)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fg-muted)' }}>
              <span>envío</span><span style={{ fontFamily: 'var(--font-mono)' }}>{order.shipping_mxn === 0 ? 'gratis' : fmt(order.shipping_mxn)}</span>
            </div>
          </div>

          {/* Guía de rastreo */}
          {order.tracking_number && (
            <div style={{ background: 'rgba(0,58,135,0.06)', border: '1px solid rgba(0,58,135,0.15)', borderRadius: 6, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#007a8c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                guía de rastreo {order.shipping_carrier ? `· ${order.shipping_carrier}` : ''}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#003a87' }}>
                {order.tracking_number}
              </span>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default function CuentaClient({
  orders,
  firstName,
  email,
}: {
  orders: Order[]
  firstName: string
  email: string
}) {
  const [tab, setTab] = useState<'pedidos' | 'perfil'>('pedidos')
  const { signOut } = useClerk()
  const router = useRouter()

  const active = orders.filter(o => ['paid', 'shipped'].includes(o.status))
  const history = orders.filter(o => !['paid', 'shipped'].includes(o.status))

  return (
    <div className="account-grid">
      {/* Sidebar */}
      <aside className="account-sidebar">
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontWeight: 700, fontSize: 17, textTransform: 'lowercase' }}>{firstName}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>{email}</div>
        </div>
        {(['pedidos', 'perfil'] as const).map(s => (
          <button
            key={s}
            className={`account-nav-item${tab === s ? ' is-active' : ''}`}
            onClick={() => setTab(s)}
          >
            {s}
          </button>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-6)' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--fg-muted)' }}
            onClick={() => signOut(() => router.push('/'))}
          >
            cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div>
        {tab === 'pedidos' && (
          <>
            {orders.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <h2>mis pedidos</h2>
                <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                  todavía no has hecho ningún pedido.{' '}
                  <Link href="/tienda" style={{ borderBottom: '1px solid currentColor' }}>ponle</Link>.
                </p>
              </div>
            ) : (
              <>
                {active.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-7)' }}>
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>en camino</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {active.map(o => <OrderCard key={o.id} order={o} />)}
                    </div>
                  </div>
                )}
                {history.length > 0 && (
                  <div>
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>{active.length > 0 ? 'historial' : 'mis pedidos'}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {history.map(o => <OrderCard key={o.id} order={o} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'perfil' && (
          <>
            <h2 style={{ marginBottom: 'var(--space-6)' }}>perfil</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', maxWidth: 560 }}>
              <div className="field">
                <label>nombre</label>
                <input type="text" defaultValue={firstName} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>correo</label>
                <input type="email" defaultValue={email} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
            <p style={{ marginTop: 'var(--space-4)', fontSize: 13, color: 'var(--fg-muted)' }}>
              para cambiar tu nombre o correo, ve a tu perfil de Clerk.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
