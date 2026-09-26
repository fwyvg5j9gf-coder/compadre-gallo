'use server'

import { supabaseAdmin } from '@/lib/supabase.server'
import { quoteOrder } from '@/lib/checkout.server'
import { getCheckoutShippingOptions, type ShippingOption, type ShippingQuote } from '@/lib/shipping.server'
import type { CartItem } from '@/context/CartContext'

// Opciones de envío para el checkout. El navegador manda solo a dónde va y
// qué lleva; el servidor arma el paquete, cotiza con Envia y regresa opciones
// firmadas. El cobro después solo acepta una de estas firmas.
export async function getShippingOptions(
  dest: { zip: string; state: string; city: string; colonia: string },
  items: { productId: string; qty: number }[],
): Promise<{ options: ShippingOption[]; free: boolean }> {
  const clean = (v: unknown) => String(v ?? '').slice(0, 120)
  const { options, free } = await getCheckoutShippingOptions(
    { zip: clean(dest.zip), state: clean(dest.state), city: clean(dest.city), colonia: clean(dest.colonia) },
    (items ?? []).slice(0, 50).map(i => ({ productId: String(i.productId), qty: Number(i.qty) || 1 })),
  )
  return { options, free }
}

export type CheckoutPayload = {
  name: string
  email: string
  phone: string
  street: string
  number: string
  zip: string
  state: string
  city: string
  colonia: string
  notes: string
  shippingQuote: ShippingQuote
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
    shipping: { quote: payload.shippingQuote, zip: payload.zip, allowExpired: true },
    discountCode: payload.discountCode,
  })

  if ('error' in quoted) return { error: quoted.error }

  const { subtotal, shippingMxn, discountMxn, total, finalAmount, discountCodeId, prices, shippingId } = quoted.quote

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
      // El cobro ya pasó, pero la pieza se vendió mientras pagaba (el stock se
      // revisa también antes de cobrar; esto cubre la carrera). Sin pieza no
      // hay pedido, así que se reembolsa completo en vez de dejarlo cobrado.
      try {
        await stripe.refunds.create({ payment_intent: payload.stripePaymentId })
      } catch (refundErr) {
        console.error(`[createOrder] reembolso falló para ${payload.stripePaymentId}:`, refundErr)
        return { error: `se agotó ${item.name} mientras pagabas y no pudimos reembolsarte en automático. escríbenos a hola@compadregallo.com con tu ID de pago: ${payload.stripePaymentId}` }
      }
      return { error: `se agotó ${item.name} mientras pagabas. ya te reembolsamos el cargo completo; puede tardar unos días en verse en tu estado de cuenta.` }
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
        number: payload.number,
        colonia: payload.colonia,
        zip: payload.zip,
        state: payload.state,
        city: payload.city,
      },
      // La paquetería sale de la opción firmada ("dhl:express"), no de un
      // texto del navegador. La tarifa fija no tiene paquetería todavía.
      shipping_carrier: shippingId.includes(':') ? shippingId.split(':')[0].toUpperCase() : null,
      shipping_service: shippingId.includes(':') ? shippingId.split(':').slice(1).join(':') : null,
      shipping_rate_id: shippingId,
      shipping_provider: shippingId.includes(':') ? 'envia' : null,
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
        number: payload.number,
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
    discount_mxn: discountMxn,
    status: 'paid',
    shipping_address: { street: `${payload.street} ${payload.number}`.trim(), colonia: payload.colonia, zip: payload.zip, state: payload.state, city: payload.city },
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
