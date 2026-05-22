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
    const { showId, qty, slug } = await req.json() as { showId: string; qty: number; slug: string }

    if (!showId || !qty || qty < 1 || qty > 10 || !slug) {
      return NextResponse.json({ error: 'datos inválidos' }, { status: 400 })
    }

    const { data: show } = await supabaseAdmin
      .from('shows')
      .select('id, price_mxn, is_published, venue, city, artists(name)')
      .eq('id', showId)
      .eq('is_published', true)
      .single()

    if (!show) return NextResponse.json({ error: 'show no encontrado' }, { status: 404 })
    if (!show.price_mxn || show.price_mxn < 100) {
      return NextResponse.json({ error: 'este show no tiene precio de boleto' }, { status: 400 })
    }

    const { stripe, markupPct } = await getStripeClient()
    const unitAmount = markupPct > 0
      ? Math.round(show.price_mxn * (1 + markupPct / 100))
      : show.price_mxn

    const artistName = (show.artists as unknown as { name: string } | null)?.name ?? 'artista'
    const origin = req.headers.get('origin') ?? 'https://compadregallo.com'

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'elements',
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: {
            name: `Boleto — ${artistName}`,
            description: `${show.venue}, ${show.city}`,
          },
          unit_amount: unitAmount,
        },
        quantity: qty,
      }],
      mode: 'payment',
      return_url: `${origin}/checkout/${slug}`,
    })

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    })
  } catch (err) {
    console.error('create-ticket-session error:', err)
    return NextResponse.json({ error: 'error al iniciar el pago' }, { status: 500 })
  }
}
