import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import NuevoOrden from './NuevoOrden'

export default async function NuevoOrdenPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  await requireAdmin()

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, price_mxn, weight_grams, is_published, product_variants(id, size, stock)')
    .order('name')

  return <NuevoOrden products={products ?? []} />
}
