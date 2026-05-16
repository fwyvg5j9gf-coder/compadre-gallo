import type { NextConfig } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'

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
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com`,
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.com https://*.clerk.accounts.dev`,
              `font-src 'self' https://fonts.gstatic.com https://*.clerk.com`,
              `img-src 'self' data: blob: https://*.supabase.co https://img.clerk.com https://*.clerk.com`,
              `connect-src 'self' https://*.supabase.co https://api.stripe.com https://api-pro.skydropx.com https://nominatim.openstreetmap.org https://*.clerk.com https://*.clerk.accounts.dev https://clerk-telemetry.com ${APP_URL}`,
              `frame-src https://js.stripe.com https://hooks.stripe.com https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com`,
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
