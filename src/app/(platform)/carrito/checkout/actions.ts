'use server'

import { supabaseAdmin } from '@/lib/supabase.server'
import { quoteOrder } from '@/lib/checkout.server'
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
  const [{ data: settings }, { data: secrets }] = await Promise.all([
    supabaseAdmin.from('store_settings').select('skydropx_enabled, origin_zip, origin_state, origin_city, origin_colonia, skydropx_markup_pct, skydropx_allowed_carriers').single(),
    supabaseAdmin.from('store_secrets').select('skydropx_client_id, skydropx_client_secret').single(),
  ])

  if (!settings?.skydropx_enabled || !secrets?.skydropx_client_id) return []

  const { data: pkg } = await supabaseAdmin
    .from('packaging_types')
    .select('weight_grams, length_cm, width_cm, height_cm')
    .eq('id', packagingTypeId)
    .single()

  if (!pkg) return []

  try {
    let rates = await getShippingRates({
      clientId: secrets!.skydropx_client_id,
      clientSecret: secrets!.skydropx_client_secret,
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
  saveAddressForUser?: boolean
  discountCode?: string
  discountMxn?: number
  discountCodeId?: string
}

export type OrderResult = { orderId?: string; folioNumber?: number; error?: string }

export async function createOrder(payload: CheckoutPayload): Promise<OrderResult> {
  try {
  const { auth } = await import('@clerk/nextjs/server')
  const Stripe = (await import('stripe')).default

  // ── 1. Verify Stripe payment server-side ────────────────────────────────────
  const [{ data: storeSettings }, { data: storeSecrets }] = await Promise.all([
    supabaseAdmin.from('store_settings').select('stripe_test_mode').eq('id', 1).single(),
    supabaseAdmin.from('store_secrets').select('stripe_sk_test, stripe_sk_live').eq('id', 1).single(),
  ])

  const useTest = storeSettings?.stripe_test_mode ?? true
  const dbKey = useTest ? storeSecrets?.stripe_sk_test : storeSecrets?.stripe_sk_live
  const stripeKey = (dbKey && dbKey.length > 10) ? dbKey : process.env.STRIPE_SECRET_KEY!
  const stripe = new Stripe(stripeKey)

  const pi = await stripe.paymentIntents.retrieve(payload.stripePaymentId)
  if (pi.status !== 'succeeded') {
    return { error: 'el pago no está confirmado, intenta de nuevo o contacta soporte' }
  }

  // ── 1.5. Idempotency — one PaymentIntent, one order ─────────────────────────
  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('id, folio_number')
    .eq('stripe_payment_id', payload.stripePaymentId)
    .maybeSingle()

  if (existing) {
    return { orderId: existing.id as string, folioNumber: existing.folio_number as number }
  }

  // ── 2. Recompute the amount from the DB, then check it against the charge ───
  // Same function the PaymentIntent was built from, so the two cannot drift.
  const quoted = await quoteOrder({
    items: payload.items.map(i => ({ productId: i.productId, qty: i.qty })),
    shippingMxn: payload.shippingMxn,
    discountCode: payload.discountCode,
  })

  if ('error' in quoted) return { error: quoted.error }

  const { subtotal, shippingMxn, discountMxn, total, finalAmount, discountCodeId, prices } = quoted.quote

  // Undercharge is the attack: the client talked the PaymentIntent down below
  // what the cart is actually worth. Refuse it.
  if (pi.amount < finalAmount) {
    console.error(
      `[createOrder] undercharge for ${payload.stripePaymentId}: charged ${pi.amount}, expected ${finalAmount}`,
    )
    return { error: 'el monto cobrado no coincide con el del pedido. no registramos la orden — contacta soporte con tu ID de pago: ' + payload.stripePaymentId }
  }

  // Overcharge means the customer already paid; refusing here would leave them
  // charged with nothing to show. Record it and shout in the logs instead.
  if (pi.amount > finalAmount) {
    console.warn(
      `[createOrder] overcharge for ${payload.stripePaymentId}: charged ${pi.amount}, expected ${finalAmount} — registrando la orden de todos modos`,
    )
  }

  const itemsWithRealPrices = payload.items.map(item => ({
    ...item,
    price_mxn: prices.get(item.productId) ?? item.price_mxn,
  }))

  // ── 3. Validate stock availability ──────────────────────────────────────────
  // Inventory lives on product_variants; the products table has no stock column.
  for (const item of payload.items) {
    if (!item.variantId) continue
    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('stock')
      .eq('id', item.variantId)
      .single()
    if (!variant || variant.stock < item.qty) {
      return { error: `sin stock suficiente para: ${item.name}. actualiza tu carrito e intenta de nuevo` }
    }
  }

  const { userId } = await auth()

  // ── 4. Create the order — the PI is verified, so 'paid' is safe ─────────────
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
      shipping_mxn: shippingMxn,
      subtotal_mxn: subtotal,
      discount_code: discountCodeId ? (payload.discountCode ?? null) : null,
      discount_mxn: discountMxn,
      total_mxn: total,
      notes: payload.notes.trim() || null,
      status: 'paid',
      stripe_payment_id: payload.stripePaymentId,
      user_id: userId ?? null,
    })
    .select('id, folio_number')
    .single()

  if (error || !order) return { error: 'tu pago fue procesado pero hubo un error al registrar la orden. contacta soporte con tu ID de pago: ' + payload.stripePaymentId }

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
    if (stockErr) console.error('[createOrder] variant stock decrement failed:', stockErr.message)
  }

  // ── 6.5. Log sale movements (fire-and-forget) ───────────────────────────────
  Promise.allSettled(
    payload.items
      .filter(item => !!item.variantId)
      .map(item =>
        supabaseAdmin.rpc('log_sale_movement', {
          p_product_id: item.productId,
          p_variant_id: item.variantId!,
          p_qty: item.qty,
          p_order_id: order.id,
        })
      )
  ).then(results => {
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[createOrder] movement log ${i} failed:`, r.reason)
    })
  })

  // ── 7. Increment discount code usage ────────────────────────────────────────
  if (discountCodeId) {
    await supabaseAdmin.rpc('increment_discount_uses', { p_code_id: discountCodeId })
  }

  // ── 8. Save address to user profile if requested ────────────────────────────
  if (payload.saveAddressForUser && userId) {
    await supabaseAdmin.from('users').update({
      shipping_address: {
        name: payload.name,
        phone: payload.phone,
        street: payload.street,
        colonia: payload.colonia,
        zip: payload.zip,
        city: payload.city,
        state: payload.state,
      },
    }).eq('clerk_user_id', userId)
  }

  // ── 9. Send emails (fire-and-forget) ────────────────────────────────────────
  const { sendOrderConfirmation, sendAdminNewOrder } = await import('@/lib/emails')
  const orderForEmail = {
    id: order.id as string,
    folio_number: order.folio_number as number,
    customer_name: payload.name,
    customer_email: payload.email,
    total_mxn: total,
    subtotal_mxn: subtotal,
    shipping_mxn: shippingMxn,
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
  ]).then(results => {
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[email ${i}] failed:`, r.reason)
    })
  })

  return { orderId: order.id, folioNumber: order.folio_number }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error inesperado al procesar el pedido' }
  }
}
