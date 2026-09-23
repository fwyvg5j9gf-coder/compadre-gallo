'use client'

import { useState } from 'react'
import Link from 'next/link'
import { fmt } from '@/lib/utils'
import type { Lamp } from '@/lib/lamparas'

type Other = { id: string; name: string; price_mxn: number; image_url: string }

// ── Hero ──────────────────────────────────────────────────────────────────────
// El apagador prende la lámpara: el cuarto se oscurece y aparece la luz.
function Hero({ lamp }: { lamp: Lamp }) {
  const [on, setOn] = useState(false)
  const look = lamp.looks[0]

  return (
    <section className="lt-hero" data-on={on}>
      <div className="lt-hero-copy">
        <p className="eyebrow lt-eyebrow">LÁMPARAS · EDICIÓN LIMITADA</p>
        <h1 className="lt-hero-title">
          es solo<br />una<br />lamparita.
        </h1>
        <button
          type="button"
          className="lt-switch"
          aria-pressed={on}
          onClick={() => setOn(v => !v)}
        >
          <span className="lt-switch-track" aria-hidden="true"><span className="lt-switch-knob" /></span>
          {on ? 'apágala' : 'préndela'}
        </button>
      </div>

      <div className="lt-hero-stage">
        <span className="lt-glow" aria-hidden="true" />
        {look && <img className="lt-hero-img" src={look.src} alt={`${lamp.name} ${look.label}`} />}
      </div>
    </section>
  )
}

// ── Producto ──────────────────────────────────────────────────────────────────
function LampPanel({ lamp, index }: { lamp: Lamp; index: number }) {
  const [lookIdx, setLookIdx] = useState(0)
  const [on, setOn] = useState(false)
  const look = lamp.looks[lookIdx]

  return (
    <article className="lt-product" data-flip={index % 2 === 1} data-on={on}>
      <button
        type="button"
        className="lt-product-stage"
        aria-pressed={on}
        aria-label={on ? `apagar ${lamp.name}` : `prender ${lamp.name}`}
        onMouseEnter={() => setOn(true)}
        onMouseLeave={() => setOn(false)}
        onClick={() => setOn(v => !v)}
      >
        <span className="lt-glow" aria-hidden="true" />
        {look && (
          <img
            className="lt-product-img"
            src={look.src}
            alt={`${lamp.name} ${look.label}`}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        )}
      </button>

      <div className="lt-product-info">
        <span className="lt-index">{String(index + 1).padStart(2, '0')}</span>
        <h2 className="lt-product-name">{lamp.name}</h2>
        {lamp.blurb && <p className="lt-blurb">{lamp.blurb}</p>}

        {lamp.looks.length > 1 && (
          <div className="lt-looks">
            <div className="lt-swatches" role="radiogroup" aria-label="color">
              {lamp.looks.map((l, i) => (
                <button
                  key={l.label}
                  type="button"
                  role="radio"
                  aria-checked={i === lookIdx}
                  aria-label={l.label}
                  className="lt-swatch"
                  style={{ background: l.swatch }}
                  onClick={() => setLookIdx(i)}
                />
              ))}
            </div>
            <span className="lt-look-name">{look?.label}</span>
          </div>
        )}

        <div className="lt-buy">
          <span className="lt-price">{fmt(lamp.price_mxn)}</span>
          {lamp.soldOut ? (
            <span className="lt-tag">AGOTADO</span>
          ) : lamp.href ? (
            <Link href={lamp.href} className="btn btn-lg btn-accent">la quiero</Link>
          ) : (
            <button type="button" className="btn btn-lg btn-accent" disabled>ya casi</button>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function StoreLanding({
  lamps,
  isPlaceholder,
  others,
}: {
  lamps: Lamp[]
  isPlaceholder: boolean
  others: Other[]
}) {
  return (
    <div className="lt">
      {lamps[0] && <Hero lamp={lamps[0]} />}

      <section className="lt-manifesto">
        <p>
          no hacen ruido.<br />
          no se conectan a nada.<br />
          solo alumbran<br />
          <span className="lt-hl">y se ven bonitas haciéndolo.</span>
        </p>
        {isPlaceholder && (
          <p className="lt-note">
            los perritos y gatitos son de relleno. las lámparas vienen en camino.
          </p>
        )}
      </section>

      <section className="lt-products" aria-label="lámparas">
        {lamps.map((l, i) => <LampPanel key={l.id} lamp={l} index={i} />)}
      </section>

      {others.length > 0 && (
        <section className="lt-others">
          <div className="lt-others-head">
            <h2 className="lt-others-title">también hay cosas que no prenden.</h2>
            <Link href="/tienda" className="lt-others-link">ver toda la tienda →</Link>
          </div>
          <div className="lt-others-row">
            {others.map(o => (
              <Link key={o.id} href={`/tienda/${o.id}`} className="lt-other">
                <span className="lt-other-img">
                  <img src={o.image_url} alt={o.name} loading="lazy" />
                </span>
                <span className="lt-other-meta">
                  <span>{o.name}</span>
                  <span className="lt-other-price">{fmt(o.price_mxn)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
