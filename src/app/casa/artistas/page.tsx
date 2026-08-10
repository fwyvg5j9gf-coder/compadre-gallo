import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '../AdminShell'
import ArtistasAdmin from './ArtistasAdmin'

export default async function ArtistasPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  await requireAdmin()

  const { data: artists } = await supabaseAdmin
    .from('artists')
    .select(`
      id, slug, name, city, genre, image_url, is_published, bg_color, stripe_color,
      shows:shows(count),
      artist_tasks(id, status)
    `)
    .order('sort_order')
    .order('created_at')

  type RawArtist = {
    id: string; slug: string; name: string; city: string | null; genre: string | null
    image_url: string | null; is_published: boolean; bg_color: string; stripe_color: string
    shows: { count: number }[]
    artist_tasks: { id: string; status: string }[]
  }

  const list = (artists as unknown as RawArtist[] ?? []).map(a => ({
    id:           a.id,
    slug:         a.slug,
    name:         a.name,
    city:         a.city,
    genre:        a.genre,
    image_url:    a.image_url,
    is_published: a.is_published,
    bg_color:     a.bg_color,
    stripe_color: a.stripe_color,
    shows_count:  a.shows[0]?.count ?? 0,
    tasks_done:   a.artist_tasks.filter(t => t.status === 'listo').length,
    tasks_total:  a.artist_tasks.length,
  }))

  return (
    <AdminShell crumb="artistas" crumbHref="/casa">
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>
        <ArtistasAdmin artists={list} />
      </main>
    </AdminShell>
  )
}
