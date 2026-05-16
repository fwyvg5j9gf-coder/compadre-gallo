'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdmin } from '@/lib/auth.server'
import { createShipment, getShippingRates, type ShippingRate } from '@/lib/skydropx'

const VALID_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'refunded', 'failed'] as const

export async function updateOrderStatus(orderId: string, status: string) {
  await requireAdmin()
  if (!(VALID_STATUSES as readonly string[]).includes(status)) throw new Error('estado inválido')

  await supabaseAdmin.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId)
  revalidatePath(`/casa/ordenes/${orderId}`)
  revalidatePath('/casa/ordenes')
}

export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
  await requireAdmin()

  await supabaseAdmin
    .from('orders')
    .update({ tracking_number: trackingNumber.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  revalidatePath(`/casa/ordenes/${orderId}`)
}

// ── Helpers compartidos ──────────────────────────────────────────────────────

async function buildOrderShipmentData(orderId: string) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(product_id)')
    .eq('id', orderId)
    .single()
  if (!order) throw new Error('orden no encontrada')

  const { data: settings } = await supabaseAdmin
    .from('store_settings')
    .select('skydropx_client_id, skydropx_client_secret, origin_zip, origin_state, origin_city, origin_colonia, skydropx_enabled')
    .single()
  if (!settings?.skydropx_enabled || !settings.skydropx_client_id) {
    throw new Error('Skydropx no está configurado en ajustes de la tienda')
  }

  const productIds = (order.order_items as { product_id: string | null }[])
    .map(i => i.product_id).filter(Boolean) as string[]

  let parcel = { weight_kg: 0.5, length_cm: 30, width_cm: 20, height_cm: 10 }
  if (productIds.length > 0) {
    const { data: product } = await supabaseAdmin
      .from('products').select('packaging_type_id, weight_grams').eq('id', productIds[0]).single()
    if (product?.packaging_type_id) {
      const { data: pkg } = await supabaseAdmin
        .from('packaging_types').select('weight_grams, length_cm, width_cm, height_cm').eq('id', product.packaging_type_id).single()
      if (pkg) {
        parcel = {
          weight_kg: Math.max(0.01, (product.weight_grams ?? pkg.weight_grams) / 1000),
          length_cm: Number(pkg.length_cm), width_cm: Number(pkg.width_cm), height_cm: Number(pkg.height_cm),
        }
      }
    }
  }

  const addr = order.shipping_address as Record<string, string> | null
  if (!addr?.zip) throw new Error('la orden no tiene dirección de envío completa')

  return { order, settings, parcel, addr }
}

// ── Cotizar (para órdenes sin rate_id de Skydropx) ──────────────────────────

export async function getSkydropxRatesForOrder(orderId: string): Promise<ShippingRate[]> {
  await requireAdmin()
  const { settings, parcel, addr } = await buildOrderShipmentData(orderId)

  return getShippingRates({
    clientId: settings.skydropx_client_id,
    clientSecret: settings.skydropx_client_secret,
    originZip: settings.origin_zip,
    originState: settings.origin_state,
    originCity: settings.origin_city,
    originColonia: settings.origin_colonia,
    destZip: addr.zip,
    destState: addr.state ?? '',
    destCity: addr.city ?? '',
    destColonia: addr.colonia ?? '',
    parcel,
  })
}

// ── Crear guía ───────────────────────────────────────────────────────────────

export type ShipmentActionResult = {
  trackingNumber: string
  labelUrl: string | null
  carrier: string
}

export async function createSkydropxShipment(orderId: string, overrideRateId?: string): Promise<ShipmentActionResult> {
  await requireAdmin()

  const { order, settings, parcel, addr } = await buildOrderShipmentData(orderId)

  if (order.tracking_number) throw new Error('esta orden ya tiene guía de envío')

  const rateId = overrideRateId ?? order.shipping_rate_id
  if (!rateId) throw new Error('no hay tarifa seleccionada para crear la guía')

  const addressFrom = {
    name: 'GALLO', email: '', phone: '',
    postalCode: settings.origin_zip, state: settings.origin_state,
    city: settings.origin_city, colonia: settings.origin_colonia, street: '',
  }
  const addressTo = {
    name: order.customer_name ?? 'Cliente',
    email: order.customer_email ?? '',
    phone: order.customer_phone ?? '',
    postalCode: addr.zip,
    state: addr.state ?? '', city: addr.city ?? '',
    colonia: addr.colonia ?? '', street: addr.street ?? '',
  }

  const result = await createShipment({
    clientId: settings.skydropx_client_id,
    clientSecret: settings.skydropx_client_secret,
    rateId,
    addressFrom,
    addressTo,
    parcel,
    contentDescription: 'Merch GALLO',
  })

  // ── 6. Save to order ────────────────────────────────────────────────────────
  await supabaseAdmin.from('orders').update({
    tracking_number: result.trackingNumber,
    skydropx_shipment_id: result.shipmentId,
    label_url: result.labelUrl,
    status: 'shipped',
    updated_at: new Date().toISOString(),
  }).eq('id', orderId)

  revalidatePath(`/casa/ordenes/${orderId}`)
  revalidatePath('/casa/ordenes')

  return {
    trackingNumber: result.trackingNumber,
    labelUrl: result.labelUrl,
    carrier: result.carrier,
  }
}
