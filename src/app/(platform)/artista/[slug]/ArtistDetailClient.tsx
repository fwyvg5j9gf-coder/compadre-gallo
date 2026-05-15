'use client';

import Link from 'next/link';
import { Artist } from '@/lib/data';
import { usePlayer } from '@/context/PlayerContext';
import Countdown from '@/components/Countdown';

const tagStyles: Record<string, { bg: string; color: string }> = {
  preventa:  { bg: '#ff0100', color: '#fff' },
  agotado:   { bg: '#0a0a0a', color: '#fff' },
  'en vivo': { bg: '#ffe200', color: '#0a0a0a' },
};

export default function ArtistDetailClient({ artist }: { artist: Artist }) {
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
          <div className="artist-hero-img" style={{ background: `color-mix(in srgb, ${artist.stripe} 30%, ${artist.bg})` }}>
            <div style={{
              width: '100%', height: '100%',
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

      {/* Tracks */}
      <section className="section">
        <h2 style={{ marginBottom: 'var(--space-5)' }}>canciones</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {artist.tracks.map((track, i) => {
            const active = isPlaying(track.title);
            return (
              <div
                key={track.id}
                onClick={() => handlePlay(track.title)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: '12px var(--space-4)',
                  borderRadius: 'var(--r-sm)',
                  cursor: 'pointer',
                  background: active ? 'var(--ink-100)' : 'transparent',
                  transition: 'background var(--dur-fast) var(--ease-out)',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--ink-100)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{
                  width: 28,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: active ? 'var(--gallo-red)' : 'var(--fg-muted)',
                  textAlign: 'center',
                  fontWeight: active ? 700 : 400,
                }}>
                  {active ? '♪' : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{track.title}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                  {track.plays}
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', minWidth: 36, textAlign: 'right' }}>
                  {track.duration}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Shows */}
      <section className="section section-alt">
        <h2 style={{ marginBottom: 'var(--space-5)' }}>fechas</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {artist.shows.map((show, i) => {
            const soldOut   = show.tag === 'agotado' || show.available === 0;
            const isPreventa = show.tag === 'preventa';
            return (
              <div
                key={i}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  flexWrap: 'wrap',
                  background: '#fff',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{show.venue}</div>
                  <div style={{ fontSize: 14, color: 'var(--fg-muted)' }}>{show.city} · {show.date}</div>
                  {isPreventa && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 'var(--track-wide)', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 6 }}>
                        preventa termina en
                      </div>
                      <Countdown target={artist.previewTimestamp} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>${show.price} MXN</div>
                  {!soldOut && (
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                      {show.available} disponibles
                    </div>
                  )}
                  {soldOut ? (
                    <button className="btn btn-md" disabled>agotado</button>
                  ) : (
                    <Link href={`/checkout/${artist.slug}`} className="btn btn-accent btn-md">
                      comprar
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
