'use client'

import { useState } from 'react'
import { useCart, type CartItem } from '@/context/CartContext'
import { getAvailable } from '@/app/(platform)/carrito/actions'

const keyOf = (i: CartItem) => `${i.productId}:${i.size}`

// Sumar una pieza revisando antes el stock real. `maxedKey` marca el producto
// que ya llegó al máximo, para avisarle al cliente junto a ese renglón.
export function useCartIncrement() {
  const { setQty } = useCart()
  const [maxedKey, setMaxedKey] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  async function increment(item: CartItem) {
    const key = keyOf(item)
    setPendingKey(key)
    try {
      const available = await getAvailable(item.productId, item.size)
      if (item.qty >= available) { setMaxedKey(key); return }
      setMaxedKey(null)
      setQty(item.productId, item.size, item.qty + 1)
    } finally {
      setPendingKey(null)
    }
  }

  function decrement(item: CartItem) {
    setMaxedKey(null)
    setQty(item.productId, item.size, item.qty - 1)
  }

  return {
    increment,
    decrement,
    isMaxed: (i: CartItem) => maxedKey === keyOf(i),
    isPending: (i: CartItem) => pendingKey === keyOf(i),
  }
}
