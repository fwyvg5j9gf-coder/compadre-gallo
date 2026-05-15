import { supabaseAdmin } from '@/lib/supabase.server'
import { notFound } from 'next/navigation'
import ProductDetailClient from './ProductDetailClient'

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
