import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import { isAdmin, getLinkedArtist } from '@/lib/auth.server'
import CuentaClient from './CuentaClient'

export default async function CuentaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''
  const name = user?.firstName ?? null

  // Upsert user record — do not overwrite role so admin-assigned roles persist
  if (email) {
    await supabaseAdmin.from('users').upsert(
      { clerk_user_id: userId, email, name },
      { onConflict: 'clerk_user_id', ignoreDuplicates: false },
    )
  }

  // Role-based dashboard access
  const adminUser = await isAdmin(userId)
  const { data: userRecord } = await supabaseAdmin
    .from('users').select('role, username, shipping_address').eq('clerk_user_id', userId).single()
  const role = adminUser ? 'admin' : (userRecord?.role ?? 'fan')

  let dashboardUrl: string | undefined
  if (adminUser) {
    dashboardUrl = '/casa'
  } else if (role === 'artista') {
    const linked = await getLinkedArtist(userId)
    if (linked) dashboardUrl = `/casa/artistas/${linked.id}`
  }

  const [ordersResult, ticketsResult, subsResult, artistsResult] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('folio_number', { ascending: false }),
    supabaseAdmin
      .from('tickets')
      .select('*, shows(id, venue, city, date, artists(name, slug, image_url))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('artist_subscriptions')
      .select('*, artists(id, name, slug, image_url, genre, city)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('artists')
      .select('id, name, slug, image_url, genre, city')
      .eq('is_published', true)
      .order('sort_order'),
  ])

  return (
    <CuentaClient
      orders={ordersResult.data ?? []}
      tickets={ticketsResult.data ?? []}
      subscriptions={subsResult.data ?? []}
      allArtists={artistsResult.data ?? []}
      firstName={name ?? 'compadre'}
      email={email}
      userId={userId}
      role={role}
      dashboardUrl={dashboardUrl}
      username={userRecord?.username ?? null}
      savedAddress={(userRecord?.shipping_address as Record<string, string>) ?? null}
    />
  )
}
