'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdmin } from '@/lib/auth.server'
import { createShipment, getShippingRates, getShipmentStatus, cancelShipmentInSkydropx, type ShippingRate, type ShipmentStatus } from '@/lib/skydropx'

export type SkydropxEvent = {
  type: 'created' | 'cancelled'
  at: string
  tracking?: string
  carrier?: string
  cost_mxn?: number
  shipment_id?: string
  label_url?: string
}

async function appendSkydropxEvent(orderId: string, event: SkydropxEvent) {
  const { data } = await supabaseAdmin.from('orders').select('skydropx_events').eq('id', orderId).single()
  const events: SkydropxEvent[] = (data?.skydropx_events as SkydropxEvent[] | null) ?? []
  events.push(event)
  await supabaseAdmin.from('orders').update({ skydropx_events: events }).eq('id', orderId)
}

const VALID_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'refunded', 'failed'] as const

export async function updateOrderStatus(orderId: string, status: string) {
  await requireAdmin()
  if (!(VALID_STATUSES as readonly string[]).includes(status)) throw new Error('estado inválido')

  const { data: order } = await supabaseAdmin
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('customer_email, customer_name, folio_number')
    .single()

  revalidatePath(`/casa/ordenes/${orderId}`)
  revalidatePath('/casa/ordenes')

  if (order && (status === 'cancelled' || status === 'refunded')) {
    const { sendOrderCancelled } = await import('@/lib/emails')
    sendOrderCancelled({ ...order, status: status as 'cancelled' | 'refunded' }).catch(console.error)
  }
}

export async function deleteOrder(orderId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin.from('orders').delete().eq('id', orderId)
    if (error) return { error: error.message }
    revalidatePath('/casa/ordenes')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al eliminar' }
  }
}

