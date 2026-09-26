'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus, updateTrackingNumber, createShipment, getRatesForOrder, deleteOrder, updateOrderDetails, fetchShipmentStatus, cancelShipment, fetchShippingBalance } from './actions'
import type { ShippingRate } from '@/lib/envia'
import type { ReadinessItem, ShipmentEvent, ShipmentStatusResult } from './actions'

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'pendiente' },
  { value: 'paid',      label: 'pagado' },
  { value: 'shipped',   label: 'enviado' },
  { value: 'delivered', label: 'entregado' },
  { value: 'refunded',  label: 'reembolsado' },
  { value: 'failed',    label: 'fallido' },
]

const B = '#ecebe5'
const M = '#6b6a64'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const inp: React.CSSProperties = {
  padding: '7px 10px', border: `1px solid ${B}`, borderRadius: 4,
  fontSize: 13, color: '#0a0a0a', background: '#fff', outline: 'none',
  width: '100%', boxSizing: 'border-box' as const, fontFamily: 'var(--font-sans)',
}
const lbl: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  fontSize: 11, fontWeight: 600, color: M, letterSpacing: '0.03em',
}

function getCarrierTrackingUrl(carrier: string, tracking: string): string {
  const c = carrier.toLowerCase()
  if (c.includes('dhl'))           return `https://www.dhl.com/mx-es/home/tracking.html?tracking-id=${tracking}&submit=1`
  if (c.includes('fedex'))         return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${tracking}`
  if (c.includes('ups'))           return `https://www.ups.com/track?tracknum=${tracking}&loc=es_MX`
  if (c.includes('estafeta'))      return `https://www.estafeta.com/herramientas/rastreo?guia=${tracking}`
  if (c.includes('redpack'))       return `https://www.redpack.com.mx/es/rastreo/?guias=${tracking}`
  if (c.includes('paquetexpress')) return `https://www.paquetexpress.com.mx/rastreo?guia=${tracking}`
  return ''
}

const TRACK_LABEL: Record<string, string> = {
  created: 'guía creada',
  pickup: 'recolectada',
  shipped: 'en tránsito',
  in_transit: 'en tránsito',
  out_for_delivery: 'en reparto',
  delivered: 'entregada',
  exception: 'incidencia',
  returned: 'devuelta',
  canceled: 'cancelada',
  cancelled: 'cancelada',
}

