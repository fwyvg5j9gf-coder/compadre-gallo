import type { NextConfig } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'
// Clerk uses a custom subdomain on production (clerk.compadregallo.com)
const CLERK_CUSTOM = 'https://clerk.compadregallo.com'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/sign/**' },
    ],
  },

  async headers() {
    return [
      {
        // Auth pages: no CSP so Clerk can load without restrictions
        source: '/cuenta/(login|registro)/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Pages used as editor preview: allow framing from same origin only
        source: '/:path(|artistas|tienda)',
        headers: [
          { key: 'X-Frame-Options',       value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              `default-src 'self'`,
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com ${CLERK_CUSTOM}`,
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.com https://*.clerk.accounts.dev ${CLERK_CUSTOM}`,
              `font-src 'self' https://fonts.gstatic.com https://*.clerk.com ${CLERK_CUSTOM}`,
              `img-src 'self' data: blob: https://*.supabase.co https://img.clerk.com https://*.clerk.com ${CLERK_CUSTOM}`,
              `connect-src 'self' https://*.supabase.co https://api.stripe.com https://api-pro.skydropx.com https://nominatim.openstreetmap.org https://*.clerk.com https://*.clerk.accounts.dev https://clerk-telemetry.com ${CLERK_CUSTOM} ${APP_URL}`,
              `frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com ${CLERK_CUSTOM}`,
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
