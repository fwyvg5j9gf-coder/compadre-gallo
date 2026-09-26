import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      // Panel, cuenta, pago y ligas personales no se indexan.
      disallow: ['/casa', '/cuenta', '/carrito', '/checkout', '/api', '/correos', '/boleto', '/rastrear'],
    }],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
