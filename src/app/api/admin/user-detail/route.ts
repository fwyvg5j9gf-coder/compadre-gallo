import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrThrow } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrThrow()
    const id = (req.nextUrl.searchParams.get('id') ?? '').trim()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const [userRes, ordersRes, ticketsRes, subsRes] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('clerk_user_id, email, name, username, role, created_at')
        .eq('clerk_user_id', id)
        .single(),
      supabaseAdmin
        .from('orders')
        .select('id, folio_number, status, total_mxn, subtotal_mxn, shipping_mxn, created_at, order_items(product_name, quantity, unit_price_mxn, size)')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('tickets')
        .select('id, folio_code, status, quantity, total_mxn, created_at, shows(venue, city, date, artists(name))')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('artist_subscriptions')
        .select('id, created_at, artists(name, slug, genre, city)')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (userRes.error) return NextResponse.json({ error: 'usuario no encontrado' }, { status: 404 })

    return NextResponse.json({
      user: userRes.data,
      orders: ordersRes.data ?? [],
      tickets: ticketsRes.data ?? [],
      subscriptions: subsRes.data ?? [],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
