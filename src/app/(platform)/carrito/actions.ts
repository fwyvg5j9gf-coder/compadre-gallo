'use server'

import { supabaseAdmin } from '@/lib/supabase.server'

const UUID = /^[0-9a-f-]{36}$/i

// Piezas disponibles de una variante. El carrito vive en el navegador y no
// sabe el stock real: hay que preguntarle a la base antes de sumar otra pieza,
// si no se puede pedir más de lo que hay y el error sale hasta pagar.
export async function getAvailable(productId: string, size: string): Promise<number> {
  if (!UUID.test(productId) || typeof size !== 'string' || size.length > 40) return 0

  const { data } = await supabaseAdmin
    .from('product_variants')
    .select('stock')
    .eq('product_id', productId)
    .eq('size', size)
    .maybeSingle()

  return Math.max(0, data?.stock ?? 0)
}
