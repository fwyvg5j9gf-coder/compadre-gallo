import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase.server'

async function getStripeClient() {
  const [{ data: s }, { data: secrets }] = await Promise.all([
    supabaseAdmin.from('store_settings').select('stripe_test_mode, stripe_markup_pct').eq('id', 1).single(),
    supabaseAdmin.from('store_secrets').select('stripe_sk_test, stripe_sk_live').eq('id', 1).single(),
  ])
  const useTest = s?.stripe_test_mode ?? true
  const dbKey = useTest ? secrets?.stripe_sk_test : secrets?.stripe_sk_live
  const key = (dbKey && dbKey.length > 10) ? dbKey : process.env.STRIPE_SECRET_KEY!
  return { stripe: new Stripe(key), markupPct: Number(s?.stripe_markup_pct ?? 0) }
}

export async function POST(req: NextRequest) {
  try {
    const { showId, qty } = await req.json() as { showId: string; qty: number }

    if (!showId || !qty || qty < 1 || qty > 10) {
      return NextResponse.json({ error: 'datos inválidos' }, { status: 400 })
    }

    const { data: show } = await supabaseAdmin
      .from('shows')
      .select('id, price_mxn, is_published, capacity, artist_id')
      .eq('id', showId)
      .eq('is_published', true)
      .single()

    if (!show) return NextResponse.json({ error: 'show no encontrado' }, { status: 404 })
    if (!show.price_mxn || show.price_mxn < 100) {
      return NextResponse.json({ error: 'este show no tiene precio de boleto' }, { status: 400 })
    }

    const subtotal = show.price_mxn * qty
    const { stripe, markupPct } = await getStripeClient()
    const finalAmount = markupPct > 0 ? Math.round(subtotal * (1 + markupPct / 100)) : subtotal

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      metadata: { showId, qty: String(qty) },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      finalAmount,
    })
  } catch (err) {
    console.error('create-ticket-intent error:', err)
    return NextResponse.json({ error: 'error al iniciar el pago' }, { status: 500 })
  }
}
