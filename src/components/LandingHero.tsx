'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'

// ── Brand letters ─────────────────────────────────────────────────────────────
const LETTERS = [
  { ch: 'g', color: '#003a87' },
  { ch: 'a', color: '#00c4df' },
  { ch: 'l', color: '#ffd49a' },
  { ch: 'l', color: '#ff0100' },
  { ch: 'o', color: '#ffe200' },
]

// ── CSS keyframes & animation classes ────────────────────────────────────────
// Wrapped in prefers-reduced-motion: no-preference so reduced-motion users
// see elements immediately (no opacity:0 stuck state).
const ANIM_CSS = `
  @media (prefers-reduced-motion: no-preference) {
    @keyframes gl-letter {
      from { opacity: 0; transform: translateY(24px) scaleY(0.75); }
      to   { opacity: 1; transform: translateY(0)   scaleY(1); }
    }
    @keyframes gl-sub {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes gl-mascot-in {
      from { opacity: 0; transform: translateY(32px) scale(0.94); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes gl-float {
      0%, 100% { transform: translateY(0px); }
      50%      { transform: translateY(-11px); }
    }
    @keyframes gl-panel {
      from { opacity: 0; transform: translateY(110%); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes gl-line {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }

    .gl-tagline { animation: gl-sub     480ms ease-out 80ms both; }
    .gl-sub     { animation: gl-sub     500ms ease-out 680ms both; }
    .gl-l0 { animation: gl-letter 620ms cubic-bezier(0.22,1,0.36,1) 120ms both; }
    .gl-l1 { animation: gl-letter 620ms cubic-bezier(0.22,1,0.36,1) 210ms both; }
    .gl-l2 { animation: gl-letter 620ms cubic-bezier(0.22,1,0.36,1) 300ms both; }
    .gl-l3 { animation: gl-letter 620ms cubic-bezier(0.22,1,0.36,1) 390ms both; }
    .gl-l4 { animation: gl-letter 620ms cubic-bezier(0.22,1,0.36,1) 480ms both; }
    .gl-accent-line { animation: gl-line 600ms cubic-bezier(0.22,1,0.36,1) 580ms both; transform-origin: left; }
    .gl-mascot { animation: gl-mascot-in 900ms cubic-bezier(0.22,1,0.36,1) 300ms both; }
    .gl-float  { animation: gl-float 6s ease-in-out 1200ms infinite; }
    .gl-p1 { animation: gl-panel 680ms cubic-bezier(0.22,1,0.36,1) 520ms both; }
    .gl-p2 { animation: gl-panel 680ms cubic-bezier(0.22,1,0.36,1) 630ms both; }
    .gl-p3 { animation: gl-panel 680ms cubic-bezier(0.22,1,0.36,1) 720ms both; }
  }
`

