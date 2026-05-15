import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import type { Product, StoreCategory, StoreSize, PackagingType } from '@/lib/supabase'
import TiendaAdmin from './TiendaAdmin'

export default async function TiendaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const [products, categories, sizes, packaging] = await Promise.all([
    supabaseAdmin.from('products').select('*, product_variants(*)').order('created_at', { ascending: false }),
    supabaseAdmin.from('store_categories').select('*').order('sort_order'),
    supabaseAdmin.from('store_sizes').select('*').order('sort_order'),
    supabaseAdmin.from('packaging_types').select('*').order('sort_order'),
  ])

  if (products.error) throw new Error(products.error.message)

  return (
    <TiendaAdmin
      initial={(products.data ?? []) as Product[]}
      categories={(categories.data ?? []) as StoreCategory[]}
      sizes={(sizes.data ?? []) as StoreSize[]}
      packaging={(packaging.data ?? []) as PackagingType[]}
    />
  )
}
