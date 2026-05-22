'use client'

import { useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from '@stripe/react-stripe-js/checkout'
import { createTicketOrder } from './actions'

let _stripePromise: ReturnType<typeof loadStripe> | null = null
let _stripeKey = ''
function getStripePromise(key: string) {
  if (key !== _stripeKey) { _stripeKey = key; _stripePromise = loadStripe(key) }
  return _stripePromise!
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

type ShowData = {
  id: string; venue: string; city: string; date: string
  price_mxn: number | null; capacity: number | null; is_published: boolean
}
type ArtistData = {
  id: string; name: string; slug: string
  bg: string; stripe: string; fg: string; image_url: string | null
}

// ── Confirmation ──────────────────────────────────────────────────────────────
function Confirmation({ folioCode, artistName, artistSlug }: { folioCode: string; artistName: string; artistSlug: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', gap: 'var(--space-5)',
      textAlign: 'center', padding: 'var(--space-8) var(--outer-px)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: '#0a0a0a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div>
        <h1 style={{ marginBottom: 'var(--space-3)' }}>listo, compadre.</h1>
        <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic', margin: '0 0 var(--space-3)', maxWidth: '40ch' }}>
          tus boletos llegan al correo en minutos. nos vemos en el show.
        </p>
        <div style={{
          display: 'inline-block', padding: '10px 20px', background: 'var(--bg-soft)',
          border: '1px solid var(--border)', borderRadius: 4,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            folio
          </div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 22, color: '#003a87', letterSpacing: '0.04em' }}>
            {folioCode}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/cuenta" className="btn btn-primary btn-lg">ver mis boletos</Link>
        <Link href={`/artista/${artistSlug}`} className="btn btn-ghost btn-lg">volver a {artistName}</Link>
      </div>
    </div>
  )
}

// ── PaymentForm — runs inside CheckoutElementsProvider ────────────────────────
function PaymentForm({
  orderTotal, onSuccess, onBack,
}: {
  orderTotal: number
  onSuccess: () => void
  onBack: () => void
}) {
  const result = useCheckoutElements()
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (result.type === 'loading') {
    return (
      <div style={{ padding: 'var(--space-8) 0', color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: 14 }}>
        cargando formulario de pago…
      </div>
    )
  }
  if (result.type === 'error') {
    return (
      <div style={{ padding: '12px 16px', background: 'rgba(255,1,0,0.06)', border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4 }}>
        <p style={{ fontSize: 13, color: 'var(--gallo-red)', margin: 0 }}>error al cargar el pago: {result.error.message}</p>
      </div>
    )
  }

  const { checkout } = result

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setIsPaying(true)
    setError(null)

    const result = await checkout.confirm({ redirect: 'if_required' })
    if (result.type === 'error') {
      setError(result.error.message ?? 'error al procesar el pago')
      setIsPaying(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <button
        type="button" onClick={onBack}
        style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ← volver
      </button>

      <div>
        <div className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>datos de pago</div>
        <PaymentElement />
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,1,0,0.06)', border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4 }}>
          <p style={{ fontSize: 13, color: 'var(--gallo-red)', margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPaying}
        className="btn btn-primary btn-lg"
        style={{ alignSelf: 'flex-start' }}
      >
        {isPaying ? 'procesando…' : `pagar ${fmt(orderTotal)}`}
      </button>
    </form>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CheckoutClient({
  artist, shows, stripePublishableKey,
}: {
  artist: ArtistData
  shows: ShowData[]
  stripePublishableKey: string
}) {
  const testMode = stripePublishableKey.startsWith('pk_test_')
  const stripePromise = getStripePromise(stripePublishableKey)

  const [step, setStep] = useState<'info' | 'payment' | 'done'>('info')
  const [selectedShowId, setSelectedShowId] = useState(shows[0]?.id ?? '')
  const [qty, setQty] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [folioCode, setFolioCode] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isGoingToPayment, startGoToPayment] = useTransition()
  const [isCreatingOrder, startCreateOrder] = useTransition()

  const selectedShow = shows.find(s => s.id === selectedShowId) ?? shows[0]
  const maxQty = Math.min(selectedShow?.capacity ?? 4, 4)
  const unitPrice = selectedShow?.price_mxn ?? 0
  const orderTotal = unitPrice * qty

  function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) { setSubmitError('ingresa tu nombre completo'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setSubmitError('correo electrónico inválido'); return }
    setSubmitError(null)

    startGoToPayment(async () => {
      try {
        const res = await fetch('/api/stripe/create-ticket-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showId: selectedShowId, qty, slug: artist.slug }),
        })
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: 'error desconocido' }))
          setSubmitError(error ?? 'error al iniciar el pago')
          return
        }
        const { clientSecret: cs, sessionId: sid } = await res.json()
        setClientSecret(cs)
        setSessionId(sid)
        setStep('payment')
      } catch {
        setSubmitError('error de red. intenta de nuevo.')
      }
    })
  }

  const handlePaymentSuccess = useCallback(() => {
    if (!sessionId) return
    startCreateOrder(async () => {
      const { folioCode: fc, error } = await createTicketOrder({
        checkoutSessionId: sessionId,
        showId: selectedShowId,
        qty,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      })
      if (error || !fc) {
        setSubmitError(error ?? 'error al registrar el boleto')
        setStep('info')
        return
      }
      setFolioCode(fc)
      setStep('done')
    })
  }, [sessionId, selectedShowId, qty, name, email, phone])

  if (step === 'done' && folioCode) {
    return <Confirmation folioCode={folioCode} artistName={artist.name} artistSlug={artist.slug} />
  }

  // Sidebar compartido
  const Summary = (
    <div>
      <div className="order-summary" style={{ position: 'sticky', top: 80 }}>
        <div className="order-summary-head">resumen</div>
        <div className="order-summary-body">
          <div style={{
            width: '100%', aspectRatio: '16/9', borderRadius: 'var(--r-sm)',
            background: artist.bg, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: artist.stripe }} />
            {artist.image_url && (
              <img src={artist.image_url} alt={artist.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
            )}
            <div style={{
              position: 'absolute', bottom: 12, left: 20,
              color: '#fff', fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: 22, letterSpacing: 'var(--track-snug)',
              textTransform: 'lowercase', textShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}>
              {artist.name}
            </div>
          </div>

          {selectedShow && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedShow.venue}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{selectedShow.city} · {fmtDate(selectedShow.date)}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="order-row">
              <span style={{ color: 'var(--fg-muted)' }}>precio unitario</span>
              <span>{fmt(unitPrice)}</span>
            </div>
            <div className="order-row">
              <span style={{ color: 'var(--fg-muted)' }}>cantidad</span>
              <span>× {qty}</span>
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
      <div style={{ marginBottom: 'var(--space-7)' }}>
        <Link href={`/artista/${artist.slug}`} style={{ fontSize: 13, color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginBottom: 'var(--space-4)' }}>
          ← {artist.name}
        </Link>
        <h1>checkout</h1>
        {testMode && (
          <div style={{
            marginTop: 'var(--space-4)', padding: '10px 16px', borderRadius: 4,
            background: '#ffe200', color: '#0a0a0a', fontSize: 13, fontWeight: 700,
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

        {/* ── Paso 1: info ── */}
        {step === 'info' && (
          <form onSubmit={handleInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

            {shows.length > 1 && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>show</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {shows.map(s => (
                    <label key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      borderRadius: 4, cursor: 'pointer',
                      border: `1px solid ${selectedShowId === s.id ? 'var(--fg)' : 'var(--border)'}`,
                      background: selectedShowId === s.id ? 'var(--bg-soft)' : '#fff',
                      transition: 'border-color 120ms, background 120ms',
                    }}>
                      <input type="radio" name="show" value={s.id}
                        checked={selectedShowId === s.id}
                        onChange={() => setSelectedShowId(s.id)}
                        style={{ accentColor: 'var(--gallo-red)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.venue}</div>
                        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{s.city} · {fmtDate(s.date)}</div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>
                        {fmt(s.price_mxn ?? 0)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>boletos</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span style={{ fontWeight: 700, fontSize: 20, minWidth: 32, textAlign: 'center' }}>{qty}</span>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => setQty(q => Math.min(maxQty, q + 1))}>+</button>
                <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>máx. {maxQty} por persona</span>
              </div>
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>datos del comprador</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label htmlFor="ck-name">nombre completo</label>
                  <input id="ck-name" type="text" required placeholder="tu nombre"
                    value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label htmlFor="ck-email">correo electrónico</label>
                  <input id="ck-email" type="email" required placeholder="tu@correo.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label htmlFor="ck-phone">teléfono (opcional)</label>
                  <input id="ck-phone" type="tel" placeholder="55 1234 5678"
                    value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
            </div>

            {submitError && (
              <div style={{ padding: '12px 16px', background: 'rgba(255,1,0,0.06)', border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4 }}>
                <p style={{ fontSize: 13, color: 'var(--gallo-red)', margin: 0 }}>{submitError}</p>
              </div>
            )}

            <button type="submit" disabled={isGoingToPayment} className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }}>
              {isGoingToPayment ? 'iniciando…' : `continuar al pago · ${fmt(orderTotal)}`}
            </button>
          </form>
        )}

        {/* ── Paso 2: pago ── */}
        {step === 'payment' && clientSecret && (
          isCreatingOrder ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-8) 0', color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: 14 }}>
              registrando boleto…
            </div>
          ) : (
            <CheckoutElementsProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
              <PaymentForm
                orderTotal={orderTotal}
                onSuccess={handlePaymentSuccess}
                onBack={() => setStep('info')}
              />
            </CheckoutElementsProvider>
          )
        )}

        {Summary}
      </div>
    </div>
  )
}
