'use client'

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCart } from '@/context/CartContext'
import ZipSelector, { type ZipInfo } from '@/components/ZipSelector'
import type { PackagingType } from '@/lib/supabase'
import type { ShippingRate } from '@/lib/skydropx'
import { getRatesForCheckout, createOrder } from './actions'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const TEST_MODE = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '').startsWith('pk_test_')

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function folio(n: number) {
  return `GALLO-${String(n).padStart(5, '0')}`
}

type Step = 'shipping' | 'payment' | 'done'

type SavedData = {
  name: string; email: string; phone: string
  street: string; notes: string
  zipInfo: ZipInfo
  shippingRateId: string | null
  shippingCarrier: string | null
  shippingMxn: number
  saveAddress: boolean
}

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
function Confirmation({ orderId, folioNumber }: { orderId: string; folioNumber: number }) {
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
        <p style={{ fontSize: 15, fontWeight: 700, color: '#003a87', marginTop: 'var(--space-3)', fontFamily: 'monospace' }}>
          {folio(folioNumber)}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Link href="/cuenta" className="btn btn-primary btn-lg">ver mis pedidos</Link>
        <Link href="/tienda" className="btn btn-ghost btn-lg">seguir comprando</Link>
      </div>
    </div>
  )
}

// ── Formulario de pago (Stripe) ────────────────────────────────────────────────
function PaymentForm({
  orderTotal,
  onSuccess,
  onBack,
}: {
  orderTotal: number
  onSuccess: (piId: string) => void
  onBack: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsPaying(true)
    setError(null)

    const { error: submitErr } = await elements.submit()
    if (submitErr) { setError(submitErr.message ?? 'error'); setIsPaying(false); return }

    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/carrito/checkout` },
      redirect: 'if_required',
    })

    if (confirmErr) {
      setError(confirmErr.message ?? 'error al procesar el pago')
      setIsPaying(false)
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    } else {
      setError('el pago no se completó. intenta de nuevo.')
      setIsPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <button
        type="button"
        onClick={onBack}
        style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ← volver a datos de envío
      </button>

      <Section title="datos de pago">
        <PaymentElement options={{ layout: 'tabs' }} />
      </Section>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,1,0,0.06)', border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4 }}>
          <p style={{ fontSize: 13, color: 'var(--gallo-red)', margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isPaying}
        className="btn btn-primary btn-lg"
        style={{ alignSelf: 'flex-start' }}
      >
        {isPaying ? 'procesando…' : `pagar ${fmt(orderTotal)}`}
      </button>
    </form>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CheckoutMerch({
  packaging,
  skydropxEnabled,
  shippingLocalMxn,
  shippingNationalMxn,
  freeThresholdMxn,
  savedAddress,
  userEmail,
}: {
  packaging: PackagingType[]
  skydropxEnabled: boolean
  shippingLocalMxn: number
  shippingNationalMxn: number
  freeThresholdMxn: number
  savedAddress?: Record<string, string> | null
  userEmail?: string | null
}) {
  const { items, totalMxn, clearCart } = useCart()

  const [step, setStep] = useState<Step>('shipping')
  const [savedData, setSavedData] = useState<SavedData | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [pendingPiId, setPendingPiId] = useState<string | null>(null)

  // Controlled form fields
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState(userEmail ?? '')
  const [formPhone, setFormPhone] = useState('')
  const [formStreet, setFormStreet] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saveAddr, setSaveAddr] = useState(false)
  const [zipKey, setZipKey] = useState(0)

  const [zipInfo, setZipInfo] = useState<ZipInfo | null>(null)
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null)
  const [loadingRates, startRatesTransition] = useTransition()
  const [isGoingToPayment, startGoToPayment] = useTransition()
  const [isCreatingOrder, startCreateOrder] = useTransition()
  const [orderResult, setOrderResult] = useState<{ orderId: string; folioNumber: number } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const packagingTypeId = useMemo(() => {
    const fromCart = items.find(i => i.packagingTypeId)?.packagingTypeId
    return fromCart ?? packaging[0]?.id ?? null
  }, [items, packaging])

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

  const shippingMxn = useMemo(() => {
    if (selectedRate) return Math.round(selectedRate.total_mxn * 100)
    if (!zipInfo) return 0
    if (freeThresholdMxn > 0 && totalMxn >= freeThresholdMxn) return 0
    return shippingNationalMxn
  }, [selectedRate, zipInfo, totalMxn, freeThresholdMxn, shippingNationalMxn])

  const orderTotal = totalMxn + shippingMxn

  function applyAddress() {
    if (!savedAddress) return
    setFormName(savedAddress.name ?? '')
    setFormPhone(savedAddress.phone ?? '')
    setFormStreet(savedAddress.street ?? '')
    if (savedAddress.zip && savedAddress.state) {
      const info: ZipInfo = {
        zip: savedAddress.zip,
        colonia: savedAddress.colonia ?? '',
        municipio: savedAddress.city ?? '',
        estado: savedAddress.state,
      }
      setZipInfo(info)
      setZipKey(k => k + 1)
    }
  }

  // Ir al pago → crear payment intent
  function handleGoToPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (items.length === 0 || !zipInfo) return

    const name  = formName.trim()
    const email = formEmail.trim()
    const phone = formPhone.trim()
    const street = formStreet.trim()

    // Client-side validation
    if (name.length < 2) { setSubmitError('ingresa tu nombre completo'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setSubmitError('correo electrónico inválido'); return }
    if (!street) { setSubmitError('ingresa tu dirección'); return }

    const data: SavedData = {
      name, email, phone, street,
      notes: formNotes.trim(),
      zipInfo,
      shippingRateId: selectedRate?.rate_id ?? null,
      shippingCarrier: selectedRate?.carrier ?? null,
      shippingMxn,
      saveAddress: saveAddr,
    }
    setSavedData(data)
    setSubmitError(null)

    startGoToPayment(async () => {
      try {
        const res = await fetch('/api/stripe/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Send item IDs so server calculates real prices
          body: JSON.stringify({
            items: items.map(i => ({ productId: i.productId, qty: i.qty })),
            shippingMxn: data.shippingMxn,
          }),
        })
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: 'error desconocido' }))
          setSubmitError(error ?? 'error al iniciar el pago')
          return
        }
        const { clientSecret: cs, paymentIntentId: piId } = await res.json()
        setClientSecret(cs)
        setPendingPiId(piId)
        setStep('payment')
      } catch {
        setSubmitError('error al iniciar el pago. intenta de nuevo.')
      }
    })
  }

  // Pago exitoso → crear orden
  const handlePaymentSuccess = useCallback((piId: string) => {
    if (!savedData) return
    startCreateOrder(async () => {
      try {
        const { orderId, folioNumber } = await createOrder({
          name: savedData.name,
          email: savedData.email,
          phone: savedData.phone,
          street: savedData.street,
          zip: savedData.zipInfo.zip,
          state: savedData.zipInfo.estado,
          city: savedData.zipInfo.municipio,
          colonia: savedData.zipInfo.colonia,
          notes: savedData.notes,
          shippingRateId: savedData.shippingRateId,
          shippingCarrier: savedData.shippingCarrier,
          shippingMxn: savedData.shippingMxn,
          stripePaymentId: piId,
          items,
          saveAddressForUser: savedData.saveAddress,
        })
        clearCart()
        setOrderResult({ orderId, folioNumber })
        setStep('done')
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'error al registrar el pedido')
        setStep('shipping')
      }
    })
  }, [savedData, items, clearCart])

  if (step === 'done' && orderResult) {
    return <Confirmation orderId={orderResult.orderId} folioNumber={orderResult.folioNumber} />
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

  // Resumen sidebar (compartido entre pasos)
  const Summary = (
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
                {!zipInfo ? '—' : shippingMxn === 0 ? 'gratis' : fmt(shippingMxn)}
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
  )

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: 'var(--space-7) var(--outer-px) var(--space-9)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-7)' }}>
        <Link href="/tienda" style={{ fontSize: 13, color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginBottom: 'var(--space-4)' }}>
          ← tienda
        </Link>
        <h1>checkout</h1>
        {TEST_MODE && (
          <div style={{
            marginTop: 'var(--space-4)', padding: '10px 16px', borderRadius: 4,
            background: '#ffe200', color: '#0a0a0a',
            fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span>MODO PRUEBA</span>
            <span style={{ fontWeight: 400 }}>
              tarjeta: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>4242 4242 4242 4242</span> · cualquier fecha futura · cualquier CVC
            </span>
          </div>
        )}
      </div>

      <div className="checkout-grid">

        {/* ── Formulario de envío ── */}
        {step === 'shipping' && (
          <form onSubmit={handleGoToPayment} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-7)' }}>

            {/* Banner dirección guardada */}
            {savedAddress?.street && savedAddress?.zip && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 4,
                background: 'rgba(0,58,135,0.05)', border: '1px solid rgba(0,58,135,0.15)',
                gap: 'var(--space-4)', flexWrap: 'wrap',
              }}>
                <div style={{ fontSize: 13, color: '#003a87' }}>
                  <span style={{ fontWeight: 700 }}>dirección guardada:</span>{' '}
                  {savedAddress.street}, {savedAddress.colonia}, {savedAddress.city}
                </div>
                <button type="button" onClick={applyAddress} className="btn btn-sm" style={{
                  background: '#003a87', color: '#fff', border: 'none', flexShrink: 0,
                }}>
                  usar esta dirección
                </button>
              </div>
            )}

            <Section title="datos de contacto">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="field">
                  <label htmlFor="name">nombre completo</label>
                  <input id="name" name="name" type="text" required placeholder="tu nombre"
                    value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="phone">teléfono</label>
                  <input id="phone" name="phone" type="tel" placeholder="55 1234 5678"
                    value={formPhone} onChange={e => setFormPhone(e.target.value)} />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label htmlFor="email">correo electrónico</label>
                  <input id="email" name="email" type="email" required placeholder="tu@correo.com"
                    value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                </div>
              </div>
            </Section>

            <Section title="dirección de envío">
              <div className="field">
                <label htmlFor="street">calle y número</label>
                <input id="street" name="street" type="text" required placeholder="av. insurgentes 123 int. 4b"
                  value={formStreet} onChange={e => setFormStreet(e.target.value)} />
              </div>
              <ZipSelector
                key={zipKey}
                label="código postal"
                onSelect={info => setZipInfo(info)}
                defaultZip={zipKey > 0 ? (savedAddress?.zip ?? '') : ''}
                defaultState={zipKey > 0 ? (savedAddress?.state ?? '') : ''}
                defaultCity={zipKey > 0 ? (savedAddress?.city ?? '') : ''}
                defaultColonia={zipKey > 0 ? (savedAddress?.colonia ?? '') : ''}
              />
              {zipInfo && (
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', background: 'var(--bg-soft)', borderRadius: 4, padding: '10px 14px' }}>
                  {zipInfo.colonia}, {zipInfo.municipio}, {zipInfo.estado}
                </div>
              )}
            </Section>

            {zipInfo && (
              <Section title="envío">
                {loadingRates ? (
                  <p style={{ fontSize: 13, color: 'var(--fg-muted)', fontStyle: 'italic' }}>cotizando opciones de envío…</p>
                ) : rates.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {rates.map(r => (
                      <label key={r.rate_id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 4, cursor: 'pointer',
                        border: `1px solid ${selectedRate?.rate_id === r.rate_id ? 'var(--fg)' : 'var(--border)'}`,
                        background: selectedRate?.rate_id === r.rate_id ? 'var(--bg-soft)' : '#fff',
                        transition: 'border-color 120ms, background 120ms',
                      }}>
                        <input type="radio" name="shipping_rate" value={r.rate_id}
                          checked={selectedRate?.rate_id === r.rate_id}
                          onChange={() => setSelectedRate(r)}
                          style={{ accentColor: 'var(--gallo-red)' }} />
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
                <textarea name="notes" rows={3} placeholder="indicaciones de entrega, referencias, etc."
                  style={{ resize: 'vertical' }} value={formNotes} onChange={e => setFormNotes(e.target.value)} />
              </div>
            </Section>

            {userEmail && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveAddr}
                  onChange={e => setSaveAddr(e.target.checked)}
                  style={{ accentColor: 'var(--gallo-red)', width: 16, height: 16 }}
                />
                guardar esta dirección para mis próximos pedidos
              </label>
            )}

            {submitError && (
              <div style={{ padding: '12px 16px', background: 'rgba(255,1,0,0.06)', border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4 }}>
                <p style={{ fontSize: 13, color: 'var(--gallo-red)', margin: 0 }}>{submitError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!zipInfo || isGoingToPayment}
              className="btn btn-primary btn-lg"
              style={{ alignSelf: 'flex-start' }}
            >
              {isGoingToPayment ? 'iniciando…' : !zipInfo ? 'ingresa tu dirección' : `continuar al pago · ${fmt(orderTotal)}`}
            </button>
          </form>
        )}

        {/* ── Pago con Stripe ── */}
        {step === 'payment' && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'flat',
                variables: {
                  colorPrimary: '#0a0a0a',
                  colorBackground: '#ffffff',
                  colorText: '#0a0a0a',
                  colorDanger: '#ff0100',
                  fontFamily: 'Inter, sans-serif',
                  borderRadius: '4px',
                  focusBoxShadow: '0 0 0 3px rgba(255,226,0,0.35)',
                },
              },
            }}
          >
            {isCreatingOrder ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-8) 0', color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: 14 }}>
                <span>registrando pedido…</span>
              </div>
            ) : (
              <PaymentForm
                orderTotal={orderTotal}
                onSuccess={handlePaymentSuccess}
                onBack={() => setStep('shipping')}
              />
            )}
          </Elements>
        )}

        {Summary}
      </div>
    </div>
  )
}
