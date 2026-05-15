'use client';

import Link from 'next/link';
import { Artist } from '@/lib/data';

const tagStyles: Record<string, { bg: string; color: string }> = {
  preventa: { bg: '#ff0100', color: '#fff' },
  agotado:  { bg: '#0a0a0a', color: '#fff' },
  'en vivo': { bg: '#ffe200', color: '#0a0a0a' },
};

interface Props {
  artist: Artist;
  ratio?: '1/1' | '4/3' | '3/4';
}

export default function ArtistTile({ artist, ratio = '1/1' }: Props) {
  const tagStyle = artist.tag ? tagStyles[artist.tag] : null;

  return (
    <Link href={`/artista/${artist.slug}`} className="artist-tile" style={{ textDecoration: 'none' }}>
      <div className="artist-tile-media" style={{ aspectRatio: ratio, background: artist.bg }}>
        {artist.image_url ? (
          <>
            <img
              src={artist.image_url}
              alt={artist.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%)' }} />
          </>
        ) : (
          <div className="artist-tile-stripe" style={{ background: artist.stripe }} />
        )}
        {tagStyle && artist.tag && (
          <span
            className="artist-tile-tag"
            style={{ background: tagStyle.bg, color: tagStyle.color }}
          >
            {artist.tag}
          </span>
        )}
        <div className="artist-tile-name">{artist.name}</div>
      </div>
      <div className="artist-tile-meta">
        <span>{artist.city}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{artist.date}</span>
      </div>
    </Link>
  );
}
