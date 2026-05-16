'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'

// ── Gallo SVG ─────────────────────────────────────────────────────────────────
function GalloSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 370"
      aria-label="el gallo"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {/* Tail feathers — fan up-left */}
      <path d="M 72 198 Q 8 148 28 58 Q 42 95 58 158 Z" fill="#0a0a0a" />
      <path d="M 80 190 Q 30 130 62 42 Q 68 82 74 152 Z" fill="#0a0a0a" />
      <path d="M 90 183 Q 54 118 95 36 Q 94 78 90 148 Z" fill="#0a0a0a" />
      <path d="M 100 178 Q 78 110 128 34 Q 120 76 108 145 Z" fill="#0a0a0a" />

      {/* Body */}
      <ellipse cx="162" cy="242" rx="88" ry="94" fill="#0a0a0a" />

      {/* Neck */}
      <path d="M 148 155 Q 172 148 190 162 Q 196 182 190 200 Q 175 208 158 206 Q 140 204 132 188 Q 130 168 148 155 Z" fill="#0a0a0a" />

      {/* Head */}
      <circle cx="194" cy="108" r="50" fill="#0a0a0a" />

      {/* Comb — red, 3 lobes */}
      <path d="M 175 60 Q 170 36 180 22 Q 186 40 188 58 Q 193 34 200 20 Q 204 40 206 60 Q 213 36 220 24 Q 222 44 218 62" fill="none" stroke="#ff0100" strokeWidth="0" />
      <ellipse cx="180" cy="52" rx="9" ry="14" fill="#ff0100" />
      <ellipse cx="196" cy="44" rx="9" ry="16" fill="#ff0100" />
      <ellipse cx="212" cy="52" rx="8" ry="13" fill="#ff0100" />

      {/* Wattle — red */}
      <ellipse cx="216" cy="148" rx="12" ry="17" fill="#ff0100" />

      {/* Beak — yellow */}
      <path d="M 241 102 L 268 112 L 241 122 Z" fill="#ffe200" />

      {/* Eye */}
      <circle cx="210" cy="100" r="11" fill="white" />
      <circle cx="212" cy="100" r="6" fill="#0a0a0a" />
      <circle cx="214" cy="97" r="2.5" fill="white" />

      {/* Wing highlight stripe */}
      <path d="M 90 248 Q 122 220 188 224 Q 176 238 152 243 Q 124 247 100 243 Z" fill="rgba(255,255,255,0.11)" />

      {/* Legs */}
      <rect x="136" y="330" width="13" height="46" rx="6" fill="#0a0a0a" />
      <rect x="175" y="330" width="13" height="46" rx="6" fill="#0a0a0a" />

      {/* Left foot */}
      <path d="M 116 374 L 143 369 L 162 374" stroke="#0a0a0a" strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* Right foot */}
      <path d="M 158 374 L 183 369 L 204 374" stroke="#0a0a0a" strokeWidth="10" strokeLinecap="round" fill="none" />
    </svg>
  )
}

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

        {/* Gallo SVG — scales to fill space */}
        <div style={{
          width: 'clamp(180px, 42vw, 340px)',
          height: 'clamp(220px, 52vw, 430px)',
          maxHeight: '70%',
          flexShrink: 0,
        }}>
          <GalloSVG />
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
