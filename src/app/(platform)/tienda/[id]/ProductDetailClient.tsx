'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { fmt } from '@/lib/utils'
import type { LampLook } from '@/lib/lamparas'
import { StockTag, useLampLight } from '@/components/landing/StoreLanding'

export type DetailProduct = {
  id: string
  name: string
  category: string | null
  blurb: string
  price_mxn: number
  looks: LampLook[]
  variants: { id: string; size: string; stock: number }[]
  specs: [string, string][]
  makingMinutes: number | null
  buyable: boolean
  isPlaceholder: boolean
  prototipo?: boolean
  packagingTypeId: string | null
}

// Número que sube de 0 a `to` cuando entra en pantalla. Se renderiza ya con
// el valor final (sin JavaScript o con movimiento reducido se queda así).
function CountUp({ to, duration = 1600 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(to)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let started = false
    setValue(0)
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return
      started = true
      io.disconnect()
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(Math.round(to * eased))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [to, duration])

  return <span ref={ref} aria-hidden="true">{value.toLocaleString('es-MX')}</span>
}

// Página de producto con la receta de la tienda: la pieza enorme y que se
// prende, el nombre gigante, y abajo la ficha técnica completa (aprendido de
// Crème Atelier: en lámparas la ficha es lo que da confianza).
export default function ProductDetailClient({
  product,
  freeThresholdMxn,
}: {
  product: DetailProduct
  freeThresholdMxn: number
}) {
  const { items, addItem, openCart } = useCart()
  const { variants } = product

  const isUnica = variants.length === 0 || (variants.length === 1 && variants[0].size === 'única')
  const [size, setSize] = useState<string | null>(isUnica ? 'única' : null)
  const [lookIdx, setLookIdx] = useState(0)
  const { on, stageProps } = useLampLight(product.name)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const look = product.looks[lookIdx]
  const variant = isUnica ? variants[0] ?? null : variants.find(v => v.size === size) ?? null
  const totalStock = variants.length ? variants.reduce((n, v) => n + Math.max(0, v.stock), 0) : null

  // Lo que ya está en el carrito cuenta: no se puede agregar más de lo que hay.
  const inCart = items.find(i => i.productId === product.id && i.size === size)?.qty ?? 0
  const remaining = variant ? Math.max(0, variant.stock - inCart) : null

  const soldOut = product.buyable && (isUnica ? (variants[0]?.stock ?? 0) === 0 : totalStock === 0)
  const canAdd = product.buyable && !soldOut && size !== null && remaining !== null && remaining > 0

  function handleAdd() {
    if (!canAdd || !size) return
    addItem({
      productId: product.id,
      variantId: variant?.id ?? null,
      size,
      name: product.name,
      price_mxn: product.price_mxn,
      qty: Math.min(qty, remaining ?? qty),
      imageUrl: look?.src ?? null,
      packagingTypeId: product.packagingTypeId,
    })
    setQty(1)
    setAdded(true)
    openCart()
    setTimeout(() => setAdded(false), 2000)
  }

  const cta = soldOut ? 'se acabó'
    : size === null ? 'elige una talla'
    : remaining === 0 ? 'ya tienes todas en tu carrito'
    : added ? 'agregada a tu carrito'
    : 'la quiero'

  const freeShipping = freeThresholdMxn > 0 && product.price_mxn >= freeThresholdMxn

  return (
    <div className="pd">
      <Link href="/tienda" className="pd-back">← tienda</Link>

      <div className="pd-main" data-on={on}>
        <button
          type="button"
          className="lt-product-stage pd-stage"
          {...stageProps}
        >
          <span className="lt-glow" aria-hidden="true" />
          {look && <img className="lt-product-img" src={look.src} alt={`${product.name} ${look.label}`} />}
          {look?.srcOn && <img className="lt-product-img lt-img-on" src={look.srcOn} alt="" aria-hidden="true" />}
        </button>

        <div className="pd-info">
          <div className="lt-product-top">
            {product.category && <span className="eyebrow">{product.category.toUpperCase()}</span>}
            <StockTag stock={product.buyable ? (variant?.stock ?? totalStock) : null} />
          </div>
          <h1 className="pd-name">{product.name}</h1>
          <p className="pd-price">{fmt(product.price_mxn)}</p>
          {product.blurb && <p className="pd-blurb">{product.blurb}</p>}

          {product.looks.length > 1 && (
            <div className="lt-looks">
              <div className="lt-swatches" role="radiogroup" aria-label="color">
                {product.looks.map((l, i) => (
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

          {!isUnica && (
            <div className="pd-field">
              <span className="eyebrow">TALLA</span>
              <div className="pd-sizes">
                {variants.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    className="pd-size"
                    aria-pressed={size === v.size}
                    disabled={v.stock === 0}
                    onClick={() => { setSize(v.size); setQty(1) }}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.buyable && !soldOut && (
            <div className="pd-field">
              <span className="eyebrow">CANTIDAD</span>
              <div className="cart-qty">
                <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="quitar una">−</button>
                <span aria-live="polite">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(q => q + 1)}
                  disabled={remaining !== null && qty >= remaining}
                  aria-label="agregar una"
                >+</button>
              </div>
            </div>
          )}

          {product.buyable ? (
            <button type="button" className="btn btn-lg btn-accent pd-cta" onClick={handleAdd} disabled={!canAdd || added}>
              {cta}
            </button>
          ) : (
            <Link href="/tienda#avisame" className="btn btn-lg btn-secondary pd-cta">avísame cuando salga</Link>
          )}

          <div className="pd-ship">
            {product.buyable && freeThresholdMxn > 0 && (
              <p className="pd-ship-free">
                {freeShipping ? 'esta lleva envío gratis express.' : `envío gratis express desde ${fmt(freeThresholdMxn)}.`}
              </p>
            )}
            <p>el costo y el tiempo de entrega exactos salen con tu código postal al pagar.</p>
          </div>

          {product.isPlaceholder && (
            <p className="lt-note">
              {product.prototipo
                ? 'es un prototipo: todavía no está a la venta. cuando salga, la compras aquí mismo.'
                : 'este dibujo es de relleno, y su ficha también. la lámpara de verdad viene en camino.'}
            </p>
          )}
        </div>
      </div>

      {product.makingMinutes && (
        <section className="pd-hours" aria-label={`cada una tarda ${product.makingMinutes} minutos en crearse`}>
          <p className="pd-hours-num"><CountUp to={product.makingMinutes} /><span className="pd-hours-unit">min</span></p>
          <p className="pd-hours-text" aria-hidden="true">
            cada una tarda {product.makingMinutes.toLocaleString('es-MX')} minutos en crearse.
          </p>
        </section>
      )}

      {product.specs.length > 0 && (
        <section className="pd-specs">
          <h2 className="pd-specs-title">ficha técnica</h2>
          <dl>
            {product.specs.map(([k, v]) => (
              <div key={k} className="pd-spec">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
