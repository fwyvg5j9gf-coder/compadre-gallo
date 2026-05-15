'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import ZipSelector, { type ZipInfo } from '@/components/ZipSelector'
import type { PackagingType } from '@/lib/supabase'
import type { ShippingRate } from '@/lib/skydropx'
import { getRatesForCheckout, createOrder } from './actions'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

// ── Sección del formulario ─────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="eyebrow">{title}</div>
      {children}
    </div>
  )
}

// ── Confirmación ──────────────────────────────────────────────────────────────
function Confirmation({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: 'var(--space-5)',
      textAlign: 'center', padding: 'var(--space-8) var(--outer-px)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div>
        <h1 style={{ marginBottom: 'var(--space-3)' }}>pedido confirmado</h1>
        <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic', margin: 0, maxWidth: '40ch' }}>
          te llegará la confirmación al correo. gracias compadre.
        </p>
        <p style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 'var(--space-3)' }}>
          # {orderId.slice(0, 8).toUpperCase()}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Link href="/cuenta" className="btn btn-primary btn-lg">ver mis pedidos</Link>
        <Link href="/tienda" className="btn btn-ghost btn-lg" onClick={onClose}>seguir comprando</Link>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CheckoutMerch({
  packaging,
  skydropxEnabled,
  shippingLocalMxn,
  shippingNationalMxn,
  freeThresholdMxn,
}: {
  packaging: PackagingType[]
  skydropxEnabled: boolean
  shippingLocalMxn: number
  shippingNationalMxn: number
  freeThresholdMxn: number
}) {
  const router = useRouter()
  const { items, totalMxn, clearCart } = useCart()

  const [zipInfo, setZipInfo] = useState<ZipInfo | null>(null)
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null)
  const [loadingRates, startRatesTransition] = useTransition()
  const [isPending, startSubmit] = useTransition()
  const [orderId, setOrderId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Packaging: usar el del primer item que tenga uno, o el primero de la tienda
  const packagingTypeId = useMemo(() => {
    const fromCart = items.find(i => i.packagingTypeId)?.packagingTypeId
    return fromCart ?? packaging[0]?.id ?? null
  }, [items, packaging])

  // Cuando cambia el CP → pedir cotización
  useEffect(() => {
    if (!zipInfo) { setRates([]); setSelectedRate(null); return }
    if (!skydropxEnabled || !packagingTypeId) return

    startRatesTransition(async () => {
      const r = await getRatesForCheckout(
        zipInfo.zip, zipInfo.estado, zipInfo.municipio, zipInfo.colonia, packagingTypeId,
      )
      setRates(r)
      setSelectedRate(r[0] ?? null)
    })
  }, [zipInfo, packagingTypeId, skydropxEnabled])

  // Envío: si SkyDropX sin selección → tarifa manual
  const shippingMxn = useMemo(() => {
    if (selectedRate) return Math.round(selectedRate.total_mxn * 100)
    if (!zipInfo) return 0
    // Tarifa manual si SkyDropX no disponible
    if (freeThresholdMxn > 0 && totalMxn >= freeThresholdMxn) return 0
    return shippingNationalMxn
  }, [selectedRate, zipInfo, totalMxn, freeThresholdMxn, shippingNationalMxn])

  const orderTotal = totalMxn + shippingMxn

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (items.length === 0) return
    const fd = new FormData(e.currentTarget)

    setSubmitError(null)
    startSubmit(async () => {
      try {
        const { orderId: id } = await createOrder({
          name: fd.get('name') as string,
          email: fd.get('email') as string,
          phone: fd.get('phone') as string,
          street: fd.get('street') as string,
          zip: zipInfo?.zip ?? '',
          state: zipInfo?.estado ?? '',
          city: zipInfo?.municipio ?? '',
          colonia: zipInfo?.colonia ?? '',
          notes: fd.get('notes') as string,
          shippingRateId: selectedRate?.rate_id ?? null,
          shippingCarrier: selectedRate?.carrier ?? null,
          shippingMxn,
          items,
        })
        clearCart()
        setOrderId(id)
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'error al procesar el pedido')
      }
    })
  }

  if (orderId) {
    return <Confirmation orderId={orderId} onClose={() => router.push('/tienda')} />
  }

  if (items.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: 'var(--space-4)',
        textAlign: 'center', padding: 'var(--space-8) var(--outer-px)',
      }}>
        <h2>tu carrito está vacío</h2>
        <Link href="/tienda" className="btn btn-primary btn-lg">ver la tienda</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: 'var(--space-7) var(--outer-px) var(--space-9)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-7)' }}>
        <Link href="/tienda" style={{ fontSize: 13, color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginBottom: 'var(--space-4)' }}>
          ← tienda
        </Link>
        <h1>checkout</h1>
      </div>

      <div className="checkout-grid">

        {/* ── Formulario ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>

          <Section title="datos de contacto">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="field">
                <label htmlFor="name">nombre completo</label>
                <input id="name" name="name" type="text" required placeholder="tu nombre" />
              </div>
              <div className="field">
                <label htmlFor="phone">teléfono</label>
                <input id="phone" name="phone" type="tel" placeholder="55 1234 5678" />
              </div>
              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label htmlFor="email">correo electrónico</label>
                <input id="email" name="email" type="email" required placeholder="tu@correo.com" />
              </div>
            </div>
          </Section>

          <Section title="dirección de envío">
            <div className="field">
              <label htmlFor="street">calle y número</label>
              <input id="street" name="street" type="text" required placeholder="av. insurgentes 123 int. 4b" />
            </div>
            <ZipSelector
              label="código postal"
              onSelect={info => setZipInfo(info)}
            />
            {zipInfo && (
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', background: 'var(--bg-soft)', borderRadius: 4, padding: '10px 14px' }}>
                {zipInfo.colonia}, {zipInfo.municipio}, {zipInfo.estado}
              </div>
            )}
          </Section>

          {/* Envío */}
          {zipInfo && (
            <Section title="envío">
              {loadingRates ? (
                <p style={{ fontSize: 13, color: 'var(--fg-muted)', fontStyle: 'italic' }}>cotizando opciones de envío…</p>
              ) : rates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rates.map(r => (
                    <label key={r.rate_id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 4, cursor: 'pointer',
                      border: `1px solid ${selectedRate?.rate_id === r.rate_id ? 'var(--fg)' : 'var(--border)'}`,
                      background: selectedRate?.rate_id === r.rate_id ? 'var(--bg-soft)' : '#fff',
                      transition: 'border-color 120ms, background 120ms',
                    }}>
                      <input
                        type="radio" name="shipping_rate" value={r.rate_id}
                        checked={selectedRate?.rate_id === r.rate_id}
                        onChange={() => setSelectedRate(r)}
                        style={{ accentColor: 'var(--gallo-red)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{r.carrier}</span>
                        {r.service_level && <span style={{ fontSize: 13, color: 'var(--fg-muted)', marginLeft: 8 }}>{r.service_level}</span>}
                        {r.days && <span style={{ fontSize: 12, color: 'var(--fg-subtle)', marginLeft: 8 }}>{r.days} días</span>}
                      </div>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 15 }}>
                        {fmt(Math.round(r.total_mxn * 100))}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 4 }}>
                  <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>envío estándar</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 15 }}>
                    {shippingMxn === 0 ? 'gratis' : fmt(shippingMxn)}
                  </span>
                </div>
              )}
            </Section>
          )}

          <Section title="notas (opcional)">
            <div className="field">
              <textarea
                name="notes" rows={3}
                placeholder="indicaciones de entrega, referencias, etc."
                style={{ resize: 'vertical' }}
              />
            </div>
          </Section>

          {/* Pago placeholder */}
          <Section title="pago">
            <div style={{
              padding: '20px', border: '1px dashed var(--border)', borderRadius: 4,
              background: 'var(--bg-soft)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
                integración de pago próximamente — tu pedido quedará en estado pendiente.
              </p>
            </div>
          </Section>

          {submitError && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,1,0,0.06)', border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4 }}>
              <p style={{ fontSize: 13, color: 'var(--gallo-red)', margin: 0 }}>{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!zipInfo || isPending}
            className="btn btn-primary btn-lg"
            style={{ alignSelf: 'flex-start' }}
          >
            {isPending ? 'procesando…' : !zipInfo ? 'ingresa tu dirección' : `confirmar pedido · ${fmt(orderTotal)}`}
          </button>
        </form>

        {/* ── Resumen ── */}
        <div>
          <div className="order-summary" style={{ position: 'sticky', top: 80 }}>
            <div className="order-summary-head">tu pedido</div>
            <div className="order-summary-body">
              {items.map(item => (
                <div key={`${item.productId}-${item.size}`} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 4, overflow: 'hidden',
                    background: '#0a0a0a', flexShrink: 0, border: '1px solid var(--border)',
                  }}>
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{item.name}</div>
                    {item.size !== 'única' && (
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>talla {item.size}</div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>× {item.qty}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {fmt(item.price_mxn * item.qty)}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="order-row">
                  <span style={{ color: 'var(--fg-muted)' }}>subtotal</span>
                  <span>{fmt(totalMxn)}</span>
                </div>
                <div className="order-row">
                  <span style={{ color: 'var(--fg-muted)' }}>envío</span>
                  <span>
                    {!zipInfo
                      ? '—'
                      : shippingMxn === 0
                        ? 'gratis'
                        : fmt(shippingMxn)}
                  </span>
                </div>
                <div className="order-row order-total">
                  <span>total</span>
                  <span>{fmt(orderTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