export default function OrderActions({
  orderId,
  currentStatus,
  currentTracking,
  shippingRateId,
  shippingMxn,
  shippingCarrier,
  labelUrl: initialLabelUrl,
  shippingProvider,
  shipmentEvents,
  initialCustomerName,
  initialCustomerEmail,
  initialCustomerPhone,
  initialNotes,
  initialAddress,
  shipmentReadiness,
}: {
  orderId: string
  currentStatus: string
  currentTracking: string | null
  shippingRateId: string | null
  shippingMxn: number
  shippingCarrier: string | null
  labelUrl: string | null
  shippingProvider: string | null
  initialCustomerName: string | null
  initialCustomerEmail: string
  initialCustomerPhone: string | null
  initialNotes: string | null
  initialAddress: Record<string, string> | null
  shipmentReadiness: { ready: boolean; items: ReadinessItem[] } | null
  shipmentEvents: ShipmentEvent[]
}) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [tracking, setTracking] = useState(currentTracking ?? '')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [trackingMsg, setTrackingMsg] = useState<string | null>(null)
  const [pendingStatus, startStatus] = useTransition()
  const [pendingTracking, startTracking] = useTransition()
  const [pendingShipment, startShipment] = useTransition()
  const [pendingRates, startRates] = useTransition()
  const [pendingEdit, startEdit] = useTransition()
  const [pendingDelete, startDelete] = useTransition()
  const [shipmentError, setShipmentError] = useState<string | null>(null)
  const [labelUrl, setLabelUrl] = useState(initialLabelUrl)
  const [guideStep, setGuideStep] = useState<'idle' | 'fetching' | 'selecting' | 'creating'>('idle')
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editMsg, setEditMsg] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [shipmentStatus, setShipmentStatus] = useState<ShipmentStatusResult['data'] | null>(null)
  const [pendingTrack, startTrack] = useTransition()
  const [trackError, setTrackError] = useState<string | null>(null)
  const [pendingCancel, startCancel] = useTransition()
  const [confirmCancelShipment, setConfirmCancelShipment] = useState(false)
  const [cancelShipmentError, setCancelShipmentError] = useState<string | null>(null)
  const [cancelShipmentMsg, setCancelShipmentMsg] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [balance, setBalance] = useState<{ balance: number | null; at: string | null; mode: string } | null>(null)

  const hasTracking = !!tracking
  const isEnvia = shippingProvider === 'envia'
  const lastCreated = [...shipmentEvents].reverse().find(e => e.type === 'created')

  useEffect(() => {
    if (hasTracking) return
    fetchShippingBalance().then(setBalance).catch(() => {})
  }, [hasTracking])

  function handleTrackShipment() {
    setTrackError(null)
    startTrack(async () => {
      const { data, error } = await fetchShipmentStatus(orderId)
      if (error) { setTrackError(error); return }
      if (data) setShipmentStatus(data)
    })
  }

  function handleCancelShipment() {
    setCancelShipmentError(null)
    startCancel(async () => {
      const { error, warning, balanceReturned } = await cancelShipment(orderId, cancelReason)
      if (error) { setCancelShipmentError(error); return }
      setTracking('')
      setStatus('paid')
      setLabelUrl(null)
      setShipmentStatus(null)
      setConfirmCancelShipment(false)
      setCancelReason('')
      setCancelShipmentMsg(
        warning
          ? `⚠ cancelada aquí, pero Envia respondió: "${warning}". revísala en tu cuenta de Envia.`
          : `guía cancelada en Envia${balanceReturned ? ' y el saldo regresó a tu cuenta' : ''}.`
      )
    })
  }

  function handleStatusSave() {
    startStatus(async () => {
      await updateOrderStatus(orderId, status)
      setStatusMsg('guardado')
      setTimeout(() => setStatusMsg(null), 2000)
    })
  }

  function handleTrackingSave() {
    startTracking(async () => {
      await updateTrackingNumber(orderId, tracking)
      setTrackingMsg('guardado')
      setTimeout(() => setTrackingMsg(null), 2000)
    })
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEditError(null)
    const fd = new FormData(e.currentTarget)
    startEdit(async () => {
      const { error } = await updateOrderDetails(orderId, fd)
      if (error) { setEditError(error); return }
      setEditMsg('guardado')
      setTimeout(() => { setEditMsg(null); setShowEdit(false) }, 1500)
    })
  }

  function handleDelete() {
    setDeleteError(null)
    startDelete(async () => {
      const { error } = await deleteOrder(orderId)
      if (error) { setDeleteError(error); setConfirmDelete(false); return }
      router.push('/casa/ordenes')
    })
  }

  function handleFetchRates() {
    setShipmentError(null)
    setGuideStep('fetching')
    startRates(async () => {
      const { rates, error } = await getRatesForOrder(orderId)
      if (error) {
        setShipmentError(error)
        setGuideStep('idle')
        return
      }
      setRates(rates)
      // Preselecciona exactamente lo que eligió el cliente (mismo carrier:servicio)
      setSelectedRate(rates.find(r => r.rate_id === shippingRateId) ?? rates[0])
      setGuideStep('selecting')
    })
  }

  function handleCreateShipment(rateId?: string) {
    setShipmentError(null)
    setGuideStep('creating')
    startShipment(async () => {
      const { data, error } = await createShipment(orderId, rateId)
      if (error) {
        setShipmentError(error)
        setGuideStep('idle')
        return
      }
      if (data) {
        setTracking(data.trackingNumber)
        setStatus('shipped')
        if (data.labelUrl) setLabelUrl(data.labelUrl)
      }
      setGuideStep('idle')
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Status */}
      <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
          estado del pedido
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="adm-inp"
            style={{ flex: 1, height: 36 }}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleStatusSave}
            disabled={pendingStatus || status === currentStatus}
            className="adm-btn-primary"
            style={{ height: 36, padding: '0 16px', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            {pendingStatus ? '…' : statusMsg ?? 'actualizar'}
          </button>
        </div>
      </div>

      {/* Tracking */}
      <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
          número de guía
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            value={tracking}
            onChange={e => setTracking(e.target.value)}
            placeholder="ej. 1Z999AA10123456784"
            className="adm-inp"
            style={{ flex: 1, height: 36, fontFamily: 'monospace', fontSize: 13 }}
          />
          <button
            onClick={handleTrackingSave}
            disabled={pendingTracking}
            className="adm-btn-primary"
            style={{ height: 36, padding: '0 16px', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            {pendingTracking ? '…' : trackingMsg ?? 'guardar'}
          </button>
        </div>
        {labelUrl && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <a
              href={labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px', height: 'auto', textDecoration: 'none' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              descargar PDF
            </a>
            <button
              onClick={() => { const w = window.open(labelUrl); if (w) w.addEventListener('load', () => w.print()) }}
              className="adm-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px', height: 'auto', cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              imprimir guía
            </button>
          </div>
        )}
      </div>

      {/* Rastrear envío */}
      {hasTracking && (
        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            rastreo del envío
          </div>

          {lastCreated && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f6f5f1', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: M }}>guía</span>
                <span style={{ fontWeight: 600 }}>
                  {[lastCreated.carrier?.toUpperCase(), lastCreated.service].filter(Boolean).join(' · ')}
                  {lastCreated.mode === 'test' && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: '#b45309' }}>PRUEBA</span>}
                </span>
              </div>
              {lastCreated.cost_mxn != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: M }}>costo real (Envia)</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{fmt(lastCreated.cost_mxn)}</span>
                </div>
              )}
            </div>
          )}

          {shipmentStatus && (
            <div style={{ marginBottom: 14, padding: '10px 14px', border: `1px solid ${B}`, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: M }}>estado</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: /deliver/i.test(shipmentStatus.status) ? 'rgba(26,107,53,0.1)' : /exception|return|cancel/i.test(shipmentStatus.status) ? 'rgba(255,1,0,0.08)' : 'rgba(0,58,135,0.08)',
                  color: /deliver/i.test(shipmentStatus.status) ? '#1a6b35' : /exception|return|cancel/i.test(shipmentStatus.status) ? '#cc0000' : '#003a87',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {TRACK_LABEL[shipmentStatus.status.toLowerCase()] ?? (shipmentStatus.status || 'sin datos')}
                </span>
              </div>
              {shipmentStatus.events.length > 0 && (
                <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {[...shipmentStatus.events].reverse().map((ev, i) => (
                    <li key={i} style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '92px 1fr', gap: 8 }}>
                      <span style={{ color: M, fontFamily: 'monospace', fontSize: 11 }}>{ev.date.slice(0, 16).replace('T', ' ')}</span>
                      <span>{ev.description || ev.status}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {isEnvia && (
              <button
                onClick={handleTrackShipment}
                disabled={pendingTrack}
                className="adm-btn-primary"
                style={{ flex: 1, height: 36, fontSize: 13 }}
              >
                {pendingTrack ? 'consultando…' : shipmentStatus ? 'actualizar' : 'consultar estado'}
              </button>
            )}
            {shippingCarrier && tracking && getCarrierTrackingUrl(shippingCarrier, tracking) && (
              <a
                href={getCarrierTrackingUrl(shippingCarrier, tracking)}
                target="_blank" rel="noopener noreferrer"
                style={{ height: 36, padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 13, border: `1px solid ${B}`, borderRadius: 4, background: '#fff', color: '#003a87', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flex: isEnvia ? undefined : 1 }}
              >
                rastrear en {shippingCarrier} ↗
              </a>
            )}
            {!isEnvia && !shippingCarrier && (
              <p style={{ fontSize: 12, color: M, margin: 0, fontStyle: 'italic' }}>guía registrada a mano — sin rastreo automático</p>
            )}
          </div>
          {trackError && (
            <p style={{ fontSize: 12, color: '#cc0000', margin: '10px 0 0', padding: '8px 12px', background: 'rgba(255,1,0,0.05)', borderRadius: 4, border: '1px solid rgba(255,1,0,0.15)' }}>
              {trackError}
            </p>
          )}
        </div>
      )}

      {/* Comprar guía con Envia */}
      {!hasTracking && (
        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', gap: 8, alignItems: 'center' }}>
              guía con envia
              {balance?.mode === 'test' && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#b45309', background: 'rgba(255,152,0,0.12)', padding: '1px 6px', borderRadius: 999 }}>MODO PRUEBA</span>
              )}
            </div>
            {balance?.balance != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title={balance.at ? `reportado por Envia el ${balance.at.slice(0, 10)}` : undefined}>
                <span style={{ fontSize: 10, fontWeight: 600, color: M, letterSpacing: '0.04em', textTransform: 'uppercase' }}>último saldo</span>
                <span style={{
                  fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                  color: balance.balance < 200 ? '#cc4400' : '#1a6b35',
                  background: balance.balance < 200 ? 'rgba(204,68,0,0.07)' : 'rgba(26,107,53,0.07)',
                  padding: '2px 8px', borderRadius: 4,
                }}>
                  {balance.balance.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                </span>
              </div>
            )}
          </div>

          {/* Readiness checklist */}
          {shipmentReadiness && (
            <div style={{ marginBottom: 16, border: `1px solid ${shipmentReadiness.ready ? '#c8e6c9' : B}`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: shipmentReadiness.ready ? '#f1f8f2' : '#f6f5f1', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${shipmentReadiness.ready ? '#c8e6c9' : B}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: shipmentReadiness.ready ? '#1a6b35' : '#cc4400' }}>
                  {shipmentReadiness.ready ? '✓ lista para generar guía' : '✗ faltan datos para generar guía'}
                </span>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {shipmentReadiness.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12 }}>
                    <span style={{ color: item.ok ? '#1a6b35' : '#cc4400', flexShrink: 0, lineHeight: '18px' }}>{item.ok ? '✓' : '✗'}</span>
                    <span style={{ color: item.ok ? M : '#0a0a0a', fontWeight: item.ok ? 400 : 500 }}>{item.label}</span>
                    {!item.ok && item.detail && (
                      <span style={{ color: '#cc4400', fontSize: 11, marginLeft: 2 }}>— {item.detail}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info de envío del cliente */}
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f6f5f1', borderRadius: 4, fontSize: 13 }}>
            <span style={{ color: M }}>cliente pagó: </span>
            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{fmt(shippingMxn)}</span>
            {shippingCarrier && (
              <span style={{ color: M }}> · {shippingCarrier}</span>
            )}
            {!shippingCarrier && (
              <span style={{ color: M }}> · tarifa fija</span>
            )}
          </div>

          {/* Flujo unificado: siempre cotiza primero para que el admin confirme la paquetería */}
          {guideStep === 'idle' && (
            <button onClick={handleFetchRates} disabled={pendingRates} className="adm-btn-primary" style={{ width: '100%', height: 38, fontSize: 13 }}>
              {pendingRates ? 'cotizando…' : 'ver opciones de paquetería'}
            </button>
          )}
          {guideStep === 'fetching' && (
            <p style={{ fontSize: 13, color: M, fontStyle: 'italic' }}>cotizando con Envia…</p>
          )}
          {guideStep === 'selecting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, color: M, padding: '7px 12px', background: '#f6f5f1', borderRadius: 4 }}>
                precios reales de Envia, sin el recargo que paga el cliente.
                {shippingCarrier && <> cliente eligió <strong style={{ color: '#0a0a0a' }}>{shippingCarrier}</strong>.</>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rates.map(r => {
                  const isClientChoice = r.rate_id === shippingRateId
                  const isSelected = selectedRate?.rate_id === r.rate_id
                  return (
                    <label key={r.rate_id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      border: `1px solid ${isSelected ? '#0a0a0a' : B}`,
                      borderRadius: 4, cursor: 'pointer',
                      background: isSelected ? '#f6f5f1' : '#fff',
                    }}>
                      <input type="radio" name="sky_rate" checked={isSelected}
                        onChange={() => setSelectedRate(r)} style={{ accentColor: '#ff0100' }} />
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{r.carrier_name}</span>
                        {r.service_name && <span style={{ fontSize: 12, color: M }}>{r.service_name}</span>}
                        {r.days && <span style={{ fontSize: 12, color: M }}>{r.days} días</span>}
                        {isClientChoice && (
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1px 7px', borderRadius: 999, background: 'rgba(0,58,135,0.08)', color: '#003a87' }}>
                            cliente eligió
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, flexShrink: 0 }}>
                        {fmt(Math.round(r.total_mxn * 100))}
                      </span>
                    </label>
                  )
                })}
              </div>
              {selectedRate && shippingRateId?.includes(':') && selectedRate.rate_id !== shippingRateId && (
                <div style={{ fontSize: 12, color: '#cc5500', padding: '7px 12px', background: 'rgba(255,100,0,0.06)', borderRadius: 4, border: '1px solid rgba(255,100,0,0.2)' }}>
                  ⚠ elegiste {selectedRate.carrier_name} {selectedRate.service_name}, pero el cliente pagó por otra opción
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => selectedRate && handleCreateShipment(selectedRate.rate_id)}
                  disabled={!selectedRate || pendingShipment}
                  className="adm-btn-primary" style={{ flex: 1, height: 36, fontSize: 13 }}
                >
                  {pendingShipment ? 'comprando…' : `comprar guía · ${selectedRate ? fmt(Math.round(selectedRate.total_mxn * 100)) : ''}`}
                </button>
                <button onClick={() => setGuideStep('idle')} disabled={pendingShipment} style={{ height: 36, padding: '0 14px', fontSize: 13, border: `1px solid ${B}`, borderRadius: 4, background: '#fff', cursor: 'pointer', color: M }}>
                  cancelar
                </button>
              </div>
            </div>
          )}
          {guideStep === 'creating' && (
            <p style={{ fontSize: 13, color: M, fontStyle: 'italic' }}>creando guía…</p>
          )}

          {shipmentError && (
            <p style={{ fontSize: 12, color: '#cc0000', margin: '10px 0 0', padding: '8px 12px', background: 'rgba(255,1,0,0.05)', borderRadius: 4, border: '1px solid rgba(255,1,0,0.15)' }}>
              {shipmentError}
            </p>
          )}
        </div>
      )}

      {/* Editar datos */}
      <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
        <button
          onClick={() => setShowEdit(v => !v)}
          style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase' }}>editar datos</span>
          <span style={{ fontSize: 16, color: M, lineHeight: 1 }}>{showEdit ? '−' : '+'}</span>
        </button>
        {showEdit && (
          <form onSubmit={handleEdit} style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: `1px solid ${B}` }}>
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={lbl}>
                nombre
                <input name="customer_name" defaultValue={initialCustomerName ?? ''} style={inp} />
              </label>
              <label style={lbl}>
                correo *
                <input name="customer_email" type="email" required defaultValue={initialCustomerEmail} style={inp} />
              </label>
              <label style={lbl}>
                teléfono
                <input name="customer_phone" defaultValue={initialCustomerPhone ?? ''} style={inp} />
              </label>
              <label style={lbl}>
                notas
                <input name="notes" defaultValue={initialNotes ?? ''} style={inp} />
              </label>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.04em', marginTop: 4 }}>DIRECCIÓN</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={lbl}>
                calle
                <input name="addr_street" defaultValue={initialAddress?.street ?? ''} style={inp} />
              </label>
              <label style={lbl}>
                número
                <input name="addr_number" defaultValue={initialAddress?.number ?? ''} placeholder="123 int. 4" style={inp} />
              </label>
              <label style={lbl}>
                colonia
                <input name="addr_colonia" defaultValue={initialAddress?.colonia ?? ''} style={inp} />
              </label>
              <label style={lbl}>
                C.P.
                <input name="addr_zip" defaultValue={initialAddress?.zip ?? ''} style={inp} />
              </label>
              <label style={lbl}>
                ciudad
                <input name="addr_city" defaultValue={initialAddress?.city ?? ''} style={inp} />
              </label>
              <label style={lbl}>
                estado
                <input name="addr_state" defaultValue={initialAddress?.state ?? ''} style={inp} />
              </label>
            </div>
            {editError && (
              <p style={{ fontSize: 12, color: '#cc0000', padding: '8px 12px', background: 'rgba(255,1,0,0.05)', borderRadius: 4, border: '1px solid rgba(255,1,0,0.15)', margin: 0 }}>
                {editError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowEdit(false)} style={{ height: 34, padding: '0 14px', border: `1px solid ${B}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, color: M }}>
                cancelar
              </button>
              <button type="submit" disabled={pendingEdit} className="adm-btn-primary" style={{ height: 34, padding: '0 16px', fontSize: 13 }}>
                {pendingEdit ? '…' : editMsg ?? 'guardar'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Zona de peligro */}
      <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '16px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>zona de peligro</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Cancelar guía */}
          {hasTracking && (
            !confirmCancelShipment ? (
              <button
                onClick={() => setConfirmCancelShipment(true)}
                style={{ width: '100%', height: 36, background: 'rgba(255,1,0,0.06)', border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4, color: '#cc0000', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                cancelar guía de envío
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px', background: 'rgba(255,1,0,0.04)', borderRadius: 4, border: '1px solid rgba(255,1,0,0.15)' }}>
                <p style={{ fontSize: 13, color: '#cc0000', margin: 0, fontWeight: 600 }}>
                  ¿cancelar la guía en Envia?
                </p>
                <p style={{ fontSize: 12, color: M, margin: 0 }}>
                  solo se puede si la paquetería todavía no la escanea. el saldo regresa a tu cuenta de Envia y el pedido vuelve a <strong>pagado</strong>.
                </p>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: M }}>
                  razón (queda en la bitácora)
                  <input
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="ej. el cliente cambió de opinión"
                    className="adm-inp"
                    style={{ height: 34, fontSize: 13 }}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleCancelShipment}
                    disabled={pendingCancel || !cancelReason.trim()}
                    style={{ flex: 1, height: 34, background: '#ff0100', border: 'none', borderRadius: 4, color: '#fff', fontWeight: 700, fontSize: 13, cursor: pendingCancel || !cancelReason.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', opacity: !cancelReason.trim() ? 0.5 : 1 }}
                  >
                    {pendingCancel ? 'cancelando…' : 'cancelar guía'}
                  </button>
                  <button
                    onClick={() => { setConfirmCancelShipment(false); setCancelReason('') }}
                    disabled={pendingCancel}
                    style={{ height: 34, padding: '0 14px', border: `1px solid ${B}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, color: M }}
                  >
                    no
                  </button>
                </div>
                {cancelShipmentError && <p style={{ fontSize: 12, color: '#cc0000', margin: 0 }}>{cancelShipmentError}</p>}
              </div>
            )
          )}

          {cancelShipmentMsg && (
            <div style={{
              padding: '10px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500,
              background: cancelShipmentMsg.startsWith('⚠') ? 'rgba(255,152,0,0.1)' : 'rgba(26,107,53,0.08)',
              border: `1px solid ${cancelShipmentMsg.startsWith('⚠') ? 'rgba(255,152,0,0.3)' : 'rgba(26,107,53,0.2)'}`,
              color: cancelShipmentMsg.startsWith('⚠') ? '#b45309' : '#1a6b35',
            }}>
              {cancelShipmentMsg.startsWith('⚠') ? '' : '✓ '}{cancelShipmentMsg}
            </div>
          )}

          {/* Eliminar orden */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ width: '100%', height: 36, background: 'rgba(255,1,0,0.06)', border: '1px solid rgba(255,1,0,0.2)', borderRadius: 4, color: '#cc0000', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              eliminar orden
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: '#cc0000', margin: 0 }}>
                ¿seguro? esta acción es permanente y no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDelete}
                  disabled={pendingDelete}
                  style={{ flex: 1, height: 36, background: '#ff0100', border: 'none', borderRadius: 4, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                >
                  {pendingDelete ? 'eliminando…' : 'sí, eliminar'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={pendingDelete}
                  style={{ height: 36, padding: '0 14px', border: `1px solid ${B}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, color: M }}
                >
                  cancelar
                </button>
              </div>
              {deleteError && (
                <p style={{ fontSize: 12, color: '#cc0000', margin: 0 }}>{deleteError}</p>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  )
}
