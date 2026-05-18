import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin, getLinkedArtist } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import CasaDashboard from './CasaDashboard'

export const dynamic = 'force-dynamic'

export default async function CasaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')

  if (!(await isAdmin(userId))) {
    const linked = await getLinkedArtist(userId)
    if (linked) redirect(`/casa/artistas/${linked.id}`)
    redirect('/cuenta')
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const [user, artistsRes, revenueRes, pendingRes, recentRes, productsRes] = await Promise.all([
    currentUser(),
    supabaseAdmin
      .from('artists')
      .select('id, name, city, genre, image_url, bg_color, stripe_color, is_published, shows:shows(count), artist_tasks(status)')
      .order('sort_order').order('created_at'),
    supabaseAdmin
      .from('orders')
      .select('total_mxn')
      .in('status', ['paid', 'shipped', 'delivered'])
      .eq('is_test', false)
      .gte('created_at', thirtyDaysAgo),
    supabaseAdmin
      .from('orders')
      .select('id, folio_number, customer_name, customer_email, total_mxn, created_at')
      .eq('status', 'paid')
      .eq('is_test', false)
      .is('tracking_number', null)
      .order('created_at'),
    supabaseAdmin
      .from('orders')
      .select('id, folio_number, customer_name, customer_email, total_mxn, status, created_at, is_test')
      .order('created_at', { ascending: false })
      .limit(12),
    supabaseAdmin
      .from('products')
      .select('id, name, is_published, product_variants(stock)')
      .eq('is_published', true),
  ])

  type RawA = {
    id: string; name: string; city: string | null; genre: string | null
    image_url: string | null; bg_color: string; stripe_color: string; is_published: boolean
    shows: { count: number }[]; artist_tasks: { status: string }[]
  }
  type PV = { stock: number }
  type RawP = { id: string; name: string; product_variants: PV[] }

  const artists = ((artistsRes.data ?? []) as unknown as RawA[]).map(a => ({
    id: a.id, name: a.name, city: a.city, genre: a.genre,
    image_url: a.image_url, bg_color: a.bg_color, stripe_color: a.stripe_color,
    is_published: a.is_published,
    shows_count: a.shows[0]?.count ?? 0,
    tasks_pending: a.artist_tasks.filter(t => t.status !== 'listo').length,
  }))

  const revenue30d = (revenueRes.data ?? []).reduce((s, o) => s + o.total_mxn, 0)

  const pendingOrders = (pendingRes.data ?? []) as {
    id: string; folio_number: number; customer_name: string | null
    customer_email: string; total_mxn: number; created_at: string
  }[]

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const staleOrders = pendingOrders.filter(o => o.created_at < fortyEightHoursAgo)

  const recentOrders = (recentRes.data ?? []) as {
    id: string; folio_number: number; customer_name: string | null
    customer_email: string; total_mxn: number; status: string
    created_at: string; is_test: boolean
  }[]

  const allProducts = ((productsRes.data ?? []) as unknown as RawP[]).map(p => ({
    id: p.id, name: p.name,
    total_stock: p.product_variants.reduce((s, v) => s + v.stock, 0),
  }))
  const outOfStockCount   = allProducts.filter(p => p.total_stock === 0).length
  const lowStockProducts  = allProducts.filter(p => p.total_stock > 0 && p.total_stock <= 5)
  const activeArtists     = artists.filter(a => a.is_published).length

  return (
    <CasaDashboard
      email={user?.emailAddresses[0]?.emailAddress ?? ''}
      firstName={user?.firstName ?? 'admin'}
      artists={artists}
      revenue30d={revenue30d}
      pendingOrders={pendingOrders}
      staleOrders={staleOrders}
      recentOrders={recentOrders}
      lowStockProducts={lowStockProducts}
      outOfStockCount={outOfStockCount}
      activeArtists={activeArtists}
    />
  )
}
