import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase.server'
import type { Product } from '@/lib/supabase'
import { LAMP_CATEGORY, PLACEHOLDER_LAMPS, productToLamp, totalStock } from '@/lib/lamparas'
import StoreLanding from '@/components/landing/StoreLanding'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'tienda — compadregallo',
  description: 'lámparas y piezas de tiraje limitado de GALLO. envío gratis desde $1,500, sin cuenta y con 5 días para devolver.',
  alternates: { canonical: 'https://compadregallo.com/tienda' },
  openGraph: { title: 'tienda — compadregallo', description: 'es solo una lamparita. piezas de tiraje limitado de GALLO.', url: 'https://compadregallo.com/tienda', locale: 'es_MX', type: 'website' },
}

// La tienda: lámparas como protagonistas y, abajo, todo lo demás que esté
// publicado. Funciona sin cuentas, como gangstafairy.
export default async function TiendaPage() {
  const [{ data }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('*, product_variants(*)')
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin.from('store_settings').select('shipping_free_threshold_mxn').eq('id', 1).single(),
  ])

  const products = (data ?? []) as Product[]
  const lamps = products.filter(p => p.category === LAMP_CATEGORY).map(productToLamp)
  const others = products.filter(p => p.category !== LAMP_CATEGORY && p.image_url)

  const isPlaceholder = lamps.length === 0

  return (
    <StoreLanding
      lamps={isPlaceholder ? PLACEHOLDER_LAMPS : lamps}
      isPlaceholder={isPlaceholder}
      freeThresholdMxn={settings?.shipping_free_threshold_mxn ?? 0}
      others={others.map(p => ({ id: p.id, name: p.name, price_mxn: p.price_mxn, image_url: p.image_url!, stock: totalStock(p) }))}
    />
  )
}
