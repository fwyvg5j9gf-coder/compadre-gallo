'use client'

import { useState, useTransition } from 'react'
import { createDiscountCode, toggleDiscountCode, deleteDiscountCode } from './actions'
import type { DiscountCode } from './actions'
import { useRouter } from 'next/navigation'

const B = '#e8e7e1', M = '#6b6a64', S = '#9a9994'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

function fmtValue(code: DiscountCode) {
  return code.type === 'percent' ? `${code.value}%` : fmt(code.value)
}

function relative(date: string) {
  const d = new Date(date)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── New code form ─────────────────────────────────────────────────────────────
function NewCodeForm({ onClose }: { onClose: () => void }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    start(async () => {
      try {
        await createDiscountCode(new FormData(e.currentTarget))
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#fff', border: `1px solid ${B}`, borderRadius: 8,
      padding: 24, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a', marginBottom: 4 }}>nuevo código</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
          código
          <input name="code" required placeholder="GALLO20" style={{ height: 36, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 14, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
          tipo
          <select name="type" value={type} onChange={e => setType(e.target.value as 'percent' | 'fixed')} style={{ height: 36, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 13 }}>
            <option value="percent">porcentaje (%)</option>
            <option value="fixed">monto fijo (MXN)</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
          valor {type === 'percent' ? '(%)' : '(pesos)'}
          <input name="value" type="number" required min="1" max={type === 'percent' ? 100 : undefined} placeholder={type === 'percent' ? '20' : '100'} style={{ height: 36, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 14 }} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
          mínimo de compra (pesos)
          <input name="min_order_mxn" type="number" min="0" defaultValue="0" placeholder="0" style={{ height: 36, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 14 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
          usos máximos (vacío = ilimitado)
          <input name="max_uses" type="number" min="1" placeholder="ilimitado" style={{ height: 36, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 14 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: M }}>
          expira
          <input name="expires_at" type="date" style={{ height: 36, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 13 }} />
        </label>
      </div>

      {error && <div style={{ fontSize: 12, color: '#cc0000', fontWeight: 600 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={pending} className="adm-btn-primary" style={{ height: 34, padding: '0 18px', fontSize: 13 }}>
          {pending ? 'creando…' : 'crear código'}
        </button>
        <button type="button" onClick={onClose} className="adm-btn-secondary" style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
          cancelar
        </button>
      </div>
    </form>
  )
}

// ── Code row ──────────────────────────────────────────────────────────────────
function CodeRow({ code }: { code: DiscountCode }) {
  const [pending, start] = useTransition()
  const [confirmDel, setConfirmDel] = useState(false)
  const router = useRouter()
  const isExpired = code.expires_at ? new Date(code.expires_at) < new Date() : false
  const isExhausted = code.max_uses !== null && code.uses_count >= code.max_uses

  const statusColor = !code.active || isExpired || isExhausted ? S : '#1a6b35'
  const statusLabel = !code.active ? 'inactivo' : isExpired ? 'expirado' : isExhausted ? 'agotado' : 'activo'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '180px 90px 90px 1fr 120px 100px 120px',
      gap: 12, alignItems: 'center', padding: '13px 20px',
      borderBottom: `1px solid ${B}`, background: '#fff',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#0a0a0a', letterSpacing: '0.04em' }}>
        {code.code}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>
        {fmtValue(code)}
      </span>
      <span style={{ fontSize: 12, color: M }}>
        {code.min_order_mxn > 0 ? `mín. ${fmt(code.min_order_mxn * 100)}` : 'sin mínimo'}
      </span>
      <div style={{ fontSize: 12, color: M }}>
        {code.uses_count} uso{code.uses_count !== 1 ? 's' : ''}
        {code.max_uses !== null ? ` / ${code.max_uses}` : ' / ∞'}
      </div>
      <span style={{ fontSize: 12, color: M }}>
        {code.expires_at ? relative(code.expires_at) : 'sin expiración'}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {statusLabel}
      </span>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          onClick={() => start(async () => { await toggleDiscountCode(code.id, !code.active); router.refresh() })}
          disabled={pending}
          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: `1px solid ${B}`, background: '#fff', cursor: 'pointer', color: M, transition: 'background 100ms' }}
        >
          {code.active ? 'pausar' : 'activar'}
        </button>
        {confirmDel ? (
          <>
            <button
              onClick={() => start(async () => { await deleteDiscountCode(code.id); router.refresh() })}
              disabled={pending}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: 'none', background: '#cc0000', cursor: 'pointer', color: '#fff' }}
            >
              confirmar
            </button>
            <button onClick={() => setConfirmDel(false)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: `1px solid ${B}`, background: '#fff', cursor: 'pointer', color: M }}>
              no
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: `1px solid rgba(204,0,0,0.25)`, background: '#fff', cursor: 'pointer', color: '#cc0000' }}>
            eliminar
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DescuentosClient({ codes }: { codes: DiscountCode[] }) {
  const [adding, setAdding] = useState(false)
  const active   = codes.filter(c => c.active && !(c.expires_at && new Date(c.expires_at) < new Date()) && !(c.max_uses !== null && c.uses_count >= c.max_uses)).length
  const totalUses = codes.reduce((s, c) => s + c.uses_count, 0)

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 28px 72px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: '#0a0a0a', textTransform: 'lowercase', marginBottom: 4 }}>
            descuentos
          </h1>
          <p style={{ fontSize: 13, color: M, margin: 0 }}>
            {active} código{active !== 1 ? 's' : ''} activo{active !== 1 ? 's' : ''} · {totalUses} uso{totalUses !== 1 ? 's' : ''} en total
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="adm-btn-primary" style={{ height: 36, padding: '0 18px', fontSize: 13 }}>
            + nuevo código
          </button>
        )}
      </div>

      {adding && <NewCodeForm onClose={() => setAdding(false)} />}

      <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 90px 90px 1fr 120px 100px 120px',
          gap: 12, padding: '10px 20px', background: '#f6f5f1', borderBottom: `1px solid ${B}`,
        }}>
          {['código', 'valor', 'mínimo', 'usos', 'expira', 'estado', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {codes.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: M, fontSize: 13, fontStyle: 'italic' }}>
            sin códigos todavía. crea el primero arriba.
          </div>
        ) : (
          codes.map(c => <CodeRow key={c.id} code={c} />)
        )}
      </div>
    </main>
  )
}
