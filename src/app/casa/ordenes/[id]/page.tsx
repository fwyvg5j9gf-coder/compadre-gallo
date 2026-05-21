import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '../../AdminShell'
import OrderActions from './OrderActions'
import { checkShipmentReadiness } from './actions'
import type { ReadinessItem, SkydropxEvent } from './actions'

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

const ACTION_META: Record<string, { label: string; dot: string }> = {
  update_status:     { label: 'estado',      dot: '#003a87' },
  update_tracking:   { label: 'guía',        dot: '#007a8c' },
  update_details:    { label: 'datos',       dot: '#6b6a64' },
  shipment_created:  { label: 'guía creada', dot: '#1a6b35' },
  shipment_cancelled:{ label: 'guía cancel', dot: '#cc0000' },
  delete:            { label: 'eliminado',   dot: '#cc0000' },
}

function OrderHistoryCard({
  createdAt,
  auditRows,
}: {
  createdAt: string
  auditRows: { id: string; action: string; summary: string; user_id: string | null; created_at: string }[]
}) {
  const fmtTs = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <InfoCard title="historial de cambios">
      <div style={{ position: 'relative', paddingLeft: 16 }}>
        {/* vertical line */}
        <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, background: B }} />

        {/* Evento creación */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 16 }}>
          <div style={{ position: 'absolute', left: -12, top: 5, width: 8, height: 8, borderRadius: '50%', background: '#1a6b35', border: '2px solid #fff', boxShadow: `0 0 0 1px #1a6b35` }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1a6b35', textTransform: 'uppercase', letterSpacing: '0.04em' }}>orden creada</span>
          <span style={{ fontSize: 13, color: '#0a0a0a' }}>pedido registrado en el sistema</span>
          <span style={{ fontSize: 11, color: S }}>{fmtTs(createdAt)}</span>
        </div>

        {/* Eventos de audit_log */}
        {auditRows.map((row) => {
          const meta = ACTION_META[row.action] ?? { label: row.action, dot: '#9a9994' }
          return (
            <div key={row.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 16 }}>
              <div style={{ position: 'absolute', left: -12, top: 5, width: 8, height: 8, borderRadius: '50%', background: meta.dot, border: '2px solid #fff', boxShadow: `0 0 0 1px ${meta.dot}` }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: meta.dot, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {meta.label}
              </span>
              <span style={{ fontSize: 13, color: '#0a0a0a' }}>{row.summary}</span>
              <span style={{ fontSize: 11, color: S }}>
                {fmtTs(row.created_at)}
                {row.user_id && (
                  <span style={{ marginLeft: 8, fontFamily: 'monospace', color: '#bbb' }}>
                    ···{row.user_id.slice(-6)}
                  </span>
                )}
              </span>
            </div>
          )
        })}

        {auditRows.length === 0 && (
          <p style={{ fontSize: 13, color: S, fontStyle: 'italic', marginLeft: 4 }}>
            sin cambios registrados.
          </p>
        )}
      </div>
    </InfoCard>
  )
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const { id } = await params

  const [{ data: order }, { data: auditRows }] = await Promise.all([
    supabaseAdmin.from('orders').select('*, order_items(*)').eq('id', id).single(),
    supabaseAdmin.from('audit_log')
      .select('id, action, summary, user_id, created_at')
      .eq('record_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!order) notFound()

  const items = order.order_items ?? []
  const addr = order.shipping_address as Record<string, string> | null
  const sc = STATUS_COLOR[order.status] ?? { bg: '#f0efe9', text: '#6b6a64' }
  const isTest = (order as Record<string, unknown>).is_test as boolean
  const skydropxShipmentId = (order as Record<string, unknown>).skydropx_shipment_id as string | null ?? null
  const skydropxCostMxn = (order as Record<string, unknown>).skydropx_cost_mxn as number | null ?? null
  const skydropxEvents = ((order as Record<string, unknown>).skydropx_events as SkydropxEvent[] | null) ?? []

  const readiness = !order.tracking_number
    ? await checkShipmentReadiness(order.id).catch(() => null)
    : null

  return (
    <AdminShell
      crumb={folio(order.folio_number)}
      crumbHref="/casa/ordenes"
    >
      <main style={{ maxWidth: 1100, margin: '0 auto' }} className="adm-main-pad">

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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isTest && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,226,0,0.25)', color: '#7a6000', letterSpacing: '0.05em', border: '1px solid rgba(255,226,0,0.5)' }}>
                PRUEBA
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
              background: sc.bg, color: sc.text,
              textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
        </div>

        <div className="adm-order-detail-grid">

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

            {/* Dirección de envío */}
            {addr && (
              <InfoCard title="dirección de envío">
                <Row label="calle"    value={addr.street} />
                <Row label="colonia"  value={addr.colonia} />
                <Row label="C.P."     value={addr.zip} />
                <Row label="ciudad"   value={addr.city} />
                <Row label="estado"   value={addr.state} />
              </InfoCard>
            )}

            {/* Detalles del envío Skydropx */}
            {(order.tracking_number || skydropxEvents.length > 0) && (
              <InfoCard title="envío">
                {order.tracking_number && (
                  <>
                    {order.shipping_carrier && <Row label="paquetería" value={order.shipping_carrier} />}
                    <Row label="guía" value={
                      <span style={{ fontFamily: 'monospace', fontSize: 13, background: 'rgba(0,58,135,0.06)', padding: '2px 8px', borderRadius: 4, color: '#003a87' }}>
                        {order.tracking_number}
                      </span>
                    } />
                    {skydropxCostMxn != null && (
                      <Row label="costo Skydropx" value={
                        <span style={{ fontFamily: 'monospace' }}>
                          {(skydropxCostMxn / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                        </span>
                      } />
                    )}
                    {skydropxShipmentId && (
                      <Row label="shipment ID" value={
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: S }}>{skydropxShipmentId}</span>
                      } />
                    )}
                    {(order as Record<string, unknown>).label_url && (
                      <div style={{ marginTop: 10 }}>
                        <a
                          href={(order as Record<string, unknown>).label_url as string}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 13, color: '#003a87', fontWeight: 600, textDecoration: 'none' }}
                        >
                          descargar etiqueta PDF ↗
                        </a>
                      </div>
                    )}
                  </>
                )}

                {skydropxEvents.length > 0 && (
                  <div style={{ marginTop: order.tracking_number ? 16 : 0, paddingTop: order.tracking_number ? 16 : 0, borderTop: order.tracking_number ? `1px solid ${B}` : 'none' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                      historial
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...skydropxEvents].reverse().map((ev, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'flex-start' }}>
                          <span style={{
                            flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, marginTop: 1,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            background: ev.type === 'created' ? 'rgba(26,107,53,0.1)' : 'rgba(255,1,0,0.08)',
                            color: ev.type === 'created' ? '#1a6b35' : '#cc0000',
                          }}>
                            {ev.type === 'created' ? 'creada' : 'cancelada'}
                          </span>
                          <div style={{ flex: 1 }}>
                            {ev.tracking && (
                              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#003a87', marginRight: 8 }}>{ev.tracking}</span>
                            )}
                            {ev.carrier && <span style={{ color: M, marginRight: 8 }}>{ev.carrier}</span>}
                            {ev.cost_mxn != null && (
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, marginRight: 8 }}>
                                {ev.cost_mxn.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                              </span>
                            )}
                            <div style={{ fontSize: 11, color: S, marginTop: 2 }}>
                              {new Date(ev.at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          {ev.label_url && (
                            <a href={ev.label_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#003a87', textDecoration: 'none', flexShrink: 0, marginTop: 1 }}>
                              PDF ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </InfoCard>
            )}

            {/* Pago */}
            {order.stripe_payment_id && (
              <InfoCard title="pago">
                <Row label="stripe PI" value={<span style={{ fontFamily: 'monospace', fontSize: 12, color: M }}>{order.stripe_payment_id}</span>} />
              </InfoCard>
            )}

            {/* Historial de cambios */}
            <OrderHistoryCard
              createdAt={order.created_at}
              auditRows={auditRows ?? []}
            />

          </div>

          {/* Right — acciones */}
          <div>
            <OrderActions
              orderId={order.id}
              currentStatus={order.status}
              currentTracking={order.tracking_number ?? null}
              shippingRateId={order.shipping_rate_id ?? null}
              shippingMxn={order.shipping_mxn ?? 0}
              shippingCarrier={order.shipping_carrier ?? null}
              labelUrl={(order as Record<string, unknown>).label_url as string ?? null}
              skydropxShipmentId={skydropxShipmentId}
              initialCustomerName={order.customer_name ?? null}
              initialCustomerEmail={order.customer_email}
              initialCustomerPhone={order.customer_phone ?? null}
              initialNotes={order.notes ?? null}
              initialAddress={addr}
              shipmentReadiness={readiness}
              skydropxEvents={skydropxEvents}
            />
          </div>

        </div>
      </main>
    </AdminShell>
  )
}
