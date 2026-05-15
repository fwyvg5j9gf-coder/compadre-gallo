'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--gallo-paper)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Signature top-left */}
      <div style={{
        position: 'absolute',
        top: 28,
        left: 32,
        fontStyle: 'italic',
        fontSize: 13,
        color: 'var(--ink-400)',
        letterSpacing: '-0.01em',
        zIndex: 10,
      }}>
        compadregallo.com
      </div>

      {/* Mascot — centered, takes most of the vertical space */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 48,
        paddingBottom: 0,
      }}>
        <Image
          src="/assets/gallo-mascot.jpg"
          alt="el gallo"
          width={320}
          height={320}
          priority
          style={{
            objectFit: 'contain',
            width: 'clamp(200px, 30vw, 380px)',
            height: 'auto',
            filter: 'contrast(1.05)',
          }}
        />
      </div>

      {/* Two worlds — bottom half */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        height: '40vh',
        minHeight: 220,
      }}>

        {/* Artist Room */}
        <Link
          href="/artistas"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 'clamp(20px, 3vw, 40px)',
            background: 'var(--gallo-black)',
            color: '#fff',
            textDecoration: 'none',
            transition: 'background var(--dur-base) var(--ease-out)',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--gallo-blue)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--gallo-black)')}
        >
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 'var(--track-wide)',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              marginBottom: 10,
            }}>
              boletos · eventos · artistas
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(28px, 4vw, 56px)',
              letterSpacing: 'var(--track-snug)',
              lineHeight: 0.95,
              textTransform: 'lowercase',
            }}>
              artist<br />room
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
          }}>
            entrar
            <span style={{ fontSize: 18 }}>→</span>
          </div>
        </Link>

        {/* Tienda */}
        <Link
          href="/tienda"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 'clamp(20px, 3vw, 40px)',
            background: 'var(--gallo-red)',
            color: '#fff',
            textDecoration: 'none',
            transition: 'background var(--dur-base) var(--ease-out)',
            borderLeft: '2px solid rgba(255,255,255,0.15)',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#cc0000')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--gallo-red)')}
        >
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 'var(--track-wide)',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
              marginBottom: 10,
            }}>
              merch · piezas únicas
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(28px, 4vw, 56px)',
              letterSpacing: 'var(--track-snug)',
              lineHeight: 0.95,
              textTransform: 'lowercase',
            }}>
              tienda
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
          }}>
            entrar
            <span style={{ fontSize: 18 }}>→</span>
          </div>
        </Link>

      </div>
    </div>
  );
}
