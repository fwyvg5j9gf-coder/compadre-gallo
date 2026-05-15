'use client';

import { usePlayer } from '@/context/PlayerContext';

export default function PlayBar() {
  const { nowPlaying, playing, toggle } = usePlayer();

  return (
    <div className={`playbar${nowPlaying ? ' is-visible' : ''}`}>
      {nowPlaying && (
        <>
          <div className="playbar-art" style={{ background: nowPlaying.bg }} />
          <div>
            <div className="playbar-title">{nowPlaying.trackTitle}</div>
            <div className="playbar-sub">{nowPlaying.artistName}</div>
          </div>
          <div className="playbar-spacer" />
          <button className="playbar-ctrl" onClick={toggle} aria-label={playing ? 'pausar' : 'reproducir'}>
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="1" width="4" height="12" rx="1" fill="#0a0a0a"/>
                <rect x="8" y="1" width="4" height="12" rx="1" fill="#0a0a0a"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 1.5L12 7L3 12.5V1.5Z" fill="#0a0a0a"/>
              </svg>
            )}
          </button>
        </>
      )}
    </div>
  );
}
