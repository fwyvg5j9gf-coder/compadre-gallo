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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20" fill="none">
                <rect x="9" y="7" width="5" height="18" rx="1.5" fill="#ff0100"/>
                <rect x="18" y="7" width="5" height="18" rx="1.5" fill="#ffe200"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20" fill="none">
                <polygon points="11,7 25,16 11,25" fill="#ff0100"/>
              </svg>
            )}
          </button>
        </>
      )}
    </div>
  );
}
