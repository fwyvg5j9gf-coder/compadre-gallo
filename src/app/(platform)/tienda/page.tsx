import { supabaseAdmin } from '@/lib/supabase.server'
import type { Product } from '@/lib/supabase'
import { LAMP_CATEGORY, PLACEHOLDER_LAMPS, productToLamp, totalStock } from '@/lib/lamparas'
import StoreLanding from '@/components/landing/StoreLanding'

export const dynamic = 'force-dynamic'

// La tienda: lámparas como protagonistas y, abajo, todo lo demás que esté
// publicado. Funciona sin cuentas, como gangstafairy.
export default async function TiendaPage() {
  const { data } = await supabaseAdmin
    .from('products')
    .select('*, product_variants(*)')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  const products = (data ?? []) as Product[]
  const lamps = products.filter(p => p.category === LAMP_CATEGORY).map(productToLamp)
  const others = products.filter(p => p.category !== LAMP_CATEGORY && p.image_url)

  const isPlaceholder = lamps.length === 0

  return (
    <StoreLanding
      lamps={isPlaceholder ? PLACEHOLDER_LAMPS : lamps}
      isPlaceholder={isPlaceholder}
      others={others.map(p => ({ id: p.id, name: p.name, price_mxn: p.price_mxn, image_url: p.image_url!, stock: totalStock(p) }))}
    />
  )
}
