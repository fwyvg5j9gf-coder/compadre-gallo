'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface NowPlaying {
  artistName: string;
  trackTitle: string;
  bg: string;
  slug: string;
}

interface PlayerContextValue {
  nowPlaying: NowPlaying | null;
  playing: boolean;
  play: (track: NowPlaying) => void;
  toggle: () => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [playing, setPlaying] = useState(false);

  const play = useCallback((track: NowPlaying) => {
    setNowPlaying(track);
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => setPlaying(p => !p), []);
  const stop = useCallback(() => { setNowPlaying(null); setPlaying(false); }, []);

  return (
    <PlayerContext.Provider value={{ nowPlaying, playing, play, toggle, stop }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
