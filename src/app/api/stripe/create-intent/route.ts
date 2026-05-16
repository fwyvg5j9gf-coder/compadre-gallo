import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { amountCents } = await req.json() as { amountCents: number }
    if (!amountCents || amountCents < 100) {
      return NextResponse.json({ error: 'monto inválido' }, { status: 400 })
    }

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: amountCents,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('stripe create-intent error:', msg)
    return NextResponse.json({ error: 'error al iniciar el pago', detail: msg, keyHint: (process.env.STRIPE_SECRET_KEY ?? 'undefined').slice(0, 8) }, { status: 500 })
  }
}
