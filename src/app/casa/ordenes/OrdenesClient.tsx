'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus, deleteOrder } from './[id]/actions'

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'pendiente' },
  { value: 'paid',      label: 'pagado' },
  { value: 'shipped',   label: 'enviado' },
  { value: 'delivered', label: 'entregado' },
  { value: 'refunded',  label: 'reembolsado' },
  { value: 'failed',    label: 'fallido' },
]

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#f0efe9',              text: '#6b6a64' },
  paid:      { bg: 'rgba(0,58,135,0.08)',  text: '#003a87' },
  shipped:   { bg: 'rgba(0,196,223,0.1)',  text: '#007a8c' },
  delivered: { bg: 'rgba(26,107,53,0.08)', text: '#1a6b35' },
  refunded:  { bg: 'rgba(255,212,154,0.3)',text: '#6b4a10' },
  failed:    { bg: 'rgba(255,1,0,0.07)',   text: '#cc0000' },
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

type OrderRow = {
  id: string
  folio_number: number
  customer_name: string | null
  customer_email: string
  total_mxn: number
  status: string
  created_at: string
  is_test: boolean
  order_items: { product_name: string; quantity: number }[]
}

function QuickRow({ order, isLast }: { order: OrderRow; isLast: boolean }) {
  const router = useRouter()
  const [status, setStatus] = useState(order.status)
  const [pendingStatus, startStatus] = useTransition()
  const [pendingDelete, startDelete] = useTransition()
  const [confirmDel, setConfirmDel] = useState(false)
  const [statusSaved, setStatusSaved] = useState(false)

  const sc = STATUS_COLOR[status] ?? { bg: '#f0efe9', text: '#6b6a64' }
  const folioStr = `GALLO-${String(order.folio_number).padStart(5, '0')}`
  const summary = order.order_items
    .map(i => `${i.product_name} ×${i.quantity}`)
    .join(', ')

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus)
    startStatus(async () => {
      await updateOrderStatus(order.id, newStatus)
      setStatusSaved(true)
      setTimeout(() => setStatusSaved(false), 1500)
    })
  }

  function handleDelete() {
    startDelete(async () => {
      await deleteOrder(order.id)
      router.refresh()
    })
  }

  return (
    <div
      onClick={() => router.push(`/casa/ordenes/${order.id}`)}
      className="adm-orders-row"
      style={{
        background: '#fff',
        borderBottom: isLast ? 'none' : '1px solid #f0efe9',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fafaf8' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
    >
      {/* Folio */}
      <div className="adm-col-folio" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#003a87', fontWeight: 700 }}>
          {folioStr}
        </span>
        {order.is_test && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999, background: 'rgba(255,226,0,0.3)', color: '#7a6000', letterSpacing: '0.05em', display: 'inline-block', width: 'fit-content' }}>
            PRUEBA
          </span>
        )}
      </div>

      {/* Cliente */}
      <div className="adm-col-client">
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>{order.customer_name ?? '—'}</div>
        <div style={{ fontSize: 12, color: '#6b6a64' }}>{order.customer_email}</div>
      </div>

      {/* Productos */}
      <div className="adm-col-products" style={{ fontSize: 12, color: '#6b6a64', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {summary || '—'}
      </div>

      {/* Total */}
      <div className="adm-col-total" style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(order.total_mxn)}
      </div>

      {/* Fecha */}
      <div className="adm-col-date" style={{ fontSize: 12, color: '#9a9994' }}>
        {order.created_at.slice(0, 10)}
      </div>

      {/* Estado badge */}
      <span className="adm-col-status" style={{
        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
        background: sc.bg, color: sc.text,
        textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
        transition: 'background 200ms, color 200ms',
      }}>
        {STATUS_OPTIONS.find(o => o.value === status)?.label ?? status}
        {statusSaved && ' ✓'}
      </span>

      {/* Acciones rápidas */}
      <div
        className="adm-col-actions"
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', gap: 5, alignItems: 'center' }}
      >
        {/* Cambio rápido de estado */}
        <select
          value={status}
          onChange={e => handleStatusChange(e.target.value)}
          disabled={pendingStatus}
          style={{
            height: 28, padding: '0 6px', fontSize: 11, border: '1px solid #e8e7e1',
            borderRadius: 4, background: '#fff', color: '#0a0a0a', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', opacity: pendingStatus ? 0.6 : 1,
            maxWidth: 110,
          }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Ver detalle */}
        <button
          onClick={() => router.push(`/casa/ordenes/${order.id}`)}
          title="ver detalle"
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #e8e7e1', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#6b6a64',
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>

        {/* Eliminar */}
        {confirmDel ? (
          <>
            <button
              onClick={handleDelete}
              disabled={pendingDelete}
              style={{
                height: 28, padding: '0 8px', fontSize: 11, fontWeight: 700,
                border: 'none', borderRadius: 4, background: '#ff0100', color: '#fff', cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {pendingDelete ? '…' : '¿sí?'}
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #e8e7e1', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#6b6a64',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            title="eliminar orden"
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4, background: '#fff',
              cursor: 'pointer', color: 'rgba(255,1,0,0.5)', flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function OrdenesClient({ orders }: { orders: OrderRow[] }) {
  const realList = orders.filter(o => !o.is_test)
  const totalVentas = realList.reduce((s, o) => s + o.total_mxn, 0)
  const pagadas = realList.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status)).length

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900,
          letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 6, textTransform: 'lowercase',
        }}>
          órdenes
        </h1>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#6b6a64' }}>
          <span><strong style={{ color: '#0a0a0a', fontWeight: 700 }}>{realList.length}</strong> reales</span>
          <span><strong style={{ color: '#0a0a0a', fontWeight: 700 }}>{pagadas}</strong> pagadas</span>
          <span><strong style={{ color: '#0a0a0a', fontWeight: 700 }}>{fmt(totalVentas)}</strong> en ventas</span>
          {orders.length !== realList.length && (
            <span style={{ color: '#9a9994' }}>{orders.length - realList.length} prueba</span>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8,
          padding: '64px 32px', textAlign: 'center', color: '#6b6a64', fontSize: 14, fontStyle: 'italic',
        }}>
          todavía no hay órdenes.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div className="adm-orders-header" style={{
            background: '#f6f5f1', borderBottom: '1px solid #e8e7e1',
            fontSize: 10, fontWeight: 700, color: '#9a9994', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <div>folio</div>
            <div>cliente</div>
            <div>productos</div>
            <div>total</div>
            <div>fecha</div>
            <div>estado</div>
            <div>acciones rápidas</div>
          </div>

          {orders.map((order, idx) => (
            <QuickRow key={order.id} order={order} isLast={idx === orders.length - 1} />
          ))}
        </div>
      )}
    </>
  )
}
