import { supabaseAdmin } from '@/lib/supabase.server'
import { mapArtist } from '@/lib/mapArtist'
import ArtistasClient from './ArtistasClient'

export const revalidate = 60

export default async function ArtistasPage() {
  const { data } = await supabaseAdmin
    .from('artists')
    .select('slug, name, bio, city, genre, image_url, bg_color, stripe_color, fg_color, shows(venue, city, date, price_mxn, capacity, is_published)')
    .eq('is_published', true)
    .order('sort_order')
    .order('created_at')

  const artists = (data ?? []).map(a => mapArtist(a as Parameters<typeof mapArtist>[0]))

  return (
    <>
      <div className="section" style={{ paddingBottom: 'var(--space-5)' }}>
        <div className="eyebrow" style={{ marginBottom: 'var(--space-4)' }}>catálogo completo</div>
        <h1>artistas</h1>
      </div>
      <ArtistasClient artists={artists} />
    </>
  )
}
