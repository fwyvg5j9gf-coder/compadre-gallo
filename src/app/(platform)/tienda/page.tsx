import { supabaseAdmin } from '@/lib/supabase.server'
import TiendaClient from './TiendaClient'

export const revalidate = 60

export default async function TiendaPage() {
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('*, product_variants(*)')
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('store_categories')
      .select('name')
      .order('sort_order', { ascending: true }),
  ])

  return (
    <TiendaClient
      products={products ?? []}
      categories={(categories ?? []).map(c => c.name)}
    />
  )
}
