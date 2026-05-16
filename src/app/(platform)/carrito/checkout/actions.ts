'use server'

import { supabaseAdmin } from '@/lib/supabase.server'
import { getShippingRates } from '@/lib/skydropx'
import type { ShippingRate } from '@/lib/skydropx'
import type { CartItem } from '@/context/CartContext'

export async function getRatesForCheckout(
  destZip: string,
  destState: string,
  destCity: string,
  destColonia: string,
  packagingTypeId: string,
): Promise<ShippingRate[]> {
  const { data: settings } = await supabaseAdmin
    .from('store_settings')
    .select('skydropx_enabled, skydropx_client_id, skydropx_client_secret, origin_zip, origin_state, origin_city, origin_colonia, skydropx_markup_pct, skydropx_allowed_carriers')
    .single()

  if (!settings?.skydropx_enabled || !settings.skydropx_client_id) return []

  const { data: pkg } = await supabaseAdmin
    .from('packaging_types')
    .select('weight_grams, length_cm, width_cm, height_cm')
    .eq('id', packagingTypeId)
    .single()

  if (!pkg) return []

  try {
    let rates = await getShippingRates({
      clientId: settings.skydropx_client_id,
      clientSecret: settings.skydropx_client_secret,
      originZip: settings.origin_zip,
      originState: settings.origin_state,
      originCity: settings.origin_city,
      originColonia: settings.origin_colonia,
      destZip,
      destState,
      destCity,
      destColonia,
      parcel: {
        weight_kg: Math.max(0.01, pkg.weight_grams / 1000),
        length_cm: Number(pkg.length_cm),
        width_cm: Number(pkg.width_cm),
        height_cm: Number(pkg.height_cm),
      },
    })

    // Filter by allowed carriers if configured
    const allowed = settings.skydropx_allowed_carriers as string[] | null
    if (allowed && allowed.length > 0) {
      rates = rates.filter(r => allowed.some(c => r.carrier.toLowerCase().includes(c.toLowerCase())))
    }

    // Apply markup percentage
    const markup = Number(settings.skydropx_markup_pct ?? 0)
    if (markup > 0) {
      rates = rates.map(r => ({ ...r, total_mxn: r.total_mxn * (1 + markup / 100) }))
    }

    return rates
  } catch {
    return []
  }
}

export type CheckoutPayload = {
  name: string
  email: string
  phone: string
  street: string
  zip: string
  state: string
  city: string
  colonia: string
  notes: string
  shippingRateId: string | null
  shippingCarrier: string | null
  shippingMxn: number
  stripePaymentId: string
  items: CartItem[]
}

export async function createOrder(payload: CheckoutPayload): Promise<{ orderId: string; folioNumber: number }> {
  const { auth } = await import('@clerk/nextjs/server')
  const { sendOrderConfirmation, sendAdminNewOrder } = await import('@/lib/emails')

  const { userId } = await auth()
  const subtotal = payload.items.reduce((s, i) => s + i.price_mxn * i.qty, 0)
  const total = subtotal + payload.shippingMxn

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_name: payload.name,
      customer_email: payload.email,
      customer_phone: payload.phone,
      shipping_address: {
        street: payload.street,
        colonia: payload.colonia,
        zip: payload.zip,
        state: payload.state,
        city: payload.city,
      },
      shipping_carrier: payload.shippingCarrier,
      shipping_rate_id: payload.shippingRateId,
      shipping_mxn: payload.shippingMxn,
      subtotal_mxn: subtotal,
      total_mxn: total,
      notes: payload.notes || null,
      status: 'paid',
      stripe_payment_id: payload.stripePaymentId,
      user_id: userId ?? null,
    })
    .select('id, folio_number, order_items(*)')
    .single()

  if (error || !order) throw new Error('Error creando la orden')

  await supabaseAdmin.from('order_items').insert(
    payload.items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      size: item.size,
      product_name: item.name,
      unit_price_mxn: item.price_mxn,
      quantity: item.qty,
    })),
  )

  // Decrementar stock por variante
  for (const item of payload.items) {
    if (!item.variantId) continue
    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('stock')
      .eq('id', item.variantId)
      .single()
    if (variant) {
      await supabaseAdmin
        .from('product_variants')
        .update({ stock: Math.max(0, variant.stock - item.qty) })
        .eq('id', item.variantId)
    }
  }

  // Correos — fire and forget
  const orderForEmail = {
    id: order.id as string,
    folio_number: order.folio_number as number,
    customer_name: payload.name,
    customer_email: payload.email,
    total_mxn: total,
    subtotal_mxn: subtotal,
    shipping_mxn: payload.shippingMxn,
    status: 'paid',
    shipping_address: { street: payload.street, colonia: payload.colonia, zip: payload.zip, state: payload.state, city: payload.city },
    tracking_number: null,
    order_items: payload.items.map(i => ({
      product_name: i.name,
      quantity: i.qty,
      unit_price_mxn: i.price_mxn,
    })),
  }
  Promise.allSettled([
    sendOrderConfirmation(orderForEmail),
    sendAdminNewOrder(orderForEmail),
  ]).catch(console.error)

  return { orderId: order.id, folioNumber: order.folio_number }
}
