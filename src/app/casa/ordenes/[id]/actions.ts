'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdmin, requireAdminOrThrow, requireAdminUserId } from '@/lib/auth.server'
import { logAction } from '@/lib/audit.server'
import {
  buyLabel, cancelLabel, lastKnownBalance, ratesForOrder, shipmentReadiness, trackOrder,
  type ReadinessItem as ShippingReadinessItem, type ShippingRate,
} from '@/lib/shipping.server'
import type { EnviaTrackResult } from '@/lib/envia'

// Alias local: un archivo 'use server' no puede re-exportar con `export type {}`
// (Turbopack lo trata como valor).
export type ReadinessItem = ShippingReadinessItem

// Bitácora de guías de la orden (orders.shipment_events).
export type ShipmentEvent = {
  type: 'created' | 'cancelled'
  at: string
  provider?: string
  mode?: string
  tracking?: string
  carrier?: string
  service?: string
  cost_mxn?: number
  label_url?: string
  note?: string
}

const VALID_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'refunded', 'failed'] as const

export async function updateOrderStatus(orderId: string, status: string) {
  const userId = await requireAdminUserId()
  if (!(VALID_STATUSES as readonly string[]).includes(status)) throw new Error('estado inválido')

  const { data: order } = await supabaseAdmin
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('customer_email, customer_name, folio_number')
    .single()

  logAction({ userId, action: 'update_status', tableName: 'orders', recordId: orderId, summary: `cambió estado de orden #${order?.folio_number ?? ''} a "${status}"` })
  revalidatePath(`/casa/ordenes/${orderId}`)
  revalidatePath('/casa/ordenes')

  if (order && (status === 'cancelled' || status === 'refunded')) {
    const { sendOrderCancelled } = await import('@/lib/emails')
    sendOrderCancelled({ ...order, status: status as 'cancelled' | 'refunded' }).catch(console.error)
  }
}

export async function deleteOrder(orderId: string): Promise<{ error?: string }> {
  try {
    const userId = await requireAdminUserId()
    const { data: ord } = await supabaseAdmin.from('orders').select('folio_number').eq('id', orderId).single()
    const { error } = await supabaseAdmin.from('orders').delete().eq('id', orderId)
    if (error) return { error: error.message }
    logAction({ userId, action: 'delete', tableName: 'orders', recordId: orderId, summary: `eliminó orden #${ord?.folio_number ?? ''}` })
    revalidatePath('/casa/ordenes')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al eliminar' }
  }
}

export async function updateOrderDetails(orderId: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const userId = await requireAdminUserId()
    const street  = (formData.get('addr_street')  as string ?? '').trim()
    const number  = (formData.get('addr_number')  as string ?? '').trim()
    const colonia = (formData.get('addr_colonia') as string ?? '').trim()
    const zip     = (formData.get('addr_zip')     as string ?? '').trim()
    const city    = (formData.get('addr_city')    as string ?? '').trim()
    const state   = (formData.get('addr_state')   as string ?? '').trim()
    const shippingAddress = (street || zip) ? { street, number, colonia, zip, city, state } : null

    const { error } = await supabaseAdmin.from('orders').update({
      customer_name:  (formData.get('customer_name')  as string ?? '').trim() || null,
      customer_email: (formData.get('customer_email') as string ?? '').trim(),
      customer_phone: (formData.get('customer_phone') as string ?? '').trim() || null,
      notes: (formData.get('notes') as string ?? '').trim() || null,
      shipping_address: shippingAddress,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)

    if (error) return { error: error.message }
    logAction({ userId, action: 'update_details', tableName: 'orders', recordId: orderId, summary: 'editó datos del cliente o dirección de envío' })
    revalidatePath(`/casa/ordenes/${orderId}`)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al guardar' }
  }
}

