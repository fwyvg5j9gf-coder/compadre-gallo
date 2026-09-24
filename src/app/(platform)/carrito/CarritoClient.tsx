'use client'

import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { useCartIncrement } from '@/components/useCartIncrement'
import { fmt } from '@/lib/utils'

// Carrito completo, como el de gangstafairy: se puede revisar todo con calma
// antes de pagar. El cajón lateral sigue existiendo para agregar rápido.
export default function CarritoClient() {
  const { items, totalMxn, totalItems, removeItem } = useCart()
  const { increment, decrement, isMaxed, isPending } = useCartIncrement()

  if (items.length === 0) {
    return (
      <div className="cart cart-empty">
        <h1 className="cart-title">tu carrito está vacío.</h1>
        <p className="cart-empty-sub">todavía no hay nada que alumbre aquí.</p>
        <Link href="/tienda" className="btn btn-lg btn-accent">ir a la tienda</Link>
      </div>
    )
  }

  return (
    <div className="cart">
      <h1 className="cart-title">
        tu carrito <span className="cart-count">{totalItems} {totalItems === 1 ? 'pieza' : 'piezas'}</span>
      </h1>

      <div className="cart-layout">
        <ul className="cart-items">
          {items.map(item => (
            <li key={`${item.productId}-${item.size}`} className="cart-item">
              <Link href={`/tienda/${item.productId}`} className="cart-item-img">
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
              </Link>

              <div className="cart-item-info">
                <Link href={`/tienda/${item.productId}`} className="cart-item-name">{item.name}</Link>
                {item.size !== 'única' && <span className="cart-item-meta">talla {item.size}</span>}
                <span className="cart-item-meta">{fmt(item.price_mxn)} c/u</span>

                <div className="cart-qty">
                  <button type="button" onClick={() => decrement(item)} disabled={item.qty <= 1} aria-label="quitar una">−</button>
                  <span aria-live="polite">{item.qty}</span>
                  <button type="button" onClick={() => increment(item)} disabled={isPending(item)} aria-label="agregar una">+</button>
                </div>
                {isMaxed(item) && <span className="cart-maxed">ya tienes todas las que hay</span>}
              </div>

              <div className="cart-item-right">
                <span className="cart-line-total">{fmt(item.price_mxn * item.qty)}</span>
                <button type="button" className="cart-remove" onClick={() => removeItem(item.productId, item.size)}>
                  quitar
                </button>
              </div>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <div className="cart-row"><span>subtotal</span><span className="cart-mono">{fmt(totalMxn)}</span></div>
          <div className="cart-row"><span>envío</span><span>se calcula al pagar</span></div>
          <div className="cart-row cart-row-total"><span>total</span><span className="cart-mono">{fmt(totalMxn)}</span></div>
          <Link href="/carrito/checkout" className="btn btn-lg btn-accent cart-pay">pagar</Link>
          <p className="cart-note">no necesitas cuenta. con tu folio y tu correo sigues tu pedido.</p>
          <Link href="/tienda" className="cart-back">← seguir comprando</Link>
        </aside>
      </div>
    </div>
  )
}
