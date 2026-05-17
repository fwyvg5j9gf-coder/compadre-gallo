import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import NuevoOrden from './NuevoOrden'

export default async function NuevoOrdenPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, price_mxn, weight_grams, product_variants(id, size, stock)')
    .eq('is_published', true)
    .order('name')

  return <NuevoOrden products={products ?? []} />
}
