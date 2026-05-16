'use client'

import { useState, useTransition } from 'react'
import { updateOrderStatus, updateTrackingNumber, createSkydropxShipment } from './actions'

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

export default function OrderActions({
  orderId,
  currentStatus,
  currentTracking,
  shippingRateId,
  labelUrl: initialLabelUrl,
}: {
  orderId: string
  currentStatus: string
  currentTracking: string | null
  shippingRateId: string | null
  labelUrl: string | null
}) {
  const [status, setStatus] = useState(currentStatus)
  const [tracking, setTracking] = useState(currentTracking ?? '')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [trackingMsg, setTrackingMsg] = useState<string | null>(null)
  const [pendingStatus, startStatus] = useTransition()
  const [pendingTracking, startTracking] = useTransition()
  const [pendingShipment, startShipment] = useTransition()
  const [shipmentError, setShipmentError] = useState<string | null>(null)
  const [labelUrl, setLabelUrl] = useState(initialLabelUrl)
  const [confirming, setConfirming] = useState(false)

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

  function handleCreateShipment() {
    setShipmentError(null)
    setConfirming(false)
    startShipment(async () => {
      try {
        const result = await createSkydropxShipment(orderId)
        setTracking(result.trackingNumber)
        setStatus('shipped')
        if (result.labelUrl) setLabelUrl(result.labelUrl)
      } catch (e: unknown) {
        setShipmentError(e instanceof Error ? e.message : 'error al crear la guía')
      }
    })
  }

  const canCreateGuide = !!shippingRateId && !tracking

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
      {(canCreateGuide || pendingShipment) && (
        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            skydropx
          </div>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={pendingShipment}
              className="adm-btn-primary"
              style={{ width: '100%', height: 38, fontSize: 13 }}
            >
              crear guía de envío
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: M, margin: 0 }}>
                esto creará la guía en Skydropx, marcará la orden como <strong>enviada</strong> y guardará el número de rastreo automáticamente.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCreateShipment}
                  disabled={pendingShipment}
                  className="adm-btn-primary"
                  style={{ flex: 1, height: 36, fontSize: 13 }}
                >
                  {pendingShipment ? 'creando guía…' : 'confirmar y crear'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={pendingShipment}
                  style={{ height: 36, padding: '0 14px', fontSize: 13, border: `1px solid ${B}`, borderRadius: 4, background: '#fff', cursor: 'pointer', color: M }}
                >
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
