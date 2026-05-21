import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import CuentasAdmin from './CuentasAdmin'

export default async function CuentasPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const [usersRes, ordersRes, ticketsRes, subsRes, guestOrdersRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('clerk_user_id, email, name, username, role, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('orders')
      .select('user_id')
      .not('user_id', 'is', null),
    supabaseAdmin
      .from('tickets')
      .select('user_id'),
    supabaseAdmin
      .from('artist_subscriptions')
      .select('user_id'),
    // Guest buyers: orders with no user account
    supabaseAdmin
      .from('orders')
      .select('customer_email, customer_name, customer_phone, total_mxn, created_at')
      .is('user_id', null)
      .order('created_at', { ascending: false }),
  ])

  const users = usersRes.data ?? []
  const orders = ordersRes.data ?? []
  const tickets = ticketsRes.data ?? []
  const subs = subsRes.data ?? []
  const guestOrders = guestOrdersRes.data ?? []

  // Count maps for registered users
  const orderCounts = orders.reduce<Record<string, number>>((acc, o) => {
    if (o.user_id) acc[o.user_id] = (acc[o.user_id] ?? 0) + 1
    return acc
  }, {})
  const ticketCounts = tickets.reduce<Record<string, number>>((acc, t) => {
    if (t.user_id) acc[t.user_id] = (acc[t.user_id] ?? 0) + 1
    return acc
  }, {})
  const subCounts = subs.reduce<Record<string, number>>((acc, s) => {
    if (s.user_id) acc[s.user_id] = (acc[s.user_id] ?? 0) + 1
    return acc
  }, {})

  const registeredUsers = users.map(u => ({
    clerk_user_id: u.clerk_user_id,
    email: u.email,
    name: u.name as string | null,
    username: u.username as string | null,
    role: u.role as string,
    created_at: u.created_at as string,
    orders_count: orderCounts[u.clerk_user_id] ?? 0,
    tickets_count: ticketCounts[u.clerk_user_id] ?? 0,
    subs_count: subCounts[u.clerk_user_id] ?? 0,
  }))

  // Aggregate guest buyers by email
  type GuestRow = {
    email: string
    name: string | null
    phone: string | null
    orders_count: number
    total_mxn: number
    last_order: string
  }
  const guestMap = new Map<string, GuestRow>()
  for (const o of guestOrders) {
    const email = (o.customer_email as string).toLowerCase()
    const existing = guestMap.get(email)
    if (existing) {
      existing.orders_count++
      existing.total_mxn += o.total_mxn as number
      if ((o.created_at as string) > existing.last_order) existing.last_order = o.created_at as string
    } else {
      guestMap.set(email, {
        email,
        name: o.customer_name as string | null,
        phone: o.customer_phone as string | null,
        orders_count: 1,
        total_mxn: o.total_mxn as number,
        last_order: o.created_at as string,
      })
    }
  }
  const guestBuyers = Array.from(guestMap.values())
    .sort((a, b) => b.last_order.localeCompare(a.last_order))

  return <CuentasAdmin registeredUsers={registeredUsers} guestBuyers={guestBuyers} />
}
