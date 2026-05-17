'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import Image from 'next/image'

// ── CTA Panel ─────────────────────────────────────────────────────────────────
function CtaPanel({
  href, bg, textColor = '#fff', title, subtitle, cta, borderLeft = false,
}: {
  href: string; bg: string; textColor?: string; title: string; subtitle: string; cta: string; borderLeft?: boolean
}) {
  const router = useRouter()
  const [active, setActive] = useState(false)

  const hoverBg = bg === '#0a0a0a' ? '#1a1a1a'
    : bg === '#ff0100' ? '#cc0000'
    : bg === '#ffe200' ? '#e6cc00'
    : bg

  const handleClick = useCallback(() => {
    setActive(true)
    setTimeout(() => router.push(href), 320)
  }, [href, router])

  const mutedColor = textColor === '#0a0a0a'
    ? 'rgba(10,10,10,0.45)'
    : 'rgba(255,255,255,0.45)'

  return (
    <button
      onClick={handleClick}
      aria-label={title}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(16px,2.5vw,32px)',
        background: active ? hoverBg : bg,
        color: textColor,
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        borderLeft: borderLeft ? '1px solid rgba(255,255,255,0.12)' : 'none',
        transition: 'background 200ms',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <div>
        {subtitle && (
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: mutedColor, marginBottom: 8,
          }}>
            {subtitle}
          </div>
        )}
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 'clamp(22px,4vw,54px)',
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
      width: '100%',
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

        {/* Mascot — mix-blend-mode:multiply hace transparente el fondo blanco */}
        <div style={{
          width: 'clamp(180px, 36vw, 340px)',
          height: 'clamp(240px, 48vw, 440px)',
          maxHeight: '68%',
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

      {/* ── CTA area — upside-down T ── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Row 1: artistas + tienda */}
        <div style={{ display: 'flex', height: 'clamp(120px, 26vh, 200px)' }}>
          <CtaPanel
            href={leftLink}
            bg={leftBg}
            title={leftTitle}
            subtitle={leftSubtitle}
            cta={leftCta}
          />
          <CtaPanel
            href={rightLink}
            bg={rightBg}
            title={rightTitle}
            subtitle={rightSubtitle}
            cta={rightCta}
            borderLeft
          />
        </div>
        {/* Row 2: cuenta — full width */}
        <div style={{ display: 'flex', height: 'clamp(68px, 13vh, 100px)', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <CtaPanel
            href="/cuenta"
            bg="#ffe200"
            textColor="#0a0a0a"
            title="cuenta"
            subtitle=""
            cta="entrar"
          />
        </div>
      </div>
    </div>
  )
}
