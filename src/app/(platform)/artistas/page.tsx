import { draftMode } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase.server'
import { mapArtist } from '@/lib/mapArtist'
import type { Block } from '@/lib/blocks'
import BlockRenderer from '@/components/BlockRenderer'
import ArtistasClient from './ArtistasClient'

export const dynamic = 'force-dynamic'

export default async function ArtistasPage() {
  const { isEnabled: isDraft } = await draftMode()

  const [blocksRes, artistsRes] = await Promise.all([
    supabaseAdmin.from('page_blocks').select('*').eq('page_key', 'artistas').eq('visible', true).order('sort_order'),
    supabaseAdmin
      .from('artists')
      .select('id, slug, name, bio, city, genre, image_url, bg_color, stripe_color, fg_color, shows(venue, city, date, price_mxn, capacity, is_published)')
      .eq('is_published', true)
      .order('sort_order')
      .order('created_at'),
  ])

  const blocks  = (blocksRes.data ?? []).map((b: Block) => ({
    ...b,
    content: isDraft && b.draft_content ? b.draft_content : b.content,
  })) as Block[]
  const artists = (artistsRes.data ?? []).map(a => mapArtist(a as Parameters<typeof mapArtist>[0]))

  return (
    <>
      {blocks.map(b =>
        b.type === 'artist-grid'
          ? <ArtistasClient key={b.id} artists={artists} />
          : <BlockRenderer key={b.id} block={b} />
      )}
    </>
  )
}
