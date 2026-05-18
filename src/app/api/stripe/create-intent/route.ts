import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase.server'

async function getStripeClient() {
  const { data: s } = await supabaseAdmin
    .from('store_settings')
    .select('stripe_test_mode, stripe_sk_test, stripe_sk_live, stripe_markup_pct')
    .eq('id', 1)
    .single()

  const useTest = s?.stripe_test_mode ?? true
  const dbKey = useTest ? s?.stripe_sk_test : s?.stripe_sk_live
  const key = (dbKey && dbKey.length > 10) ? dbKey : process.env.STRIPE_SECRET_KEY!
  const markupPct = Number(s?.stripe_markup_pct ?? 0)

  return { stripe: new Stripe(key), markupPct }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      items?: { productId: string; qty: number }[]
      shippingMxn?: number
      discountMxn?: number
    }

    const { items, shippingMxn = 0, discountMxn = 0 } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'carrito vacío' }, { status: 400 })
    }

    // Fetch real prices from DB — never trust client-submitted prices
    const productIds = [...new Set(items.map(i => i.productId))]
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, price_mxn, is_published')
      .in('id', productIds)

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'productos no encontrados' }, { status: 400 })
    }

    const priceMap = new Map(products.map(p => [p.id, p.price_mxn]))

    const subtotal = items.reduce((s, i) => {
      const price = priceMap.get(i.productId) ?? 0
      return s + price * Math.max(1, Math.round(i.qty))
    }, 0)

    const total = Math.max(100, subtotal + shippingMxn - discountMxn)

    if (total < 100) {
      return NextResponse.json({ error: 'monto inválido' }, { status: 400 })
    }

    const { stripe, markupPct } = await getStripeClient()

    const finalAmount = markupPct > 0
      ? Math.round(total * (1 + markupPct / 100))
      : total

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      finalAmount,
    })
  } catch (err) {
    console.error('stripe create-intent error:', err)
    return NextResponse.json({ error: 'error al iniciar el pago' }, { status: 500 })
  }
}
