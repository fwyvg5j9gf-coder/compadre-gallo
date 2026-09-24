import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { findShortStock, quoteOrder } from '@/lib/checkout.server'

async function getStripeClient() {
  const [{ data: s }, { data: secrets }] = await Promise.all([
    supabaseAdmin.from('store_settings').select('stripe_test_mode').eq('id', 1).single(),
    supabaseAdmin.from('store_secrets').select('stripe_sk_test, stripe_sk_live').eq('id', 1).single(),
  ])

  const useTest = s?.stripe_test_mode ?? true
  const dbKey = useTest ? secrets?.stripe_sk_test : secrets?.stripe_sk_live
  const key = (dbKey && dbKey.length > 10) ? dbKey : process.env.STRIPE_SECRET_KEY!

  return new Stripe(key)
}

export async function POST(req: NextRequest) {
  try {
    // Cada llamada crea un PaymentIntent real en Stripe: sin límite, un
    // script puede llenar el dashboard de intents basura.
    const { allowed, retryAfterSeconds } = checkRateLimit(`create-intent:${getClientIp(req)}`, {
      limit: 20,
      windowMs: 60_000,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: 'demasiados intentos, espera un momento' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      )
    }

    const body = await req.json() as {
      items?: { productId: string; qty: number; size?: string; name?: string }[]
      shippingMxn?: number
      discountCode?: string
    }

    // Prices, the discount and the markup are all resolved server-side.
    // `discountMxn` is deliberately not read from the body — see checkout.server.ts.
    const quoted = await quoteOrder({
      items: body.items,
      shippingMxn: body.shippingMxn,
      discountCode: body.discountCode,
    })

    if ('error' in quoted) {
      return NextResponse.json({ error: quoted.error }, { status: 400 })
    }

    // Sin piezas no se cobra: se revisa el stock antes de crear el cobro.
    const withSize = (body.items ?? []).filter(i => typeof i.size === 'string')
    const short = await findShortStock(withSize.map(i => ({ productId: i.productId, size: i.size!, qty: i.qty, name: i.name })))
    if (short) {
      return NextResponse.json(
        { error: `ya no hay suficientes piezas de ${short.name ?? 'un producto'}. ajusta tu carrito e intenta de nuevo` },
        { status: 409 },
      )
    }

    const stripe = await getStripeClient()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: quoted.quote.finalAmount,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      finalAmount: quoted.quote.finalAmount,
      discountMxn: quoted.quote.discountMxn,
    })
  } catch (err) {
    console.error('stripe create-intent error:', err)
    return NextResponse.json({ error: 'error al iniciar el pago' }, { status: 500 })
  }
}
