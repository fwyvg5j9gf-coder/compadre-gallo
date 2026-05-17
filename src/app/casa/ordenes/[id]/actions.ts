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
    .select('skydropx_client_id, skydropx_client_secret, origin_zip, origin_state, origin_city, origin_colonia, origin_street, origin_phone, origin_email, origin_name, skydropx_enabled')
    .single()
  if (!settings?.skydropx_enabled) throw new Error('Skydropx no está habilitado en ajustes de la tienda')
  if (!settings.skydropx_client_id) throw new Error('falta la clave de cliente de Skydropx en configuración')
  if (!settings.skydropx_client_secret) throw new Error('falta la clave secreta de Skydropx en configuración')
  if (!settings.origin_zip) throw new Error('falta el código postal de origen en configuración')
  if (!settings.origin_state) throw new Error('falta el estado de origen en configuración')
  if (!settings.origin_city) throw new Error('falta la ciudad de origen en configuración')
  if (!settings.origin_street) throw new Error('falta la calle de origen en configuración de Skydropx')
  if (!settings.origin_phone) throw new Error('falta el teléfono de origen en configuración de Skydropx')
  if (!settings.origin_email) throw new Error('falta el email de origen en configuración de Skydropx')

  const productIds = (order.order_items as { product_id: string | null }[])
    .map(i => i.product_id).filter(Boolean) as string[]

  let parcel = { weight_kg: 0.5, length_cm: 30, width_cm: 20, height_cm: 10, packageType: '', consignmentNote: 'Merch' }
  if (productIds.length > 0) {
    const { data: product } = await supabaseAdmin
      .from('products').select('packaging_type_id, weight_grams').eq('id', productIds[0]).single()
    if (product?.packaging_type_id) {
      const { data: pkg } = await supabaseAdmin
        .from('packaging_types').select('weight_grams, length_cm, width_cm, height_cm, skydropx_package_type, consignment_note').eq('id', product.packaging_type_id).single()
      if (pkg) {
        parcel = {
          weight_kg: Math.max(0.01, (product.weight_grams ?? pkg.weight_grams) / 1000),
          length_cm: Number(pkg.length_cm), width_cm: Number(pkg.width_cm), height_cm: Number(pkg.height_cm),
          packageType: pkg.skydropx_package_type ?? '',
          consignmentNote: pkg.consignment_note || 'Merch',
        }
      }
    }
  }

  const addr = order.shipping_address as Record<string, string> | null
  if (!addr?.zip) throw new Error('la orden no tiene dirección de envío completa')

  return { order, settings, parcel, addr }
}

// ── Cotizar (para órdenes sin rate_id de Skydropx) ──────────────────────────

export type RatesResult = { rates: ShippingRate[]; error?: string }

export async function getSkydropxRatesForOrder(orderId: string): Promise<RatesResult> {
  try {
    await requireAdmin()
    const { settings, parcel, addr } = await buildOrderShipmentData(orderId)
    const rates = await getShippingRates({
      clientId: settings.skydropx_client_id,
      clientSecret: settings.skydropx_client_secret,
      originZip: settings.origin_zip,
      originState: settings.origin_state,
      originCity: settings.origin_city,
      originColonia: settings.origin_colonia ?? '',
      destZip: addr.zip,
      destState: addr.state ?? '',
      destCity: addr.city ?? '',
      destColonia: addr.colonia ?? '',
      parcel,
    })
    if (rates.length === 0) return { rates: [], error: 'Skydropx no devolvió tarifas para esta dirección' }
    return { rates }
  } catch (e) {
    return { rates: [], error: e instanceof Error ? e.message : 'error cotizando envío' }
  }
}

// ── Crear guía ───────────────────────────────────────────────────────────────

export type ShipmentActionResult = { trackingNumber: string; labelUrl: string | null; carrier: string }
export type ShipmentResult = { data?: ShipmentActionResult; error?: string }

export async function createSkydropxShipment(orderId: string, overrideRateId?: string): Promise<ShipmentResult> {
  try {
    await requireAdmin()
    const { order, settings, parcel, addr } = await buildOrderShipmentData(orderId)

    if (order.tracking_number) return { error: 'esta orden ya tiene guía de envío' }

    const rateId = overrideRateId ?? order.shipping_rate_id
    if (!rateId) return { error: 'no hay tarifa seleccionada para crear la guía' }

    const addressFrom = {
      name: settings.origin_name || 'GALLO',
      email: settings.origin_email,
      phone: settings.origin_phone,
      postalCode: settings.origin_zip,
      state: settings.origin_state,
      city: settings.origin_city,
      colonia: settings.origin_colonia ?? '',
      street: settings.origin_street,
      reference: settings.origin_name || 'GALLO',
    }
    const addressTo = {
      name: order.customer_name ?? 'Cliente',
      email: order.customer_email ?? '',
      phone: order.customer_phone ?? '',
      postalCode: addr.zip,
      state: addr.state ?? '',
      city: addr.city ?? '',
      colonia: addr.colonia ?? '',
      street: addr.street ?? '',
      reference: order.customer_name ?? 'Cliente',
    }

    if (!parcel.packageType) return { error: 'configura el tipo de paquete Skydropx en el embalaje del producto antes de crear la guía' }

    const result = await createShipment({
      clientId: settings.skydropx_client_id,
      clientSecret: settings.skydropx_client_secret,
      rateId,
      addressFrom,
      addressTo,
      parcel,
      packageType: parcel.packageType,
      contentDescription: parcel.consignmentNote,
    })

    await supabaseAdmin.from('orders').update({
      tracking_number: result.trackingNumber,
      skydropx_shipment_id: result.shipmentId,
      label_url: result.labelUrl,
      status: 'shipped',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)

    revalidatePath(`/casa/ordenes/${orderId}`)
    revalidatePath('/casa/ordenes')

    return { data: { trackingNumber: result.trackingNumber, labelUrl: result.labelUrl, carrier: result.carrier } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al crear la guía' }
  }
}
