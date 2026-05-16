'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import Image from 'next/image'

// ── CTA Panel ─────────────────────────────────────────────────────────────────
function CtaPanel({
  href, bg, title, subtitle, cta, side,
}: {
  href: string; bg: string; title: string; subtitle: string; cta: string; side: 'left' | 'right'
}) {
  const router = useRouter()
  const [active, setActive] = useState(false)

  const handleClick = useCallback(() => {
    setActive(true)
    setTimeout(() => router.push(href), 320)
  }, [href, router])

  return (
    <button
      onClick={handleClick}
      aria-label={title}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(18px,3vw,36px)',
        background: active ? (bg === '#0a0a0a' ? '#1a1a1a' : '#cc0000') : bg,
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        borderLeft: side === 'right' ? '1px solid rgba(255,255,255,0.12)' : 'none',
        transition: 'background 200ms, transform 200ms',
        transform: active ? 'scale(0.98)' : 'scale(1)',
        overflow: 'hidden',
      }}
    >
      <div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 10,
        }}>
          {subtitle}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 'clamp(26px,4.5vw,58px)',
          letterSpacing: '-0.03em', lineHeight: 0.92, textTransform: 'lowercase',
        }}>
          {title}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
        {cta}
        <span style={{
          display: 'inline-block',
          transition: 'transform 200ms',
          transform: active ? 'translateX(6px)' : 'translateX(0)',
        }}>→</span>
      </div>
    </button>
  )
}

// ── Landing Hero ──────────────────────────────────────────────────────────────
export default function LandingHero({
  tagline = 'compadregallo.com',
  leftTitle = 'artist\nroom',
  leftSubtitle = '',
  leftCta = 'entrar',
  leftLink = '/artistas',
  leftBg = '#0a0a0a',
  rightTitle = 'tienda',
  rightSubtitle = '',
  rightCta = 'entrar',
  rightLink = '/tienda',
  rightBg = '#ff0100',
}: {
  tagline?: string
  leftTitle?: string; leftSubtitle?: string; leftCta?: string; leftLink?: string; leftBg?: string
  rightTitle?: string; rightSubtitle?: string; rightCta?: string; rightLink?: string; rightBg?: string
}) {
  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      overflow: 'hidden',
    }}>

      {/* ── Hero area ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '0 24px',
        minHeight: 0,
      }}>
        {/* Tagline */}
        <div style={{
          position: 'absolute',
          top: 'clamp(16px,3vh,28px)',
          left: 'clamp(18px,3vw,32px)',
          fontStyle: 'italic',
          fontSize: 13,
          color: '#9a9994',
          letterSpacing: '-0.01em',
          zIndex: 10,
        }}>
          {tagline}
        </div>

        {/* Mascot original — mix-blend-mode:multiply hace transparente el fondo blanco */}
        <div style={{
          width: 'clamp(200px, 38vw, 360px)',
          height: 'clamp(260px, 50vw, 470px)',
          maxHeight: '72%',
          flexShrink: 0,
          position: 'relative',
        }}>
          <Image
            src="/assets/gallo-mascot.jpg"
            alt="el gallo"
            fill
            style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
            priority
          />
        </div>
      </div>

      {/* ── CTA row ── */}
      <div style={{
        display: 'flex',
        flexShrink: 0,
        height: 'clamp(140px, 32vh, 240px)',
      }}>
        <CtaPanel
          href={leftLink}
          bg={leftBg}
          title={leftTitle}
          subtitle={leftSubtitle}
          cta={leftCta}
          side="left"
        />
        <CtaPanel
          href={rightLink}
          bg={rightBg}
          title={rightTitle}
          subtitle={rightSubtitle}
          cta={rightCta}
          side="right"
        />
      </div>
    </div>
  )
}