export async function updateOrderDetails(orderId: string, formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    const street  = (formData.get('addr_street')  as string ?? '').trim()
    const colonia = (formData.get('addr_colonia') as string ?? '').trim()
    const zip     = (formData.get('addr_zip')     as string ?? '').trim()
    const city    = (formData.get('addr_city')    as string ?? '').trim()
    const state   = (formData.get('addr_state')   as string ?? '').trim()
    const shippingAddress = (street || zip) ? { street, colonia, zip, city, state } : null

    const { error } = await supabaseAdmin.from('orders').update({
      customer_name:  (formData.get('customer_name')  as string ?? '').trim() || null,
      customer_email: (formData.get('customer_email') as string ?? '').trim(),
      customer_phone: (formData.get('customer_phone') as string ?? '').trim() || null,
      notes: (formData.get('notes') as string ?? '').trim() || null,
      shipping_address: shippingAddress,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)

    if (error) return { error: error.message }
    revalidatePath(`/casa/ordenes/${orderId}`)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al guardar' }
  }
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

// ── Readiness check (sin llamar a Skydropx) ──────────────────────────────────

export type ReadinessItem = { label: string; ok: boolean; detail?: string }

export async function checkShipmentReadiness(orderId: string): Promise<{ ready: boolean; items: ReadinessItem[] }> {
  await requireAdmin()

  const [{ data: order }, { data: settings }] = await Promise.all([
    supabaseAdmin.from('orders').select('*, order_items(product_id)').eq('id', orderId).single(),
    supabaseAdmin.from('store_settings').select(
      'skydropx_enabled, skydropx_client_id, skydropx_client_secret, origin_zip, origin_state, origin_city, origin_colonia, origin_street, origin_phone, origin_email'
    ).single(),
  ])

  const addr = (order?.shipping_address ?? null) as Record<string, string> | null

  // SAT codes
  let packageType = '', consignmentNote = ''
  const productIds = ((order?.order_items ?? []) as { product_id: string | null }[])
    .map(i => i.product_id).filter(Boolean) as string[]
  if (productIds.length > 0) {
    const { data: product } = await supabaseAdmin
      .from('products').select('packaging_type_id').eq('id', productIds[0]).single()
    if (product?.packaging_type_id) {
      const { data: pkg } = await supabaseAdmin
        .from('packaging_types').select('skydropx_package_type, consignment_note').eq('id', product.packaging_type_id).single()
      packageType = pkg?.skydropx_package_type ?? ''
      consignmentNote = pkg?.consignment_note ?? ''
    }
  }

  const isNumericSat = (v: string) => /^\d{8}$/.test(v.trim())

  const items: ReadinessItem[] = [
    {
      label: 'skydropx habilitado',
      ok: !!settings?.skydropx_enabled,
    },
    {
      label: 'credenciales',
      ok: !!(settings?.skydropx_client_id && settings?.skydropx_client_secret),
      detail: !settings?.skydropx_client_id ? 'falta client_id' : !settings?.skydropx_client_secret ? 'falta client_secret' : undefined,
    },
    {
      label: 'origen configurado',
      ok: !!(settings?.origin_zip && settings?.origin_state && settings?.origin_city && settings?.origin_street && settings?.origin_phone && settings?.origin_email),
      detail: ['origin_zip','origin_state','origin_city','origin_street','origin_phone','origin_email']
        .filter(k => !settings?.[k as keyof typeof settings]).map(k => k.replace('origin_', '')).join(', ') || undefined,
    },
    {
      label: 'dirección del cliente',
      ok: !!(addr?.zip && addr?.state && addr?.city && addr?.street),
      detail: !addr ? 'sin dirección' : ['zip','state','city','street'].filter(k => !addr[k]).join(', ') || undefined,
    },
    {
      label: 'contacto del cliente',
      ok: !!(order?.customer_name && order?.customer_phone),
      detail: !order?.customer_name ? 'falta nombre' : !order?.customer_phone ? 'falta teléfono' : undefined,
    },
    {
      label: 'código SAT de empaque',
      ok: !!packageType,
      detail: !packageType ? 'configura skydropx_package_type en el tipo de embalaje del producto' : packageType,
    },
    {
      label: 'código SAT de producto',
      ok: isNumericSat(consignmentNote),
      detail: !consignmentNote ? 'configura consignment_note en el tipo de embalaje' : !isNumericSat(consignmentNote) ? `"${consignmentNote}" no es un código UNSPSC válido` : consignmentNote,
    },
  ]

  return { ready: items.every(i => i.ok), items }
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
      parcel: { ...parcel, packageType: parcel.packageType || undefined, consignmentNote: parcel.consignmentNote || undefined },
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

export async function createSkydropxShipment(orderId: string, overrideRateId?: string, overrideQuotationId?: string, protection = false): Promise<ShipmentResult> {
  try {
    await requireAdmin()
    const { order, settings, parcel, addr } = await buildOrderShipmentData(orderId)

    if (order.tracking_number) return { error: 'esta orden ya tiene guía de envío' }


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

    // Si no tenemos quotation_id fresco, re-cotizamos para obtenerlo
    let rateId = overrideRateId ?? order.shipping_rate_id
    let quotationId = overrideQuotationId ?? ''

    if (!quotationId) {
      const freshRates = await getShippingRates({
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
        parcel: { ...parcel, packageType: parcel.packageType || undefined, consignmentNote: parcel.consignmentNote || undefined },
      })
      if (freshRates.length === 0) return { error: 'no se obtuvieron tarifas para re-cotizar' }

      // Usar el rate previamente seleccionado si existe, si no el más barato
      const matched = rateId ? freshRates.find(r => r.rate_id === rateId) : null
      const chosen = matched ?? freshRates[0]
      rateId = chosen.rate_id
      quotationId = chosen.quotation_id
    }

    if (!rateId) return { error: 'no hay tarifa seleccionada para crear la guía' }

    const result = await createShipment({
      clientId: settings.skydropx_client_id,
      clientSecret: settings.skydropx_client_secret,
      rateId,
      quotationId,
      addressFrom,
      addressTo,
      parcel,
      packagingCode: parcel.packageType,
      classCode: parcel.consignmentNote,
      protection,
    })

    const costMxn = result.cost != null ? Math.round(result.cost * 100) : null

    await supabaseAdmin.from('orders').update({
      tracking_number: result.trackingNumber,
      skydropx_shipment_id: result.shipmentId,
      label_url: result.labelUrl,
      skydropx_cost_mxn: costMxn,
      shipping_carrier: result.carrier || null,
      status: 'shipped',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)

    await appendSkydropxEvent(orderId, {
      type: 'created',
      at: new Date().toISOString(),
      tracking: result.trackingNumber,
      carrier: result.carrier,
      cost_mxn: result.cost ?? undefined,
      shipment_id: result.shipmentId,
      label_url: result.labelUrl ?? undefined,
    })

    // Notificar al cliente que su pedido está en camino (fire-and-forget)
    const { data: orderForEmail } = await supabaseAdmin
      .from('orders').select('customer_email, customer_name, folio_number').eq('id', orderId).single()
    if (orderForEmail) {
      const { sendShipmentNotification } = await import('@/lib/emails')
      sendShipmentNotification(orderForEmail, result.trackingNumber, result.carrier || null).catch(console.error)
    }

    revalidatePath(`/casa/ordenes/${orderId}`)
    revalidatePath('/casa/ordenes')

    return { data: { trackingNumber: result.trackingNumber, labelUrl: result.labelUrl, carrier: result.carrier } }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al crear la guía' }
  }
}

// ── Rastrear guía ────────────────────────────────────────────────────────────

export type ShipmentStatusResult = { data?: ShipmentStatus; error?: string }

export async function fetchSkydropxShipmentStatus(orderId: string): Promise<ShipmentStatusResult> {
  try {
    await requireAdmin()
    const { data: order } = await supabaseAdmin.from('orders').select('skydropx_shipment_id, label_url').eq('id', orderId).single()
    if (!order?.skydropx_shipment_id) return { error: 'esta orden no tiene shipment ID de Skydropx' }

    const { data: settings } = await supabaseAdmin
      .from('store_settings').select('skydropx_client_id, skydropx_client_secret').single()
    if (!settings?.skydropx_client_id) return { error: 'faltan credenciales de Skydropx' }

    const status = await getShipmentStatus(settings.skydropx_client_id, settings.skydropx_client_secret, order.skydropx_shipment_id)

    // Si la orden no tiene label_url pero Skydropx sí lo devuelve, guardarlo
    if (status.labelUrl && !order.label_url) {
      await supabaseAdmin.from('orders').update({ label_url: status.labelUrl }).eq('id', orderId)
      revalidatePath(`/casa/ordenes/${orderId}`)
    }

    return { data: status }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al consultar el estado del envío' }
  }
}

// ── Cancelar guía (solo local — Skydropx no expone endpoint de cancel) ───────

export async function cancelSkydropxShipment(orderId: string, reason: string): Promise<{ error?: string; skydropxError?: string }> {
  try {
    await requireAdmin()

    const { data: order } = await supabaseAdmin
      .from('orders').select('skydropx_shipment_id').eq('id', orderId).single()
    const shipmentId = (order as Record<string, unknown> | null)?.skydropx_shipment_id as string | null

    let skydropxError: string | undefined

    if (shipmentId) {
      const { data: settings } = await supabaseAdmin
        .from('store_settings').select('skydropx_client_id, skydropx_client_secret').single()

      if (settings?.skydropx_client_id) {
        const result = await cancelShipmentInSkydropx(
          settings.skydropx_client_id,
          settings.skydropx_client_secret,
          shipmentId,
          reason || 'Cancelado desde el panel de administración',
        )
        if (!result.ok) skydropxError = result.error
      }
    }

    await appendSkydropxEvent(orderId, {
      type: 'cancelled',
      at: new Date().toISOString(),
    })

    await supabaseAdmin.from('orders').update({
      tracking_number: null,
      skydropx_shipment_id: null,
      label_url: null,
      skydropx_cost_mxn: null,
      status: 'paid',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)

    revalidatePath(`/casa/ordenes/${orderId}`)
    revalidatePath('/casa/ordenes')
    return skydropxError ? { skydropxError } : {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al cancelar' }
  }
}
