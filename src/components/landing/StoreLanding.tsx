'use client'

import { useState, type MouseEvent, type PointerEvent } from 'react'
import Link from 'next/link'
import { fmt } from '@/lib/utils'
import { stockBadge, type Lamp } from '@/lib/lamparas'
import NewsletterSignup from './NewsletterSignup'

type Other = { id: string; name: string; price_mxn: number; image_url: string; stock: number | null }

// Etiqueta de inventario, como en gangstafairy: AGOTADO o cuántas quedan.
export function StockTag({ stock, overlay }: { stock: number | null; overlay?: boolean }) {
  const b = stockBadge(stock)
  if (!b) return null
  const cls = `lt-stock${b.kind === 'agotado' ? ' is-out' : ' is-low'}${overlay ? ' is-overlay' : ''}`
  return <span className={cls}>{b.kind === 'agotado' ? 'AGOTADO' : `QUEDAN ${b.n}`}</span>
}

// ── Prender la lámpara ────────────────────────────────────────────────────────
// Con mouse, pasar encima la prende de muestra y el clic la deja prendida.
// En touch no hay hover: el tap dispara hover y clic juntos y se cancelaban,
// así que el hover solo cuenta con mouse y el tap prende/apaga directo.
export function useLampLight(name: string) {
  const [pinned, setPinned] = useState(false)
  const [hover, setHover] = useState(false)
  const stageProps = {
    'aria-pressed': pinned,
    'aria-label': pinned ? `apagar ${name}` : `prender ${name}`,
    onPointerEnter: (e: PointerEvent) => { if (e.pointerType === 'mouse') setHover(true) },
    onPointerLeave: (e: PointerEvent) => { if (e.pointerType === 'mouse') setHover(false) },
    onClick: () => {
      if (pinned) { setPinned(false); setHover(false) } else setPinned(true)
    },
  }
  return { on: pinned || hover, stageProps }
}

// ── Marquesina: envío gratis express ─────────────────────────────────────────
// Corre de derecha a izquierda sin fin. Entre frase y frase va el wordmark de
// cinco colores (el único lugar donde la marca deja la paleta completa). Se
// detiene al pasar el mouse y se queda quieta con movimiento reducido.
function EnvioMarquee({ desde }: { desde: string }) {
  const texto = `ENVÍO GRATIS EXPRESS DESDE ${desde}`
  const tramo = (key: string, hidden = false) => (
    <div className="lt-marquee-run" key={key} aria-hidden={hidden || undefined}>
      {Array.from({ length: 6 }, (_, i) => (
        <span className="lt-marquee-item" key={i}>
          <span>{texto}</span>
          <span className="lt-marquee-mark" aria-hidden="true">
            <span style={{ color: '#003a87' }}>g</span><span style={{ color: '#00c4df' }}>a</span><span style={{ color: '#ffd49a' }}>l</span><span style={{ color: '#ff0100' }}>l</span><span style={{ color: '#ffe200' }}>o</span>
          </span>
        </span>
      ))}
    </div>
  )
  return (
    <div className="lt-marquee" role="note" aria-label={`envío gratis express desde ${desde}`}>
      <div className="lt-marquee-track">
        {tramo('a', true)}
        {tramo('b', true)}
      </div>
    </div>
  )
}

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
        {look?.srcOn && <img className="lt-hero-img lt-img-on" src={look.srcOn} alt="" aria-hidden="true" />}
      </div>
    </section>
  )
}

// "avísame cuando salga": baja al correo y deja el cursor listo para escribir.
// Sin JavaScript, el ancla #avisame hace lo mismo menos el foco.
function goToSignup(e: MouseEvent<HTMLAnchorElement>) {
  const input = document.getElementById('nl-email')
  if (!input) return
  e.preventDefault()
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  input.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' })
  input.focus({ preventScroll: true })
}

// ── Producto ──────────────────────────────────────────────────────────────────
function LampPanel({ lamp, index }: { lamp: Lamp; index: number }) {
  const [lookIdx, setLookIdx] = useState(0)
  const { on, stageProps } = useLampLight(lamp.name)
  const look = lamp.looks[lookIdx]
  const soldOut = stockBadge(lamp.stock)?.kind === 'agotado'

  return (
    <article className="lt-product" data-flip={index % 2 === 1} data-on={on}>
      <button
        type="button"
        className="lt-product-stage"
        {...stageProps}
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
        {look?.srcOn && <img className="lt-product-img lt-img-on" src={look.srcOn} alt="" aria-hidden="true" loading="lazy" />}
      </button>

      <div className="lt-product-info">
        <div className="lt-product-top">
          <span className="lt-index">{String(index + 1).padStart(2, '0')}</span>
          <StockTag stock={lamp.stock} />
        </div>
        <h2 className="lt-product-name"><Link href={lamp.href}>{lamp.name}</Link></h2>
        {lamp.blurb && <p className="lt-blurb">{lamp.blurb}</p>}
        <Link href={lamp.href} className="lt-more">ver detalles →</Link>

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
          {soldOut ? (
            <button type="button" className="btn btn-lg btn-accent" disabled>se acabó</button>
          ) : lamp.buyable ? (
            <Link href={lamp.href} className="btn btn-lg btn-accent">la quiero</Link>
          ) : (
            <a href="#avisame" className="btn btn-lg btn-secondary" onClick={goToSignup}>avísame cuando salga</a>
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
  freeThresholdMxn = 0,
}: {
  lamps: Lamp[]
  isPlaceholder: boolean
  others: Other[]
  freeThresholdMxn?: number
}) {
  return (
    <div className="lt">
      {freeThresholdMxn > 0 && <EnvioMarquee desde={fmt(freeThresholdMxn).replace(/\.00$/, '')} />}
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

      <NewsletterSignup />

      {others.length > 0 && (
        <section className="lt-others">
          <div className="lt-others-head">
            <h2 className="lt-others-title">también hay cosas que no prenden.</h2>
          </div>
          <div className="lt-others-row">
            {others.map(o => (
              <Link key={o.id} href={`/tienda/${o.id}`} className="lt-other">
                <span className="lt-other-img">
                  <img src={o.image_url} alt={o.name} loading="lazy" />
                  <StockTag stock={o.stock} overlay />
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
