'use client'

import { useState, useEffect } from 'react'
import { fetchSkydropxBalance } from '../tienda/configuracion/actions'

export default function SkydropxBalanceBadge() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSkydropxBalance()
      .then(r => { if (r.balance !== undefined) setBalance(r.balance) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '5px 10px' }}>
      skydropx…
    </div>
  )
  if (balance === null) return null

  const low = balance < 200
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 700,
      background: low ? 'rgba(255,1,0,0.15)' : 'rgba(255,255,255,0.08)',
      border: `1px solid ${low ? 'rgba(255,1,0,0.3)' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 4, padding: '5px 10px',
      color: low ? '#ff6b6b' : 'rgba(255,255,255,0.8)',
      fontVariantNumeric: 'tabular-nums',
    }}>
      <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>sky</span>
      {balance.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}
      {low && <span style={{ fontSize: 10, fontWeight: 400 }}>⚠</span>}
    </div>
  )
}
