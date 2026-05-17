import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase.server'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'firma faltante' }, { status: 400 })
  }

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
      .select('id, status, folio_number, customer_name, customer_email, total_mxn, subtotal_mxn, shipping_mxn, shipping_address, tracking_number, order_items(*)')
      .eq('stripe_payment_id', pi.id)
      .single()

    if (order && order.status !== 'paid') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', order.id)
      // createOrder already sent emails — webhook only fires if that was skipped
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, customer_email, customer_name, folio_number')
      .eq('stripe_payment_id', pi.id)
      .single()

    if (order) {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', order.id)

      const { sendPaymentFailed } = await import('@/lib/emails')
      sendPaymentFailed(order).catch(console.error)
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

    if (piId) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, customer_email, customer_name, folio_number')
        .eq('stripe_payment_id', piId)
        .single()

      if (order) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('id', order.id)

        const { sendOrderCancelled } = await import('@/lib/emails')
        sendOrderCancelled({ ...order, status: 'refunded' }).catch(console.error)
      }
    }
  }

  return NextResponse.json({ received: true })
}
