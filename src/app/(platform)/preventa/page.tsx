import ArtistTile from '@/components/ArtistTile';
import Countdown from '@/components/Countdown';
import { ARTISTS, getPreventaArtists } from '@/lib/data';
import Link from 'next/link';

export default function PreventaPage() {
  const preventas = getPreventaArtists();
  const upcoming  = ARTISTS.filter(a => !a.tag && a.shows.some(s => s.available > 0));
  const featured  = preventas[0];

  return (
    <>
      {/* Featured drop */}
      {featured && (
        <section
          style={{
            background: featured.bg,
            color: '#fff',
            padding: 'var(--space-8) var(--outer-px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-5)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 'var(--track-wide)',
              textTransform: 'uppercase',
              color: 'var(--gallo-red)',
              background: '#fff',
              display: 'inline-block',
              padding: '4px 8px',
              alignSelf: 'flex-start',
            }}
          >
            PREVENTA DISPONIBLE
          </span>

          <div>
            <h1 style={{ color: '#fff', fontSize: 'clamp(48px, 8vw, 120px)' }}>{featured.name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginTop: 'var(--space-2)' }}>
              {featured.dateLabel} · desde ${featured.shows[0]?.price} MXN
            </p>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 'var(--track-wide)', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 'var(--space-3)' }}>
              preventa termina en
            </div>
            <div style={{ color: '#fff' }}>
              <Countdown target={featured.previewTimestamp} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Link href={`/checkout/${featured.slug}`} className="btn btn-accent btn-lg">
              comprar boleto
            </Link>
            <Link href={`/artista/${featured.slug}`} className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              conoce al artista
            </Link>
          </div>
        </section>
      )}

      {/* All preventa */}
      <section className="section">
        <div className="section-header">
          <h2>con boletos disponibles</h2>
        </div>
        <div className="grid-3">
          {preventas.map(a => (
            <ArtistTile key={a.slug} artist={a} ratio="4/3" />
          ))}
        </div>
      </section>

      {/* Upcoming with tickets */}
      {upcoming.length > 0 && (
        <section className="section section-alt">
          <div className="section-header">
            <h2>próximamente</h2>
          </div>
          <div className="grid-4">
            {upcoming.map(a => (
              <ArtistTile key={a.slug} artist={a} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
