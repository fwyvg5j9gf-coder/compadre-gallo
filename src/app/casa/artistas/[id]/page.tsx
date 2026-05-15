import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '../../AdminShell'
import ArtistDetail from './ArtistDetail'

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const { id } = await params

  const { data: artist } = await supabaseAdmin
    .from('artists')
    .select('id, slug, name, bio, city, genre, image_url, is_published, bg_color, stripe_color, fg_color, instagram, tiktok, spotify, youtube, page_sections')
    .eq('id', id)
    .single()

  if (!artist) notFound()

  const [showsRes, tasksRes, contentRes, incomeRes, ordersRes] = await Promise.all([
    supabaseAdmin.from('shows').select('id, venue, city, date, ticket_url, price_mxn, capacity, is_published').eq('artist_id', id).order('date'),
    supabaseAdmin.from('artist_tasks').select('id, title, description, due_date, status, priority').eq('artist_id', id).order('created_at'),
    supabaseAdmin.from('content_calendar').select('id, title, description, platform, content_type, scheduled_date, status').eq('artist_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('external_income').select('id, description, amount_mxn, date, category, notes').eq('artist_id', id).order('date', { ascending: false }),
    supabaseAdmin
      .from('order_items')
      .select('price_mxn, quantity, product:products!inner(artist_id)')
      .eq('product.artist_id', id),
  ])

  const merch_total = (ordersRes.data ?? []).reduce((sum, item) => {
    return sum + (item.price_mxn ?? 0) * (item.quantity ?? 1)
  }, 0)

  return (
    <AdminShell crumb="artistas" crumbHref="/casa/artistas">
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>
        <ArtistDetail
          artist={{
            ...artist,
            shows:   showsRes.data   ?? [],
            tasks:   tasksRes.data   ?? [],
            content: contentRes.data ?? [],
            income:  incomeRes.data  ?? [],
            merch_total,
          }}
        />
      </main>
    </AdminShell>
  )
}
