// Server-only money math for checkout.
//
// Both /api/stripe/create-intent and createOrder() must derive the amount from
// this function. They used to compute it independently from client-supplied
// numbers, which meant a crafted request could set `discountMxn` to the
// subtotal (or a negative `shippingMxn`) and charge itself the $1 floor.
//
// Rule of thumb for anything added here: the client may tell us *what* it wants
// to buy and *which* discount code it is claiming. It never tells us a price.

import 'server-only'

import { supabaseAdmin } from '@/lib/supabase.server'
import { validateDiscountCode } from '@/app/casa/descuentos/actions'

export type QuoteItem = { productId: string; qty: number }

export type OrderQuote = {
  subtotal: number
  shippingMxn: number
  discountMxn: number
  total: number
  /** What Stripe should actually charge — total plus the configured markup. */
  finalAmount: number
  discountCodeId: string | null
  /** productId -> unit price in cents, straight from the DB. */
  prices: Map<string, number>
}

/** Stripe's minimum charge for MXN, in cents. */
export const MIN_CHARGE_MXN = 100

export async function quoteOrder(opts: {
  items: QuoteItem[] | undefined
  shippingMxn?: number
  discountCode?: string | null
}): Promise<{ quote: OrderQuote } | { error: string }> {
  const items = opts.items ?? []
  if (items.length === 0) return { error: 'carrito vacío' }

  // Shipping is quoted by Skydropx on the client, so we can't recompute it here
  // without re-quoting. We can at least refuse a negative value — a negative
  // shipping cost is just an unbounded discount wearing a different name.
  const shippingMxn = Math.max(0, Math.round(Number(opts.shippingMxn) || 0))

  const productIds = [...new Set(items.map(i => i.productId))]
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, price_mxn, is_published')
    .in('id', productIds)

  const prices = new Map<string, number>(
    (products ?? [])
      .filter(p => p.is_published)
      .map(p => [p.id as string, p.price_mxn as number]),
  )
  if (prices.size === 0) return { error: 'productos no encontrados' }

  let subtotal = 0
  for (const item of items) {
    const price = prices.get(item.productId)
    if (price === undefined) {
      return { error: 'uno de los productos ya no está disponible' }
    }
    subtotal += price * Math.max(1, Math.round(Number(item.qty) || 1))
  }

  // The discount is re-derived from the code. Whatever amount the client
  // believes it earned is ignored.
  let discountMxn = 0
  let discountCodeId: string | null = null
  const code = (opts.discountCode ?? '').trim()
  if (code) {
    const result = await validateDiscountCode(code, subtotal + shippingMxn)
    if (result.ok) {
      discountMxn = result.discountMxn
      discountCodeId = result.codeId
    }
  }

  const total = Math.max(MIN_CHARGE_MXN, subtotal + shippingMxn - discountMxn)

  const { data: settings } = await supabaseAdmin
    .from('store_settings')
    .select('stripe_markup_pct')
    .eq('id', 1)
    .single()

  const markupPct = Number(settings?.stripe_markup_pct ?? 0)
  const finalAmount = markupPct > 0 ? Math.round(total * (1 + markupPct / 100)) : total

  return {
    quote: { subtotal, shippingMxn, discountMxn, total, finalAmount, discountCodeId, prices },
  }
}

export type StockItem = { productId: string; size: string; qty: number; name?: string }

/**
 * Returns the first item that doesn't have enough stock, or null if all do.
 * Runs before the PaymentIntent is created so nobody gets charged for a piece
 * that is already gone. createOrder() checks again after payment, because the
 * last piece can still sell in between.
 */
export async function findShortStock(items: StockItem[]): Promise<StockItem | null> {
  for (const item of items) {
    const { data } = await supabaseAdmin
      .from('product_variants')
      .select('stock')
      .eq('product_id', item.productId)
      .eq('size', item.size)
      .maybeSingle()
    if (!data || data.stock < item.qty) return item
  }
  return null
}
