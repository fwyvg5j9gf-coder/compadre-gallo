import type { Metadata } from 'next';
import './globals.css';
import { PlayerProvider } from '@/context/PlayerContext';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'compadregallo',
  description: 'música, cine, foto, escultura — curado antes de que sea viral.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'compadregallo',
    description: 'música, cine, foto, escultura — curado antes de que sea viral.',
    url: 'https://compadregallo.com',
    siteName: 'compadregallo',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'compadregallo',
    description: 'música, cine, foto, escultura — curado antes de que sea viral.',
    images: ['/opengraph-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body>
          <PlayerProvider>
            {children}
          </PlayerProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
