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
    .select('skydropx_enabled, skydropx_client_id, skydropx_client_secret, origin_zip, origin_state, origin_city, origin_colonia')
    .single()

  if (!settings?.skydropx_enabled || !settings.skydropx_client_id) return []

  const { data: pkg } = await supabaseAdmin
    .from('packaging_types')
    .select('weight_grams, length_cm, width_cm, height_cm')
    .eq('id', packagingTypeId)
    .single()

  if (!pkg) return []

  try {
    return await getShippingRates({
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
  items: CartItem[]
}

export async function createOrder(payload: CheckoutPayload): Promise<{ orderId: string }> {
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
      status: 'pending',
    })
    .select('id')
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

  return { orderId: order.id }
}
