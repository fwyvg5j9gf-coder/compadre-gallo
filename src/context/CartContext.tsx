'use client'

import { createContext, useContext, useEffect, useReducer } from 'react'

export type CartItem = {
  productId: string
  variantId: string | null
  size: string
  name: string
  price_mxn: number   // cents
  qty: number
  imageUrl: string | null
  packagingTypeId: string | null
}

type State = { items: CartItem[]; open: boolean }

type Action =
  | { type: 'ADD'; item: CartItem }
  | { type: 'REMOVE'; productId: string; size: string }
  | { type: 'SET_QTY'; productId: string; size: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'HYDRATE'; items: CartItem[] }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD': {
      const idx = state.items.findIndex(
        i => i.productId === action.item.productId && i.size === action.item.size,
      )
      if (idx >= 0) {
        const items = [...state.items]
        items[idx] = { ...items[idx], qty: items[idx].qty + action.item.qty }
        return { ...state, items }
      }
      return { ...state, items: [...state.items, action.item] }
    }
    case 'REMOVE':
      return {
        ...state,
        items: state.items.filter(
          i => !(i.productId === action.productId && i.size === action.size),
        ),
      }
    case 'SET_QTY':
      return {
        ...state,
        items: state.items.map(i =>
          i.productId === action.productId && i.size === action.size
            ? { ...i, qty: Math.max(1, action.qty) }
            : i,
        ),
      }
    case 'CLEAR':
      return { ...state, items: [] }
    case 'OPEN':
      return { ...state, open: true }
    case 'CLOSE':
      return { ...state, open: false }
    case 'HYDRATE':
      return { ...state, items: action.items }
  }
}

type CartCtxType = {
  items: CartItem[]
  open: boolean
  totalItems: number
  totalMxn: number
  addItem: (item: CartItem) => void
  removeItem: (productId: string, size: string) => void
  setQty: (productId: string, size: string, qty: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
}

const CartCtx = createContext<CartCtxType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], open: false })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gallo_cart')
      if (raw) dispatch({ type: 'HYDRATE', items: JSON.parse(raw) })
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('gallo_cart', JSON.stringify(state.items))
  }, [state.items])

  const totalItems = state.items.reduce((s, i) => s + i.qty, 0)
  const totalMxn = state.items.reduce((s, i) => s + i.price_mxn * i.qty, 0)

  return (
    <CartCtx.Provider value={{
      items: state.items,
      open: state.open,
      totalItems,
      totalMxn,
      addItem: item => dispatch({ type: 'ADD', item }),
      removeItem: (productId, size) => dispatch({ type: 'REMOVE', productId, size }),
      setQty: (productId, size, qty) => dispatch({ type: 'SET_QTY', productId, size, qty }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
      openCart: () => dispatch({ type: 'OPEN' }),
      closeCart: () => dispatch({ type: 'CLOSE' }),
    }}>
      {children}
    </CartCtx.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}
