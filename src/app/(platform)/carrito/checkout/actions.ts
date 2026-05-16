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

    const allowed = settings.skydropx_allowed_carriers as string[] | null
    if (allowed && allowed.length > 0) {
      rates = rates.filter(r => allowed.some(c => r.carrier.toLowerCase().includes(c.toLowerCase())))
    }

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
  const Stripe = (await import('stripe')).default

  // ── 1. Verify Stripe payment server-side ────────────────────────────────────
  const { data: storeSettings } = await supabaseAdmin
    .from('store_settings')
    .select('stripe_test_mode, stripe_sk_test, stripe_sk_live')
    .eq('id', 1)
    .single()

  const useTest = storeSettings?.stripe_test_mode ?? true
  const dbKey = useTest ? storeSettings?.stripe_sk_test : storeSettings?.stripe_sk_live
  const stripeKey = (dbKey && dbKey.length > 10) ? dbKey : process.env.STRIPE_SECRET_KEY!
  const stripe = new Stripe(stripeKey)

  const pi = await stripe.paymentIntents.retrieve(payload.stripePaymentId)
  if (pi.status !== 'succeeded') {
    throw new Error('el pago no está confirmado')
  }

  // ── 2. Fetch real prices from DB (ignore client-submitted prices) ────────────
  const productIds = [...new Set(payload.items.map(i => i.productId))]
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, price_mxn')
    .in('id', productIds)

  const priceMap = new Map((products ?? []).map(p => [p.id, p.price_mxn]))

  const itemsWithRealPrices = payload.items.map(item => ({
    ...item,
    price_mxn: priceMap.get(item.productId) ?? item.price_mxn,
  }))

  // ── 3. Validate stock availability ──────────────────────────────────────────
  for (const item of payload.items) {
    if (!item.variantId) continue
    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('stock')
      .eq('id', item.variantId)
      .single()
    if (!variant || variant.stock < item.qty) {
      throw new Error(`sin stock suficiente para: ${item.name}`)
    }
  }

  const subtotal = itemsWithRealPrices.reduce((s, i) => s + i.price_mxn * i.qty, 0)
  const total = subtotal + payload.shippingMxn

  const { userId } = await auth()

  // ── 4. Create order as 'pending' — webhook will flip it to 'paid' ───────────
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_name: payload.name.trim(),
      customer_email: payload.email.trim().toLowerCase(),
      customer_phone: payload.phone.trim() || null,
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
      notes: payload.notes.trim() || null,
      status: 'paid',        // PI verified above — safe to mark paid
      stripe_payment_id: payload.stripePaymentId,
      user_id: userId ?? null,
    })
    .select('id, folio_number')
    .single()

  if (error || !order) throw new Error('error creando la orden')

  // ── 5. Insert order items ────────────────────────────────────────────────────
  await supabaseAdmin.from('order_items').insert(
    itemsWithRealPrices.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      size: item.size,
      product_name: item.name,
      unit_price_mxn: item.price_mxn,
      quantity: item.qty,
    })),
  )

  // ── 6. Atomic stock decrement ────────────────────────────────────────────────
  for (const item of payload.items) {
    if (!item.variantId) continue
    const { error: stockErr } = await supabaseAdmin.rpc('decrement_stock', {
      p_variant_id: item.variantId,
      p_qty: item.qty,
    })
    if (stockErr) {
      console.error('[createOrder] stock decrement failed:', stockErr.message)
    }
  }

  // ── 7. Send emails (fire-and-forget) ────────────────────────────────────────
  const { sendOrderConfirmation, sendAdminNewOrder } = await import('@/lib/emails')
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
    order_items: itemsWithRealPrices.map(i => ({
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