// ── CTA panel ─────────────────────────────────────────────────────────────────
function CtaPanel({
  href, bg, textColor = '#fff', title, subtitle, cta, panelClass = '', border = false,
}: {
  href: string; bg: string; textColor?: string
  title: string; subtitle?: string; cta: string
  panelClass?: string; border?: boolean
}) {
  const router = useRouter()
  const [hov, setHov] = useState(false)

  const hoverBg =
    bg === '#0a0a0a' ? '#161616'
    : bg === '#ff0100' ? '#d40000'
    : bg === '#ffe200' ? '#e6cc00'
    : bg

  const muted = textColor === '#0a0a0a'
    ? 'rgba(10,10,10,0.38)'
    : 'rgba(255,255,255,0.38)'

  return (
    <button
      onClick={() => router.push(href)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={panelClass}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(16px,2.4vw,30px)',
        background: hov ? hoverBg : bg,
        color: textColor,
        border: 'none',
        borderLeft: border ? '1px solid rgba(255,255,255,0.1)' : 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 160ms ease',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <div>
        {subtitle && (
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: muted, marginBottom: 6,
          }}>
            {subtitle}
          </div>
        )}
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 'clamp(20px,3.8vw,52px)',
          letterSpacing: '-0.03em', lineHeight: 0.92,
          textTransform: 'lowercase', whiteSpace: 'pre-line',
        }}>
          {title}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 12, fontWeight: 600, letterSpacing: '0.01em',
        opacity: hov ? 1 : 0.5,
        transform: `translateX(${hov ? 5 : 0}px)`,
        transition: 'opacity 160ms ease, transform 160ms ease',
      }}>
        {cta}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingHero({
  tagline = 'compadregallo.com',
  subtitle = 'productora musical · cdmx',
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
  subtitle?: string
  leftTitle?: string; leftSubtitle?: string; leftCta?: string
  leftLink?: string; leftBg?: string
  rightTitle?: string; rightSubtitle?: string; rightCta?: string
  rightLink?: string; rightBg?: string
}) {
  return (
    <>
      <style>{ANIM_CSS}</style>

      <div style={{
        width: '100%', height: '100dvh',
        display: 'flex', flexDirection: 'column',
        background: '#f6f5f1',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Subtle noise texture */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.028,
        }} />

        {/* Spotlight radial behind mascot */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 520px 440px at 50% 44%, rgba(255,212,154,0.09) 0%, transparent 68%)',
        }} />

        {/* ── Upper hero ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 1,
          padding: '0 24px', minHeight: 0, gap: 0,
        }}>

          {/* Top-left tagline */}
          <div className="gl-tagline" style={{
            position: 'absolute',
            top: 'clamp(18px,3vh,30px)',
            left: 'clamp(20px,3vw,36px)',
            fontStyle: 'italic', fontSize: 12,
            color: '#9a9994', letterSpacing: '-0.01em',
          }}>
            {tagline}
          </div>

          {/* Wordmark */}
          <div style={{
            display: 'flex', alignItems: 'baseline',
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 'clamp(68px,13.5vw,152px)',
            letterSpacing: '-0.055em', lineHeight: 1,
            marginBottom: 'clamp(4px,1.2vh,14px)',
          }}>
            {LETTERS.map((l, i) => (
              <span
                key={i}
                className={`gl-l${i}`}
                style={{ color: l.color, display: 'inline-block', transformOrigin: 'bottom center' }}
              >
                {l.ch}
              </span>
            ))}
          </div>

          {/* Red accent line */}
          <div className="gl-accent-line" style={{
            width: 'clamp(40px,8vw,88px)', height: 2,
            background: '#ff0100', borderRadius: 1,
            marginBottom: 'clamp(10px,1.8vh,18px)',
          }} />

          {/* Subtitle */}
          {subtitle && (
            <div className="gl-sub" style={{
              fontSize: 'clamp(10px,1.2vw,13px)', fontWeight: 600,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: '#9a9994', marginBottom: 'clamp(12px,2vh,24px)',
            }}>
              {subtitle}
            </div>
          )}

          {/* Logo vintage — multiply elimina el fondo blanco del PNG sobre #f6f5f1.
              El blend va en el contenedor externo para no romper el compositing
              layer que crea la animación gl-float. rotate(180deg) corrige la
              orientación del archivo original. */}
          <div className="gl-mascot" style={{
            width: 'clamp(120px,18vw,220px)',
            height: 'clamp(190px,29vw,350px)',
            maxHeight: '50%',
            position: 'relative', flexShrink: 0,
            mixBlendMode: 'multiply',
          }}>
            <div className="gl-float" style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Image
                src="/assets/gallo-mascot-reference.png"
                alt="el gallo"
                fill
                style={{ objectFit: 'contain', transform: 'rotate(180deg)' }}
                priority
              />
            </div>
          </div>
        </div>

        {/* ── CTA panels ── */}
        <div style={{ flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

          {/* Row 1: artistas + tienda */}
          <div style={{ display: 'flex', height: 'clamp(118px,25vh,198px)' }}>
            <CtaPanel
              href={leftLink} bg={leftBg}
              title={leftTitle} subtitle={leftSubtitle} cta={leftCta}
              panelClass="gl-p1"
            />
            <CtaPanel
              href={rightLink} bg={rightBg}
              title={rightTitle} subtitle={rightSubtitle} cta={rightCta}
              panelClass="gl-p2" border
            />
          </div>

          {/* Row 2: cuenta — full width */}
          <div style={{
            display: 'flex', height: 'clamp(64px,12vh,96px)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}>
            <CtaPanel
              href="/cuenta" bg="#ffe200" textColor="#0a0a0a"
              title="cuenta" cta="entrar"
              panelClass="gl-p3"
            />
          </div>
        </div>
      </div>
    </>
  )
}
