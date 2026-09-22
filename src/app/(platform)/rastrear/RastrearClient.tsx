'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Item = { nombre: string; qty: number; precioMxn: number }

type Resultado = {
  folio: string
  status: string
  createdAt: string
  nombre: string
  ciudad: string | null
  estado: string | null
  subtotalMxn: number
  shippingMxn: number
  discountMxn: number
  totalMxn: number
  carrier: string | null
  guia: string | null
  items: Item[]
}

// Los cuatro estados que el cliente puede ver, en el orden en que ocurren.
// 'cancelled' y 'refunded' salen del riel y se muestran aparte.
const RIEL = ['paid', 'shipped', 'delivered'] as const

const ESTADO: Record<string, { label: string; texto: string; color: string }> = {
  paid:      { label: 'pagado',      texto: 'tu pago quedó confirmado. ya estamos preparando tu pedido.', color: '#003a87' },
  shipped:   { label: 'enviado',     texto: 'tu pedido ya va en camino.',                                  color: '#00c4df' },
  delivered: { label: 'entregado',   texto: 'tu pedido fue entregado. gracias compadre.',                  color: '#1d6f42' },
  cancelled: { label: 'cancelado',   texto: 'este pedido fue cancelado.',                                  color: '#ff0100' },
  refunded:  { label: 'reembolsado', texto: 'este pedido fue reembolsado.',                                color: '#ff0100' },
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Riel({ status }: { status: string }) {
  if (status === 'cancelled' || status === 'refunded') return null
  const actual = RIEL.indexOf(status as (typeof RIEL)[number])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, margin: 'var(--space-5) 0' }}>
      {RIEL.map((paso, i) => {
        const hecho = i <= actual
        return (
          <div key={paso} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                aria-hidden="true"
                style={{
                  width: 14, height: 14, borderRadius: '50%', flex: 'none',
                  background: hecho ? ESTADO[paso].color : 'transparent',
                  boxShadow: `inset 0 0 0 2px ${hecho ? ESTADO[paso].color : '#d8d5cd'}`,
                }}
              />
              {i < RIEL.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < actual ? ESTADO[paso].color : '#e8e7e1' }} />
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: hecho ? 600 : 400, color: hecho ? '#0a0a0a' : 'var(--fg-muted)' }}>
              {ESTADO[paso].label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RastrearForm() {
  const params = useSearchParams()
  const [folio, setFolio] = useState(params.get('folio') ?? '')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    if (!folio.trim() || !email.trim()) return
    setLoading(true); setError(''); setResultado(null)
    try {
      const qs = new URLSearchParams({ folio: folio.trim(), email: email.trim() })
      const r = await fetch(`/api/rastrear?${qs}`)
      const d = await r.json()
      if (d.error) setError(d.error)
      else setResultado(d as Resultado)
    } catch {
      setError('no se pudo conectar. intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const info = resultado ? ESTADO[resultado.status] : null

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: 'var(--space-8) var(--outer-px)' }}>
      <h1 style={{ marginBottom: 'var(--space-3)' }}>rastrear pedido</h1>
      <p style={{ color: 'var(--fg-muted)', marginBottom: 'var(--space-6)', maxWidth: '46ch' }}>
        pon el número de tu pedido y el correo con el que lo hiciste. los dos vienen en tu correo de confirmación.
      </p>

      <form onSubmit={buscar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="folio" className="eyebrow">número de pedido</label>
          <input
            id="folio" name="folio" value={folio} onChange={e => setFolio(e.target.value)}
            placeholder="GALLO-00017" autoComplete="off" required
            style={{ fontFamily: 'monospace' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="email" className="eyebrow">correo</label>
          <input
            id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com" autoComplete="email" required
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }}>
          {loading ? 'buscando…' : 'buscar pedido'}
        </button>
      </form>

      {error && (
        <div role="status" style={{ marginTop: 'var(--space-5)', padding: '12px 16px', background: 'rgba(255,1,0,0.06)', border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4 }}>
          <p style={{ fontSize: 14, color: 'var(--gallo-red)', margin: 0 }}>{error}</p>
        </div>
      )}

      {resultado && info && (
        <div style={{ marginTop: 'var(--space-7)', borderTop: '1px solid #e8e7e1', paddingTop: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16 }}>{resultado.folio}</span>
            <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{fecha(resultado.createdAt)}</span>
          </div>

          <Riel status={resultado.status} />

          <p style={{ fontSize: 15, color: info.color, fontWeight: 600, margin: '0 0 var(--space-5)' }}>
            {info.texto}
          </p>

          {resultado.guia && (
            <div style={{ background: '#f7f5f0', borderRadius: 4, padding: '14px 16px', marginBottom: 'var(--space-5)' }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>guía {resultado.carrier ?? ''}</div>
              <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}>{resultado.guia}</span>
            </div>
          )}

          <div className="eyebrow" style={{ marginBottom: 8 }}>lo que pediste</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-5)' }}>
            {resultado.items.map((it, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid #e8e7e1', fontSize: 14 }}>
                <span>{it.nombre} <span style={{ color: 'var(--fg-muted)' }}>× {it.qty}</span></span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(it.precioMxn * it.qty)}</span>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--fg-muted)' }}>subtotal</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(resultado.subtotalMxn)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--fg-muted)' }}>envío</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{resultado.shippingMxn === 0 ? 'gratis' : fmt(resultado.shippingMxn)}</span>
            </div>
            {resultado.discountMxn > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1d6f42' }}>
                <span>descuento</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>−{fmt(resultado.discountMxn)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid #0a0a0a', paddingTop: 8, marginTop: 2 }}>
              <span>total</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(resultado.totalMxn)}</span>
            </div>
          </div>

          {(resultado.ciudad || resultado.estado) && (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 'var(--space-4)' }}>
              envío a {[resultado.ciudad, resultado.estado].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      )}

      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 'var(--space-7)' }}>
        ¿algo no cuadra? escríbenos a{' '}
        <a href="mailto:hola@compadregallo.com">hola@compadregallo.com</a> o{' '}
        <Link href="/cuenta">entra a tu cuenta</Link> para ver todos tus pedidos.
      </p>
    </div>
  )
}

export default function RastrearClient() {
  return (
    <Suspense fallback={null}>
      <RastrearForm />
    </Suspense>
  )
}
