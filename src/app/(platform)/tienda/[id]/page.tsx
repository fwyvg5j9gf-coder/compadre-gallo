import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase.server'
import { notFound } from 'next/navigation'
import ProductDetailClient, { type DetailProduct } from './ProductDetailClient'
import { PLACEHOLDER_LAMPS, isPlaceholderId, productToLamp } from '@/lib/lamparas'
import { specRows } from '@/lib/specs'
import type { Product } from '@/lib/supabase'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  if (isPlaceholderId(id)) return { title: 'relleno — GALLO', robots: { index: false } }
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

  const [detail, { data: settings }] = await Promise.all([
    loadDetail(id),
    supabaseAdmin.from('store_settings').select('shipping_free_threshold_mxn').eq('id', 1).single(),
  ])

  if (!detail) notFound()

  return <ProductDetailClient product={detail} freeThresholdMxn={settings?.shipping_free_threshold_mxn ?? 0} />
}

// Tallas de chica a grande; lo que no está en la lista va al final, en el
// orden en que venga.
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
function bySize(a: { size: string }, b: { size: string }) {
  const rank = (s: string) => { const i = SIZE_ORDER.indexOf(s.toUpperCase()); return i === -1 ? SIZE_ORDER.length : i }
  return rank(a.size) - rank(b.size)
}

// Un producto real de la base, o uno de los rellenos (ph-*) mientras no hay
// lámparas: así el diseño de esta página se puede ver y ajustar desde ya.
async function loadDetail(id: string): Promise<DetailProduct | null> {
  if (isPlaceholderId(id)) {
    const lamp = PLACEHOLDER_LAMPS.find(l => l.id === id)
    if (!lamp) return null
    return {
      id: lamp.id,
      name: lamp.name,
      category: 'lámpara',
      blurb: lamp.blurb,
      price_mxn: lamp.price_mxn,
      looks: lamp.looks,
      variants: [],
      specs: specRows(lamp.specs, lamp.weightGrams),
      printHours: Number(lamp.specs?.horas_impresion) || null,
      buyable: false,
      isPlaceholder: true,
      packagingTypeId: null,
    }
  }

  const { data } = await supabaseAdmin
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (!data) return null
  const p = data as Product
  const lamp = productToLamp(p)

  return {
    id: p.id,
    name: p.name,
    category: p.category,
    blurb: p.description ?? '',
    price_mxn: p.price_mxn,
    looks: lamp.looks,
    variants: (p.product_variants ?? []).map(v => ({ id: v.id, size: v.size, stock: v.stock })).sort(bySize),
    specs: specRows(p.specs, p.weight_grams),
    printHours: Number(p.specs?.horas_impresion) || null,
    buyable: true,
    isPlaceholder: false,
    packagingTypeId: p.packaging_type_id,
  }
}
