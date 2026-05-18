import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '@/app/casa/AdminShell'
import InventarioClient from './InventarioClient'

export const dynamic = 'force-dynamic'

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')
  if (!(await isAdmin(userId))) redirect('/casa')

  const { filter = 'all' } = await searchParams

  const { data: products } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, category, image_url, sku, is_published,
      product_variants(id, size, stock, sku, reorder_point)
    `)
    .order('category', { ascending: true })
    .order('name',     { ascending: true })

  const list = products ?? []

  // Aggregate stats
  const allVariants = list.flatMap(p =>
    (p.product_variants ?? []).map(v => ({ ...v, product: p })),
  )
  const outOfStock = allVariants.filter(v => v.stock === 0).length
  const lowStock   = allVariants.filter(v => v.stock > 0 && v.stock <= v.reorder_point && v.reorder_point > 0).length
  const totalUnits = allVariants.reduce((s, v) => s + v.stock, 0)

  return (
    <AdminShell crumb="inventario" crumbHref="/casa/inventario">
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 80px' }}>
        <InventarioClient
          products={list as Parameters<typeof InventarioClient>[0]['products']}
          initialFilter={filter as 'all' | 'low' | 'out'}
          stats={{ outOfStock, lowStock, totalUnits, totalVariants: allVariants.length }}
        />
      </main>
    </AdminShell>
  )
}
