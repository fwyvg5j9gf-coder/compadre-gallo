import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import CheckoutClient from './CheckoutClient'

export const dynamic = 'force-dynamic'

async function getStripePublishableKey(): Promise<string> {
  const [{ data: s }, { data: secrets }] = await Promise.all([
    supabaseAdmin.from('store_settings').select('stripe_test_mode').eq('id', 1).single(),
    supabaseAdmin.from('store_secrets').select('stripe_pk_test, stripe_pk_live').eq('id', 1).single(),
  ])
  const useTest = s?.stripe_test_mode ?? true
  const key = useTest ? (secrets?.stripe_pk_test ?? '') : (secrets?.stripe_pk_live ?? '')
  return (key && key.length > 10) ? key : (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')
}

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const [{ data: artist }, stripePublishableKey] = await Promise.all([
    supabaseAdmin
      .from('artists')
      .select('id, name, slug, bg_color, stripe_color, fg_color, image_url, shows(id, venue, city, date, price_mxn, capacity, is_published)')
      .eq('slug', slug)
      .eq('is_published', true)
      .single(),
    getStripePublishableKey(),
  ])

  if (!artist) notFound()

  const shows = (artist.shows as {
    id: string; venue: string; city: string; date: string
    price_mxn: number | null; capacity: number | null; is_published: boolean
  }[])
    .filter(s => s.is_published && s.price_mxn && s.price_mxn > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (shows.length === 0) notFound()

  return (
    <CheckoutClient
      artist={{
        id:          artist.id,
        name:        artist.name,
        slug:        artist.slug,
        bg:          artist.bg_color,
        stripe:      artist.stripe_color,
        fg:          artist.fg_color,
        image_url:   artist.image_url,
      }}
      shows={shows}
      stripePublishableKey={stripePublishableKey}
    />
  )
}
