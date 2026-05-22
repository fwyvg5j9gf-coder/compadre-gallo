'use server'

import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase.server'
import { auth } from '@clerk/nextjs/server'

export type TicketOrderPayload = {
  stripePaymentId: string
  showId: string
  qty: number
  name: string
  email: string
  phone?: string
}

export type TicketOrderResult = { folioCode?: string; error?: string }

export async function createTicketOrder(payload: TicketOrderPayload): Promise<TicketOrderResult> {
  try {
    const { stripePaymentId, showId, qty, name, email, phone } = payload

    // ── 1. Verify Stripe payment ───────────────────────────────────────────────
    const [{ data: storeSettings }, { data: storeSecrets }] = await Promise.all([
      supabaseAdmin.from('store_settings').select('stripe_test_mode').eq('id', 1).single(),
      supabaseAdmin.from('store_secrets').select('stripe_sk_test, stripe_sk_live').eq('id', 1).single(),
    ])
    const useTest = storeSettings?.stripe_test_mode ?? true
    const dbKey = useTest ? storeSecrets?.stripe_sk_test : storeSecrets?.stripe_sk_live
    const stripeKey = (dbKey && dbKey.length > 10) ? dbKey : process.env.STRIPE_SECRET_KEY!
    const stripe = new Stripe(stripeKey)

    const pi = await stripe.paymentIntents.retrieve(stripePaymentId)
    if (pi.status !== 'succeeded') {
      return { error: 'el pago no está confirmado, intenta de nuevo' }
    }

    // ── 2. Fetch real show price ───────────────────────────────────────────────
    const { data: show } = await supabaseAdmin
      .from('shows')
      .select('id, price_mxn, venue, city, date, artist_id')
      .eq('id', showId)
      .single()

    if (!show || !show.price_mxn) {
      return { error: 'show no encontrado' }
    }

    const unitPrice = show.price_mxn
    const totalMxn = unitPrice * qty

    // ── 3. Generate unique folio ───────────────────────────────────────────────
    const folioCode = `T-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

    // ── 4. Get user id if authenticated ───────────────────────────────────────
    const { userId: clerkUserId } = await auth()
    let dbUserId: string | null = null
    if (clerkUserId) {
      const { data: u } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()
      dbUserId = u?.id ?? null
    }

    // ── 5. Insert ticket ───────────────────────────────────────────────────────
    const { data: ticket, error: insertErr } = await supabaseAdmin
      .from('tickets')
      .insert({
        show_id:           showId,
        user_id:           dbUserId,
        customer_name:     name.trim(),
        customer_email:    email.trim().toLowerCase(),
        customer_phone:    phone?.trim() || null,
        quantity:          qty,
        unit_price_mxn:    unitPrice,
        total_mxn:         totalMxn,
        stripe_payment_id: stripePaymentId,
        folio_code:        folioCode,
        status:            'confirmed',
      })
      .select('id')
      .single()

    if (insertErr || !ticket) {
      return { error: 'tu pago fue procesado pero hubo un error al registrar el boleto. contacta soporte con ID: ' + stripePaymentId }
    }

    // ── 6. Send confirmation email (fire-and-forget) ───────────────────────────
    const { sendTicketConfirmation } = await import('@/lib/emails')
    sendTicketConfirmation({
      customerName: name.trim(),
      customerEmail: email.trim().toLowerCase(),
      folioCode,
      quantity: qty,
      unitPriceMxn: unitPrice,
      totalMxn,
      artistId: show.artist_id,
      venue: show.venue,
      city: show.city,
      date: show.date,
    }).catch(e => console.error('[sendTicketConfirmation] failed:', e))

    return { folioCode }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error inesperado' }
  }
}
