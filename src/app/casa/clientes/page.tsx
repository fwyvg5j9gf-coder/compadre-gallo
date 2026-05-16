import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import ClientesAdmin from './ClientesAdmin'

export default async function ClientesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  // Fetch all customer users with their counts via aggregation
  const [usersRes, ordersRes, ticketsRes, subsRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('clerk_user_id, email, name, role, created_at')
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
  ])

  const users = usersRes.data ?? []
  const orders = ordersRes.data ?? []
  const tickets = ticketsRes.data ?? []
  const subs = subsRes.data ?? []

  // Build count maps
  const orderCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.user_id] = (acc[o.user_id] ?? 0) + 1
    return acc
  }, {})
  const ticketCounts = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.user_id] = (acc[t.user_id] ?? 0) + 1
    return acc
  }, {})
  const subCounts = subs.reduce<Record<string, number>>((acc, s) => {
    acc[s.user_id] = (acc[s.user_id] ?? 0) + 1
    return acc
  }, {})

  // Merge guest orders (have user_id but no users row yet)
  const knownIds = new Set(users.map(u => u.clerk_user_id))
  const guestIds = new Set([
    ...orders.map(o => o.user_id),
    ...tickets.map(t => t.user_id),
    ...subs.map(s => s.user_id),
  ].filter(id => id && !knownIds.has(id)))

  const guestUsers = Array.from(guestIds).map(id => ({
    clerk_user_id: id,
    email: '',
    name: null,
    role: 'fan',
    created_at: '',
  }))

  const allUsers = [
    ...users.map(u => ({
      ...u,
      orders_count: orderCounts[u.clerk_user_id] ?? 0,
      tickets_count: ticketCounts[u.clerk_user_id] ?? 0,
      subscriptions_count: subCounts[u.clerk_user_id] ?? 0,
    })),
    ...guestUsers.map(u => ({
      ...u,
      orders_count: orderCounts[u.clerk_user_id] ?? 0,
      tickets_count: ticketCounts[u.clerk_user_id] ?? 0,
      subscriptions_count: subCounts[u.clerk_user_id] ?? 0,
    })),
  ]

  return <ClientesAdmin users={allUsers} />
}
