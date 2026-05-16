import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase.server'

async function getStripeClient() {
  // Prefer keys stored in DB (configurable from admin)
  const { data: s } = await supabaseAdmin
    .from('store_settings')
    .select('stripe_test_mode, stripe_sk_test, stripe_sk_live')
    .eq('id', 1)
    .single()

  const useTest = s?.stripe_test_mode ?? true
  const dbKey = useTest ? s?.stripe_sk_test : s?.stripe_sk_live

  // Fall back to env vars if DB key not configured
  const key = (dbKey && dbKey.length > 10) ? dbKey : process.env.STRIPE_SECRET_KEY!
  return new Stripe(key)
}

async function getMarkupPct(): Promise<number> {
  const { data: s } = await supabaseAdmin
    .from('store_settings')
    .select('stripe_markup_pct')
    .eq('id', 1)
    .single()
  return Number(s?.stripe_markup_pct ?? 0)
}

export async function POST(req: NextRequest) {
  try {
    const { amountCents } = await req.json() as { amountCents: number }
    if (!amountCents || amountCents < 100) {
      return NextResponse.json({ error: 'monto inválido' }, { status: 400 })
    }

    const [stripe, markupPct] = await Promise.all([getStripeClient(), getMarkupPct()])

    // Apply markup to cover gateway commission
    const finalAmount = markupPct > 0
      ? Math.round(amountCents * (1 + markupPct / 100))
      : amountCents

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
