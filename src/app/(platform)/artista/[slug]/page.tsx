import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import { mapArtist } from '@/lib/mapArtist'
import ArtistDetailClient from './ArtistDetailClient'

export const revalidate = 60

export async function generateStaticParams() {
  const { data } = await supabaseAdmin
    .from('artists')
    .select('slug')
    .eq('is_published', true)
  return (data ?? []).map(a => ({ slug: a.slug }))
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data } = await supabaseAdmin
    .from('artists')
    .select('id, slug, name, bio, city, genre, image_url, bg_color, stripe_color, fg_color, shows(venue, city, date, price_mxn, capacity, is_published)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!data) notFound()

  const artist = mapArtist(data as Parameters<typeof mapArtist>[0])

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, description, price_mxn, category, image_url, product_variants(id, size, stock)')
    .eq('artist_id', data.id)
    .eq('is_published', true)
    .order('sort_order')

  return <ArtistDetailClient artist={artist} products={(products ?? []) as import('@/lib/supabase').Product[]} />
}
