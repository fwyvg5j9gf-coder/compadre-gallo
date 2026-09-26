'use client'

import { useState, useEffect } from 'react'
import { fetchShippingBalance } from './[id]/actions'

// Envia no tiene endpoint de saldo: se muestra el último que reportó al
// comprar o cancelar una guía, y en qué modo está (prueba o producción).
export default function ShippingBalanceBadge() {
  const [info, setInfo] = useState<{ balance: number | null; at: string | null; mode: string } | null>(null)

  useEffect(() => {
    fetchShippingBalance().then(setInfo).catch(() => {})
  }, [])

  if (!info) return null
  if (info.mode === 'off') return null

  const low = info.balance != null && info.balance < 200
  return (
    <div
      title={info.at ? `último saldo que reportó Envia (${info.at.slice(0, 10)})` : 'Envia aún no reporta saldo: aparece al comprar la primera guía'}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 700,
        background: low ? 'rgba(255,1,0,0.15)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${low ? 'rgba(255,1,0,0.3)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 4, padding: '5px 10px',
        color: low ? '#ff6b6b' : 'rgba(255,255,255,0.8)',
        fontVariantNumeric: 'tabular-nums',
      }}>
      <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>envia</span>
      {info.mode === 'test' && <span style={{ fontSize: 10, color: '#ffd49a' }}>prueba</span>}
      {info.balance != null
        ? info.balance.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
        : <span style={{ fontWeight: 400, opacity: 0.7 }}>sin saldo reportado</span>}
    </div>
  )
}
