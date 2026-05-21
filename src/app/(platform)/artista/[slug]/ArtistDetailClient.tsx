'use client';

import Link from 'next/link';
import { Artist, DEFAULT_SECTIONS } from '@/lib/data';
import { usePlayer } from '@/context/PlayerContext';
import Countdown from '@/components/Countdown';
import type { Product } from '@/lib/supabase';
import { totalStock } from '@/lib/supabase';

const tagStyles: Record<string, { bg: string; color: string }> = {
  preventa:  { bg: '#ff0100', color: '#fff' },
  agotado:   { bg: '#0a0a0a', color: '#fff' },
  'en vivo': { bg: '#ffe200', color: '#0a0a0a' },
};

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function ArtistDetailClient({ artist, products = [] }: { artist: Artist; products?: Product[] }) {
  const { play, nowPlaying, playing, toggle } = usePlayer();

  const handlePlay = (trackTitle: string) => {
    if (nowPlaying?.slug === artist.slug && nowPlaying.trackTitle === trackTitle) {
      toggle();
    } else {
      play({ artistName: artist.name, trackTitle, bg: artist.bg, slug: artist.slug });
    }
  };

  const isPlaying = (title: string) =>
    playing && nowPlaying?.slug === artist.slug && nowPlaying?.trackTitle === title;

  return (
    <>
      {/* Artist header */}
      <section style={{ background: artist.bg, paddingBottom: 0 }}>
        <div className="artist-hero">
          {/* Color block as stand-in for photo */}
          <div className="artist-hero-img" style={{ background: `color-mix(in srgb, ${artist.stripe} 30%, ${artist.bg})`, position: 'relative', overflow: 'hidden' }}>
            {artist.image_url ? (
              <>
                <img
                  src={artist.image_url}
                  alt={artist.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 70%)' }} />
              </>
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'flex-end', padding: 20,
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: 'clamp(40px, 6vw, 72px)',
                  letterSpacing: 'var(--track-tight)',
                  color: '#fff',
                  textTransform: 'lowercase',
                  lineHeight: 0.9,
                }}>
                  {artist.name}
                </div>
              </div>
            )}
          </div>

          <div className="artist-hero-info">
            <div>
              <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                {artist.city} · {artist.genre}
              </div>
              <h1 style={{ color: '#fff' }}>{artist.name}</h1>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '48ch', margin: 0 }}>
              {artist.bio}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              {artist.tracks.length > 0 && (
                <button
                  className="btn btn-white btn-lg"
                  onClick={() => handlePlay(artist.tracks[0].title)}
                >
                  {isPlaying(artist.tracks[0].title) ? '⏸ pausar' : '▶ escuchar'}
                </button>
              )}
              {artist.tag !== 'agotado' && artist.shows[0] && (
                <Link
                  href={`/checkout/${artist.slug}`}
                  className="btn btn-accent btn-lg"
                >
                  comprar boleto
                </Link>
              )}
            </div>

            {/* Redes sociales */}
            {(artist.instagram || artist.tiktok || artist.spotify || artist.youtube) && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {artist.instagram && (
                  <a href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 12, fontWeight: 600, transition: 'color 140ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                    </svg>
                    @{artist.instagram}
                  </a>
                )}
                {artist.tiktok && (
                  <a href={`https://tiktok.com/@${artist.tiktok}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 12, fontWeight: 600, transition: 'color 140ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
                    </svg>
                    @{artist.tiktok}
                  </a>
                )}
                {artist.spotify && (
                  <a href={`https://open.spotify.com/artist/${artist.spotify}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 12, fontWeight: 600, transition: 'color 140ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 1 1-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 0 1 .207.857zm1.223-2.722a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 0 1-.973-.519.781.781 0 0 1 .52-.973c3.632-1.102 8.147-.568 11.233 1.329a.78.78 0 0 1 .257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.937.937 0 1 1-.543-1.794c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 0 1-1.955.613z"/>
                    </svg>
                    spotify
                  </a>
                )}
                {artist.youtube && (
                  <a href={`https://youtube.com/@${artist.youtube}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 12, fontWeight: 600, transition: 'color 140ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    youtube
                  </a>
                )}
              </div>
            )}

            {artist.tag && tagStyles[artist.tag] && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 'var(--track-wide)',
                  textTransform: 'uppercase',
                  padding: '4px 8px',
                  background: tagStyles[artist.tag].bg,
                  color: tagStyles[artist.tag].color,
                  alignSelf: 'flex-start',
                }}
              >
                {artist.tag}
              </span>
            )}
          </div>
        </div>
      </section>

      {(artist.page_sections ?? DEFAULT_SECTIONS).filter(s => s.visible).map(s => {

        if (s.key === 'canciones') {
          if (!artist.tracks.length) return null
          return (
            <section key="canciones" className="section">
              <h2 style={{ marginBottom: 'var(--space-5)' }}>canciones</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {artist.tracks.map((track, i) => {
                  const active = isPlaying(track.title);
                  return (
                    <div key={track.id} onClick={() => handlePlay(track.title)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '12px var(--space-4)', borderRadius: 'var(--r-sm)', cursor: 'pointer', background: active ? 'var(--ink-100)' : 'transparent', transition: 'background var(--dur-fast) var(--ease-out)' }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--ink-100)'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <div style={{ width: 28, fontFamily: 'var(--font-mono)', fontSize: 13, color: active ? 'var(--gallo-red)' : 'var(--fg-muted)', textAlign: 'center', fontWeight: active ? 700 : 400 }}>
                        {active ? '♪' : i + 1}
                      </div>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 15 }}>{track.title}</div></div>
                      <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{track.plays}</div>
                      <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', minWidth: 36, textAlign: 'right' }}>{track.duration}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )
        }

        if (s.key === 'fechas') {
          if (!artist.shows.length) return null
          return (
            <section key="fechas" className="section section-alt">
              <h2 style={{ marginBottom: 'var(--space-5)' }}>fechas</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {artist.shows.map((show, i) => {
                  const soldOut    = show.tag === 'agotado' || show.available === 0;
                  const isPreventa = show.tag === 'preventa';
                  return (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 'var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', background: '#fff' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{show.venue}</div>
                        <div style={{ fontSize: 14, color: 'var(--fg-muted)' }}>{show.city} · {show.date}</div>
                        {isPreventa && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'var(--track-wide)', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>preventa termina en</div>
                            <Countdown target={artist.previewTimestamp} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>${show.price} MXN</div>
                        {!soldOut && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{show.available} disponibles</div>}
                        {soldOut ? <button className="btn btn-md" disabled>agotado</button> : <Link href={`/checkout/${artist.slug}`} className="btn btn-accent btn-md">comprar</Link>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )
        }

        if (s.key === 'merch') {
          if (!products.length) return null
          return (
            <section key="merch" className="section">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
                <h2>merch</h2>
                <Link href="/tienda" style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)', textDecoration: 'none' }}>ver todo →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-5)' }}>
                {products.map(product => {
                  const stock = totalStock(product.product_variants)
                  const soldOut = stock === 0
                  return (
                    <article key={product.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Link href={`/tienda/${product.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{ aspectRatio: '4/5', borderRadius: 'var(--r-md)', background: '#0a0a0a', position: 'relative', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <>
                              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: 'var(--gallo-red)' }} />
                              <div style={{ position: 'absolute', bottom: 16, left: 20, right: 12, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(14px, 2vw, 18px)', letterSpacing: 'var(--track-snug)', lineHeight: 1.1, textTransform: 'lowercase', color: '#fff' }}>{product.name}</div>
                            </>
                          )}
                          {product.category && <span style={{ position: 'absolute', top: 10, right: 10, background: '#0a0a0a', color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 7px' }}>{product.category}</span>}
                          {soldOut && <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: '#0a0a0a', padding: '5px 10px' }}>agotado</span></div>}
                        </div>
                      </Link>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(product.price_mxn)}</div>
                      </div>
                      {!soldOut && <Link href={`/tienda/${product.id}`} className="btn btn-primary btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>comprar</Link>}
                    </article>
                  )
                })}
              </div>
            </section>
          )
        }

        return null
      })}
    </>
  );
}
