import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { sendOrderConfirmation, sendAdminNewOrder } from '@/lib/emails'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'webhook signature inválida' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent

    const { data: order } = await supabaseAdmin
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('stripe_payment_id', pi.id)
      .select('*, order_items(*)')
      .single()

    if (order) {
      await Promise.allSettled([
        sendOrderConfirmation(order),
        sendAdminNewOrder(order),
      ])
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    await supabaseAdmin
      .from('orders')
      .update({ status: 'failed' })
      .eq('stripe_payment_id', pi.id)
  }

  return NextResponse.json({ received: true })
}
