import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '../../AdminShell'
import OrderActions from './OrderActions'

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

function folio(n: number) {
  return `GALLO-${String(n).padStart(5, '0')}`
}

const B = '#e8e7e1'
const M = '#6b6a64'
const S = '#9a9994'

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 20px', background: '#f6f5f1', borderBottom: `1px solid ${B}`,
        fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {title}
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 14 }}>
      <span style={{ color: M, minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#0a0a0a', fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  )
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const items = order.order_items ?? []
  const addr = order.shipping_address as Record<string, string> | null
  const sc = STATUS_COLOR[order.status] ?? { bg: '#f0efe9', text: '#6b6a64' }

  return (
    <AdminShell
      crumb={folio(order.folio_number)}
      crumbHref="/casa/ordenes"
    >
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900,
              letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 6, textTransform: 'lowercase',
            }}>
              {folio(order.folio_number)}
            </h1>
            <div style={{ fontSize: 13, color: M }}>
              {new Date(order.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
            background: sc.bg, color: sc.text,
            textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Productos */}
            <InfoCard title="productos">
              {items.map((item: { id: string; product_name: string; size: string | null; quantity: number; unit_price_mxn: number }, idx: number) => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: idx < items.length - 1 ? `1px solid ${B}` : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>{item.product_name}</div>
                    {item.size && item.size !== 'única' && (
                      <div style={{ fontSize: 12, color: M }}>talla {item.size}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{fmt(item.unit_price_mxn * item.quantity)}</div>
                    <div style={{ fontSize: 12, color: M }}>×{item.quantity} · {fmt(item.unit_price_mxn)} c/u</div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${B}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: M }}>
                  <span>subtotal</span>
                  <span style={{ fontFamily: 'monospace' }}>{fmt(order.subtotal_mxn)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: M }}>
                  <span>envío {order.shipping_carrier ? `· ${order.shipping_carrier}` : ''}</span>
                  <span style={{ fontFamily: 'monospace' }}>{order.shipping_mxn === 0 ? 'gratis' : fmt(order.shipping_mxn)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, color: '#0a0a0a', marginTop: 4 }}>
                  <span>total</span>
                  <span style={{ fontFamily: 'monospace' }}>{fmt(order.total_mxn)}</span>
                </div>
              </div>
            </InfoCard>

            {/* Cliente */}
            <InfoCard title="cliente">
              <Row label="nombre"  value={order.customer_name} />
              <Row label="correo"  value={<a href={`mailto:${order.customer_email}`} style={{ color: '#003a87' }}>{order.customer_email}</a>} />
              <Row label="teléfono" value={order.customer_phone} />
              {order.notes && <Row label="notas" value={order.notes} />}
            </InfoCard>

            {/* Envío */}
            {addr && (
              <InfoCard title="dirección de envío">
                <Row label="calle"    value={addr.street} />
                <Row label="colonia"  value={addr.colonia} />
                <Row label="C.P."     value={addr.zip} />
                <Row label="ciudad"   value={addr.city} />
                <Row label="estado"   value={addr.state} />
                {order.tracking_number && (
                  <Row label="guía" value={
                    <span style={{ fontFamily: 'monospace', fontSize: 13, background: 'rgba(0,58,135,0.06)', padding: '2px 8px', borderRadius: 4, color: '#003a87' }}>
                      {order.tracking_number}
                    </span>
                  } />
                )}
              </InfoCard>
            )}

            {/* Pago */}
            {order.stripe_payment_id && (
              <InfoCard title="pago">
                <Row label="stripe PI" value={<span style={{ fontFamily: 'monospace', fontSize: 12, color: M }}>{order.stripe_payment_id}</span>} />
              </InfoCard>
            )}

          </div>

          {/* Right — acciones */}
          <div>
            <OrderActions
              orderId={order.id}
              currentStatus={order.status}
              currentTracking={order.tracking_number ?? null}
              shippingRateId={order.shipping_rate_id ?? null}
              labelUrl={(order as Record<string, unknown>).label_url as string ?? null}
            />
          </div>

        </div>
      </main>
    </AdminShell>
  )
}
