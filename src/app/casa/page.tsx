import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin, getLinkedArtist } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import CasaDashboard from './CasaDashboard'

export default async function CasaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')

  // Artistas go directly to their profile — they have no dashboard access
  if (!(await isAdmin(userId))) {
    const linked = await getLinkedArtist(userId)
    if (linked) redirect(`/casa/artistas/${linked.id}`)
    redirect('/cuenta')
  }

  const [user, artistsRes] = await Promise.all([
    currentUser(),
    supabaseAdmin
      .from('artists')
      .select('id, name, city, genre, image_url, bg_color, stripe_color, is_published, shows:shows(count), artist_tasks(status)')
      .order('sort_order')
      .order('created_at'),
  ])

  type RawA = {
    id: string; name: string; city: string | null; genre: string | null
    image_url: string | null; bg_color: string; stripe_color: string; is_published: boolean
    shows: { count: number }[]; artist_tasks: { status: string }[]
  }

  const artists = ((artistsRes.data ?? []) as unknown as RawA[]).map(a => ({
    id:           a.id,
    name:         a.name,
    city:         a.city,
    genre:        a.genre,
    image_url:    a.image_url,
    bg_color:     a.bg_color,
    stripe_color: a.stripe_color,
    is_published: a.is_published,
    shows_count:  a.shows[0]?.count ?? 0,
    tasks_pending: a.artist_tasks.filter(t => t.status !== 'listo').length,
  }))

  return (
    <CasaDashboard
      email={user?.emailAddresses[0]?.emailAddress ?? ''}
      firstName={user?.firstName ?? 'admin'}
      artists={artists}
    />
  )
}
