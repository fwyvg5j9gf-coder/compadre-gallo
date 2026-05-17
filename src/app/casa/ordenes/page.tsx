import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '../AdminShell'
import SkydropxBalanceBadge from './SkydropxBalanceBadge'

const STATUS_LABEL: Record<string, string> = {
  pending: 'pendiente', paid: 'pagado', shipped: 'enviado',
  delivered: 'entregado', refunded: 'reembolsado', failed: 'fallido',
}
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

export default async function OrdenesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .order('folio_number', { ascending: false })

  const list = orders ?? []
  const realList = list.filter(o => !o.is_test)
  const totalVentas = realList.reduce((s, o) => s + o.total_mxn, 0)
  const pagadas = realList.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status)).length

  return (
    <AdminShell
      crumb="órdenes"
      crumbHref="/casa"
      right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SkydropxBalanceBadge />
          <a href="/api/export-orders" style={{
            fontSize: 12, fontWeight: 700, color: '#f0efe9',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 4, padding: '5px 12px', textDecoration: 'none',
            transition: 'background 140ms', letterSpacing: '-0.01em',
          }}>
            exportar CSV
          </a>
          <a href="/casa/ordenes/nuevo" style={{
            fontSize: 12, fontWeight: 700, color: '#0a0a0a',
            background: '#ffe200', border: '1px solid rgba(255,226,0,0.5)',
            borderRadius: 4, padding: '5px 12px', textDecoration: 'none',
            transition: 'background 140ms', letterSpacing: '-0.01em',
          }}>
            + nueva orden
          </a>
        </div>
      }
    >
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
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
            {list.length !== realList.length && (
              <span style={{ color: '#9a9994' }}>{list.length - realList.length} prueba</span>
            )}
          </div>
        </div>

        {list.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8,
            padding: '64px 32px', textAlign: 'center', color: '#6b6a64', fontSize: 14, fontStyle: 'italic',
          }}>
            todavía no hay órdenes.
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8, overflow: 'hidden' }}>
            {/* Cabecera */}
            <div style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 200px auto 96px 100px',
              gap: 12, padding: '8px 20px', background: '#f6f5f1', borderBottom: '1px solid #e8e7e1',
              fontSize: 10, fontWeight: 700, color: '#9a9994', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              <div>folio</div><div>cliente</div><div>productos</div><div>total</div><div>fecha</div><div>estado</div>
            </div>

            {list.map((order, idx) => {
              const items = order.order_items ?? []
              const summary = items
                .map((i: { product_name: string; quantity: number }) => `${i.product_name} ×${i.quantity}`)
                .join(', ')
              const sc = STATUS_COLOR[order.status] ?? { bg: '#f0efe9', text: '#6b6a64' }
              const folioStr = `GALLO-${String(order.folio_number).padStart(5, '0')}`
              const isTest = (order as Record<string, unknown>).is_test as boolean

              return (
                <a key={order.id} href={`/casa/ordenes/${order.id}`} className="adm-row" style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 200px auto 96px 100px',
                  gap: 12, alignItems: 'center', padding: '13px 20px',
                  borderBottom: idx < list.length - 1 ? '1px solid #f0efe9' : 'none',
                  textDecoration: 'none', color: 'inherit',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#003a87', fontWeight: 700, letterSpacing: '0.01em' }}>
                      {folioStr}
                    </span>
                    {isTest && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999, background: 'rgba(255,226,0,0.3)', color: '#7a6000', letterSpacing: '0.05em', display: 'inline-block', width: 'fit-content' }}>
                        PRUEBA
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>{order.customer_name ?? '—'}</div>
                    <div style={{ fontSize: 12, color: '#6b6a64' }}>{order.customer_email}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b6a64', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {summary || '—'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(order.total_mxn)}
                  </div>
                  <div style={{ fontSize: 12, color: '#9a9994' }}>
                    {order.created_at.slice(0, 10)}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                    background: sc.bg, color: sc.text,
                    textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                  }}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </main>
    </AdminShell>
  )
}
