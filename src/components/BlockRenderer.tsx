'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Block } from '@/lib/blocks'

// ── hero-mascot ────────────────────────────────────────────────────────────────
function HeroMascotBlock({ c }: { c: Record<string, string> }) {
  return (
    <div style={{ width: '100vw', height: '100vh', background: c.bg_color || '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 28, left: 32, fontStyle: 'italic', fontSize: 13, color: 'var(--ink-400)', letterSpacing: '-0.01em', zIndex: 10 }}>
        {c.tagline || 'compadregallo.com'}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 48 }}>
        <img src={c.mascot_image || '/assets/gallo-mascot.jpg'} alt="el gallo"
          style={{ objectFit: 'contain', width: 'clamp(200px, 30vw, 380px)', height: 'auto', filter: 'contrast(1.05)' }} />
      </div>
    </div>
  )
}

// ── cta-split ──────────────────────────────────────────────────────────────────
function CtaSplitBlock({ c }: { c: Record<string, string> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '40vh', minHeight: 220 }}>
      <Link href={c.left_link || '/artistas'} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(20px, 3vw, 40px)', background: c.left_bg || '#0a0a0a', color: '#fff', textDecoration: 'none' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'var(--track-wide)', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
            {c.left_subtitle || ''}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4vw, 56px)', letterSpacing: 'var(--track-snug)', lineHeight: 0.95, textTransform: 'lowercase' }}>
            {(c.left_title || 'artist\nroom').split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
          {c.left_cta || 'entrar'} <span style={{ fontSize: 18 }}>→</span>
        </div>
      </Link>
      <Link href={c.right_link || '/tienda'} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(20px, 3vw, 40px)', background: c.right_bg || '#ff0100', color: '#fff', textDecoration: 'none', borderLeft: '2px solid rgba(255,255,255,0.15)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'var(--track-wide)', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}>
            {c.right_subtitle || ''}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px, 4vw, 56px)', letterSpacing: 'var(--track-snug)', lineHeight: 0.95, textTransform: 'lowercase' }}>
            {c.right_title || 'tienda'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
          {c.right_cta || 'entrar'} <span style={{ fontSize: 18 }}>→</span>
        </div>
      </Link>
    </div>
  )
}

// ── page-header ────────────────────────────────────────────────────────────────
function PageHeaderBlock({ c }: { c: Record<string, string> }) {
  return (
    <div className="section" style={{ paddingBottom: 'var(--space-5)' }}>
      {c.eyebrow && <div className="eyebrow" style={{ marginBottom: 'var(--space-4)' }}>{c.eyebrow}</div>}
      <h1>{c.title}</h1>
    </div>
  )
}

// ── text-block ─────────────────────────────────────────────────────────────────
function TextBlockBlock({ c }: { c: Record<string, string> }) {
  return (
    <div className="section">
      {c.heading && <h2 style={{ marginBottom: 'var(--space-4)' }}>{c.heading}</h2>}
      {c.body && <p style={{ maxWidth: '65ch', color: 'var(--fg-muted)', lineHeight: 1.7 }}>{c.body}</p>}
    </div>
  )
}

// ── image-block ────────────────────────────────────────────────────────────────
function ImageBlockBlock({ c }: { c: Record<string, string> }) {
  if (!c.image_url) return null
  return (
    <div style={{ width: '100%', height: c.height ? `${c.height}px` : '400px', position: 'relative', overflow: 'hidden' }}>
      <img src={c.image_url} alt={c.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {c.caption && <div style={{ position: 'absolute', bottom: 16, left: 24, color: '#fff', fontSize: 13, fontStyle: 'italic', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{c.caption}</div>}
    </div>
  )
}

// ── banner-cta ─────────────────────────────────────────────────────────────────
function BannerCtaBlock({ c }: { c: Record<string, string> }) {
  return (
    <div style={{ background: c.bg_color || 'var(--gallo-black)', color: c.text_color || '#fff', padding: 'var(--space-7) var(--outer-px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(20px, 3vw, 36px)', letterSpacing: 'var(--track-snug)', textTransform: 'lowercase' }}>
        {c.text}
      </div>
      {c.cta_label && c.cta_link && (
        <Link href={c.cta_link} className="btn btn-white btn-lg">{c.cta_label} →</Link>
      )}
    </div>
  )
}

// ── Main renderer ──────────────────────────────────────────────────────────────
export default function BlockRenderer({ block }: { block: Block }) {
  if (!block.visible) return null
  const c = block.content

  switch (block.type) {
    case 'hero-mascot':  return <HeroMascotBlock c={c} />
    case 'cta-split':    return <CtaSplitBlock c={c} />
    case 'page-header':  return <PageHeaderBlock c={c} />
    case 'text-block':   return <TextBlockBlock c={c} />
    case 'image-block':  return <ImageBlockBlock c={c} />
    case 'banner-cta':   return <BannerCtaBlock c={c} />
    case 'artist-grid':
    case 'product-grid': return null // rendered by parent page
    default:             return null
  }
}
