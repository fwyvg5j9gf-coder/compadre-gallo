import type { Metadata } from 'next'
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data } = await supabaseAdmin
    .from('artists')
    .select('name, bio, city, genre, image_url')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!data) return { title: 'artista | GALLO' }

  const title = `${data.name} — GALLO`
  const bio = data.bio ? data.bio.slice(0, 140) : null
  const sub = [data.genre, data.city].filter(Boolean).join(' · ')
  const description = [bio, sub].filter(Boolean).join(' — ')
  const url = `https://compadregallo.com/artista/${slug}`
  const image = data.image_url ?? 'https://compadregallo.com/opengraph-image.png'

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'GALLO',
      images: [{ url: image, alt: data.name }],
      locale: 'es_MX',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data } = await supabaseAdmin
    .from('artists')
    .select('id, slug, name, bio, city, genre, image_url, bg_color, stripe_color, fg_color, page_sections, instagram, tiktok, spotify, youtube, shows(venue, city, date, price_mxn, capacity, is_published)')
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
