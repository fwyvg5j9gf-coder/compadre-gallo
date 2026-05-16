'use client'

import { useState, useTransition } from 'react'
import { updateOrderStatus, updateTrackingNumber, createSkydropxShipment, getSkydropxRatesForOrder } from './actions'
import type { ShippingRate } from '@/lib/skydropx'

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

export default function OrderActions({
  orderId,
  currentStatus,
  currentTracking,
  shippingRateId,
  shippingMxn,
  shippingCarrier,
  labelUrl: initialLabelUrl,
}: {
  orderId: string
  currentStatus: string
  currentTracking: string | null
  shippingRateId: string | null
  shippingMxn: number
  shippingCarrier: string | null
  labelUrl: string | null
}) {
  const [status, setStatus] = useState(currentStatus)
  const [tracking, setTracking] = useState(currentTracking ?? '')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [trackingMsg, setTrackingMsg] = useState<string | null>(null)
  const [pendingStatus, startStatus] = useTransition()
  const [pendingTracking, startTracking] = useTransition()
  const [pendingShipment, startShipment] = useTransition()
  const [pendingRates, startRates] = useTransition()
  const [shipmentError, setShipmentError] = useState<string | null>(null)
  const [labelUrl, setLabelUrl] = useState(initialLabelUrl)
  // 'idle' | 'confirming' | 'fetching' | 'selecting' | 'creating'
  const [guideStep, setGuideStep] = useState<'idle' | 'confirming' | 'fetching' | 'selecting' | 'creating'>('idle')
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null)

  const hasTracking = !!tracking
  const hasRateId = !!shippingRateId

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

  function handleFetchRates() {
    setShipmentError(null)
    setGuideStep('fetching')
    startRates(async () => {
      const { rates, error } = await getSkydropxRatesForOrder(orderId)
      if (error) {
        setShipmentError(error)
        setGuideStep('idle')
        return
      }
      setRates(rates)
      setSelectedRate(rates[0])
      setGuideStep('selecting')
    })
  }

  function handleCreateShipment(rateId?: string) {
    setShipmentError(null)
    setGuideStep('creating')
    startShipment(async () => {
      const { data, error } = await createSkydropxShipment(orderId, rateId)
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
          <a
            href={labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="adm-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, padding: '7px 14px', height: 'auto', textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            descargar etiqueta PDF
          </a>
        )}
      </div>

      {/* Crear guía Skydropx */}
      {!hasTracking && (
        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            skydropx
          </div>

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

          {/* Flujo con rate_id: confirmación directa */}
          {hasRateId && guideStep === 'idle' && (
            <button onClick={() => setGuideStep('confirming')} className="adm-btn-primary" style={{ width: '100%', height: 38, fontSize: 13 }}>
              crear guía automáticamente
            </button>
          )}
          {hasRateId && guideStep === 'confirming' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: M, margin: 0 }}>
                crea la guía con la tarifa que el cliente eligió en el checkout, marca la orden como <strong>enviada</strong> y guarda el número de rastreo.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleCreateShipment()} disabled={pendingShipment} className="adm-btn-primary" style={{ flex: 1, height: 36, fontSize: 13 }}>
                  {pendingShipment ? 'creando…' : 'confirmar'}
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

          {/* Flujo sin rate_id: cotizar primero */}
          {!hasRateId && guideStep === 'idle' && (
            <button onClick={handleFetchRates} disabled={pendingRates} className="adm-btn-primary" style={{ width: '100%', height: 38, fontSize: 13 }}>
              cotizar envío en Skydropx
            </button>
          )}
          {!hasRateId && guideStep === 'fetching' && (
            <p style={{ fontSize: 13, color: M, fontStyle: 'italic' }}>cotizando…</p>
          )}
          {!hasRateId && guideStep === 'selecting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rates.map(r => (
                  <label key={r.rate_id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    border: `1px solid ${selectedRate?.rate_id === r.rate_id ? '#0a0a0a' : B}`,
                    borderRadius: 4, cursor: 'pointer',
                    background: selectedRate?.rate_id === r.rate_id ? '#f6f5f1' : '#fff',
                  }}>
                    <input type="radio" name="sky_rate" checked={selectedRate?.rate_id === r.rate_id}
                      onChange={() => setSelectedRate(r)} style={{ accentColor: '#ff0100' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{r.carrier}</span>
                      {r.service_level && <span style={{ fontSize: 12, color: M, marginLeft: 6 }}>{r.service_level}</span>}
                      {r.days && <span style={{ fontSize: 12, color: M, marginLeft: 6 }}>{r.days} días</span>}
                    </div>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                      {fmt(Math.round(r.total_mxn * 100))}
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => selectedRate && handleCreateShipment(selectedRate.rate_id)}
                  disabled={!selectedRate || pendingShipment}
                  className="adm-btn-primary" style={{ flex: 1, height: 36, fontSize: 13 }}
                >
                  crear guía · {selectedRate ? fmt(Math.round(selectedRate.total_mxn * 100)) : ''}
                </button>
                <button onClick={() => setGuideStep('idle')} style={{ height: 36, padding: '0 14px', fontSize: 13, border: `1px solid ${B}`, borderRadius: 4, background: '#fff', cursor: 'pointer', color: M }}>
                  cancelar
                </button>
              </div>
            </div>
          )}

          {shipmentError && (
            <p style={{ fontSize: 12, color: '#cc0000', margin: '10px 0 0', padding: '8px 12px', background: 'rgba(255,1,0,0.05)', borderRadius: 4, border: '1px solid rgba(255,1,0,0.15)' }}>
              {shipmentError}
            </p>
          )}
        </div>
      )}

    </div>
  )
}
