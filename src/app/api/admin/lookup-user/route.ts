import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdminOrThrow } from '@/lib/auth.server'

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrThrow()

    const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
    if (!q) return NextResponse.json({ error: 'escribe un correo o nombre' }, { status: 400 })

    const isEmail = q.includes('@')

    let user: { email: string; name: string | null } | null = null
    if (isEmail) {
      const { data } = await supabaseAdmin
        .from('users').select('email, name').ilike('email', q).limit(1).maybeSingle()
      user = data
    } else {
      const { data } = await supabaseAdmin
        .from('users').select('email, name').ilike('name', `%${q}%`).limit(1).maybeSingle()
      user = data
    }

    let lastOrder: { customer_email: string; customer_name: string | null; customer_phone: string | null; shipping_address: unknown } | null = null
    const emailForOrders = user?.email ?? (isEmail ? q : null)

    if (emailForOrders) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('customer_email, customer_name, customer_phone, shipping_address')
        .ilike('customer_email', emailForOrders)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle()
      lastOrder = data
    } else {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('customer_email, customer_name, customer_phone, shipping_address')
        .ilike('customer_name', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle()
      lastOrder = data
    }

    const resolvedEmail = user?.email ?? lastOrder?.customer_email
    if (!resolvedEmail) return NextResponse.json({ error: 'cliente no encontrado' }, { status: 404 })

    return NextResponse.json({
      data: {
        email: resolvedEmail,
        name: user?.name ?? lastOrder?.customer_name ?? null,
        phone: lastOrder?.customer_phone ?? null,
        address: lastOrder?.shipping_address ?? null,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error al buscar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