export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
  const userId = await requireAdminUserId()
  const trimmed = trackingNumber.trim()
  await supabaseAdmin
    .from('orders')
    .update({ tracking_number: trimmed || null, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  logAction({ userId, action: 'update_tracking', tableName: 'orders', recordId: orderId, summary: trimmed ? `actualizó guía: ${trimmed}` : 'eliminó número de guía' })
  revalidatePath(`/casa/ordenes/${orderId}`)
}

// ── Envíos (Envia.com, vía src/lib/shipping.server.ts) ───────────────────────

export async function checkShipmentReadiness(orderId: string): Promise<{ ready: boolean; items: ReadinessItem[] }> {
  await requireAdmin()
  return shipmentReadiness(orderId)
}

export type RatesResult = { rates: ShippingRate[]; error?: string }

/** Costo real de cada paquetería para esta orden (sin el recargo al cliente). */
export async function getRatesForOrder(orderId: string): Promise<RatesResult> {
  try {
    await requireAdminOrThrow()
    const rates = await ratesForOrder(orderId)
    if (rates.length === 0) return { rates: [], error: 'Envia no devolvió tarifas para esta dirección' }
    return { rates }
  } catch (e) {
    return { rates: [], error: e instanceof Error ? e.message : 'error cotizando envío' }
  }
}

export type ShipmentActionResult = { trackingNumber: string; labelUrl: string | null; carrier: string; mode: string }
export type ShipmentResult = { data?: ShipmentActionResult; error?: string }

export async function createShipment(orderId: string, rateId?: string): Promise<ShipmentResult> {
  try {
    const userId = await requireAdminUserId()
    const r = await buyLabel(orderId, rateId)

    const { data: orderForEmail } = await supabaseAdmin
      .from('orders').select('customer_email, customer_name, folio_number').eq('id', orderId).single()
    // En modo prueba la guía no es real: no se le avisa al cliente.
    if (orderForEmail && r.mode === 'live') {
      const { sendShipmentNotification } = await import('@/lib/emails')
      sendShipmentNotification(orderForEmail, r.trackingNumber, r.carrier.toUpperCase()).catch(console.error)
    }

    logAction({ userId, action: 'shipment_created', tableName: 'orders', recordId: orderId, summary: `compró guía Envia${r.mode === 'test' ? ' (prueba)' : ''}: ${r.trackingNumber} · ${r.carrier.toUpperCase()} ${r.service}` })
    revalidatePath(`/casa/ordenes/${orderId}`)
    revalidatePath('/casa/ordenes')
    return { data: { trackingNumber: r.trackingNumber, labelUrl: r.labelUrl, carrier: r.carrier.toUpperCase(), mode: r.mode } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al crear la guía' }
  }
}

export type ShipmentStatusResult = { data?: NonNullable<EnviaTrackResult>; error?: string }

export async function fetchShipmentStatus(orderId: string): Promise<ShipmentStatusResult> {
  try {
    await requireAdminOrThrow()
    const { data: order } = await supabaseAdmin
      .from('orders').select('tracking_number, shipping_carrier, shipping_provider').eq('id', orderId).single()
    if (!order?.tracking_number) return { error: 'esta orden no tiene guía' }
    if (order.shipping_provider !== 'envia') return { error: 'la guía no se compró con Envia: rastréala en el sitio de la paquetería' }
    const result = await trackOrder(order)
    if (!result) return { error: 'Envia no respondió el rastreo. intenta en un rato' }
    return { data: result }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al consultar el estado del envío' }
  }
}

export async function cancelShipment(orderId: string, reason: string): Promise<{ error?: string; warning?: string; balanceReturned?: boolean }> {
  try {
    const userId = await requireAdminUserId()
    const r = await cancelLabel(orderId, reason)
    logAction({ userId, action: 'shipment_cancelled', tableName: 'orders', recordId: orderId, summary: `canceló guía${reason ? ` — ${reason}` : ''}${r.warning ? ` (aviso: ${r.warning})` : ''}` })
    revalidatePath(`/casa/ordenes/${orderId}`)
    revalidatePath('/casa/ordenes')
    return { warning: r.warning, balanceReturned: r.balanceReturned }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al cancelar' }
  }
}

/** Envia no tiene endpoint de saldo: es el último que reportó al comprar o cancelar. */
export async function fetchShippingBalance(): Promise<{ balance: number | null; at: string | null; mode: string }> {
  await requireAdminOrThrow()
  return lastKnownBalance()
}
