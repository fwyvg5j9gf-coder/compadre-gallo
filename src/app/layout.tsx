import type { Metadata } from 'next';
import './globals.css';
import { PlayerProvider } from '@/context/PlayerContext';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'compadregallo',
  description: 'música, cine, foto, escultura — curado antes de que sea viral.',
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
