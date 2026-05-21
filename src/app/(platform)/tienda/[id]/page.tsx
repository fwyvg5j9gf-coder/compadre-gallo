import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase.server'
import { notFound } from 'next/navigation'
import ProductDetailClient from './ProductDetailClient'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data: p } = await supabaseAdmin
    .from('products')
    .select('name, description, price_mxn, image_url')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!p) return { title: 'producto | GALLO' }

  const price = (p.price_mxn / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
  const title = `${p.name} — GALLO`
  const description = p.description
    ? `${p.description.slice(0, 130)} · ${price}`
    : `${price} · disponible en compadregallo.com`
  const url = `https://compadregallo.com/tienda/${id}`
  const image = p.image_url ?? 'https://compadregallo.com/opengraph-image.png'

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'GALLO',
      images: [{ url: image, alt: p.name }],
      locale: 'es_MX',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('*, product_variants(*), packaging_types(*)')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!product) notFound()

  return <ProductDetailClient product={product} />
}
