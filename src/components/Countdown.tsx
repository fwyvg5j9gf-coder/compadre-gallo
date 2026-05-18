'use client';

import { useState, useEffect } from 'react';

export default function Countdown({ target }: { target: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ms = Math.max(0, target - now);
  const d  = Math.floor(ms / 86400000);
  const h  = Math.floor(ms / 3600000) % 24;
  const m  = Math.floor(ms / 60000) % 60;
  const s  = Math.floor(ms / 1000) % 60;

  return (
    <div className="countdown">
      <div className="countdown-box">
        <div className="countdown-num">{d}</div>
        <div className="countdown-lbl">días</div>
      </div>
      <div className="countdown-box">
        <div className="countdown-num">{String(h).padStart(2, '0')}</div>
        <div className="countdown-lbl">hrs</div>
      </div>
      <div className="countdown-box">
        <div className="countdown-num">{String(m).padStart(2, '0')}</div>
        <div className="countdown-lbl">min</div>
      </div>
      <div className="countdown-box">
        <div className="countdown-num">{String(s).padStart(2, '0')}</div>
        <div className="countdown-lbl">seg</div>
      </div>
    </div>
  );
}
