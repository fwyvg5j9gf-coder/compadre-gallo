'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-wordmark" aria-label="gallo">
        <span className="hero-letter">g</span>
        <span className="hero-letter">a</span>
        <span className="hero-letter">l</span>
        <span className="hero-letter">l</span>
        <span className="hero-letter">o</span>
      </div>

      <div className="hero-tagline">
        <h1>
          escucha primero<span style={{ color: 'var(--gallo-red)' }}>.</span>
        </h1>
        <p className="hero-subtitle">
          música, cine, foto, escultura — curado antes de que sea viral.
        </p>
      </div>

      <div className="hero-ctas">
        <Link href="/artistas" className="btn btn-accent btn-lg">
          entra a la casa
        </Link>
        <Link href="/preventa" className="btn btn-secondary btn-lg">
          preventa disponible
        </Link>
      </div>
    </section>
  );
}
