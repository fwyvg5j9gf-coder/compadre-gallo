import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase.server'

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'

export const revalidate = 3600

// Solo lo público y real: la tienda, cada producto publicado y las políticas.
// Los rellenos (ph-*) no entran.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabaseAdmin.from('products').select('id, updated_at').eq('is_published', true)
  const fixed = ['', '/tienda', '/politicas/cambios-y-devoluciones', '/politicas/terminos', '/politicas/privacidad']
  return [
    ...fixed.map(path => ({ url: `${SITE}${path}`, changeFrequency: 'weekly' as const, priority: path === '/tienda' ? 1 : 0.5 })),
    ...(data ?? []).map(p => ({ url: `${SITE}/tienda/${p.id}`, lastModified: p.updated_at, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ]
}
