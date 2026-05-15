import { supabaseAdmin } from '@/lib/supabase.server'
import type { Block } from '@/lib/blocks'
import BlockRenderer from '@/components/BlockRenderer'
import TiendaClient from './TiendaClient'

export const revalidate = 60

export default async function TiendaPage() {
  const [blocksRes, productsRes, categoriesRes] = await Promise.all([
    supabaseAdmin.from('page_blocks').select('*').eq('page_key', 'tienda').eq('visible', true).order('sort_order'),
    supabaseAdmin.from('products').select('*, product_variants(*)').eq('is_published', true).order('sort_order', { ascending: true }),
    supabaseAdmin.from('store_categories').select('name').order('sort_order', { ascending: true }),
  ])

  const blocks = (blocksRes.data ?? []) as Block[]

  return (
    <>
      {blocks.map(b =>
        b.type === 'product-grid'
          ? <TiendaClient key={b.id} products={productsRes.data ?? []} categories={(categoriesRes.data ?? []).map(c => c.name)} />
          : <BlockRenderer key={b.id} block={b} />
      )}
    </>
  )
}
