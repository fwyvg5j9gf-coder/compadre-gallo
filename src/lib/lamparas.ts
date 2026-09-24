// Lámparas del landing — seguro para importar desde Client Components
//
// El landing muestra los productos publicados con categoría `lampara`. Mientras
// no exista ninguno, usa PLACEHOLDER_LAMPS: perritos y gatitos dibujados en
// `public/placeholders/`, para poder construir el diseño antes de tener fotos.
// En cuanto se publique la primera lámpara real en /casa/tienda, los
// placeholders desaparecen solos.

import type { Product } from './supabase'

export const LAMP_CATEGORY = 'lampara'

export type LampLook = {
  label: string        // nombre del color o acabado
  swatch: string       // color del botón selector
  src: string
}

export type Lamp = {
  id: string
  name: string
  blurb: string
  price_mxn: number    // centavos, igual que products.price_mxn
  looks: LampLook[]
  href: string | null  // null = aún no se puede comprar
  stock: number | null // piezas en existencia; null = no aplica (placeholders)
}

// Igual que gangstafairy: con 5 piezas o menos se avisa cuántas quedan.
export const STOCK_BAJO = 5

export type StockBadge = { kind: 'agotado' } | { kind: 'quedan'; n: number } | null

export function stockBadge(stock: number | null): StockBadge {
  if (stock === null) return null
  if (stock <= 0) return { kind: 'agotado' }
  if (stock <= STOCK_BAJO) return { kind: 'quedan', n: stock }
  return null
}

// null si el producto no tiene variantes: sin inventario no se puede afirmar
// que esté agotado.
export function totalStock(p: Product): number | null {
  const variants = p.product_variants ?? []
  if (variants.length === 0) return null
  return variants.reduce((n, v) => n + Math.max(0, v.stock), 0)
}

export function productToLamp(p: Product): Lamp {
  return {
    id: p.id,
    name: p.name,
    blurb: p.description ?? '',
    price_mxn: p.price_mxn,
    looks: p.image_url ? [{ label: p.name, swatch: '#2a2a28', src: p.image_url }] : [],
    href: `/tienda/${p.id}`,
    stock: totalStock(p),
  }
}

const ph = (file: string) => `/placeholders/${file}.svg`

export const PLACEHOLDER_LAMPS: Lamp[] = [
  {
    id: 'ph-firulais',
    name: 'firulais',
    blurb: 'se sienta, te mira y alumbra. no pide nada más.',
    price_mxn: 129000,
    looks: [
      { label: 'caramelo', swatch: '#d99a5b', src: ph('firulais-caramelo') },
      { label: 'blanco',   swatch: '#f1ede4', src: ph('firulais-blanco') },
      { label: 'negro',    swatch: '#3a3632', src: ph('firulais-negro') },
    ],
    href: null,
    stock: null,
  },
  {
    id: 'ph-michi',
    name: 'michi',
    blurb: 'te ignora todo el día. en la noche es otra cosa.',
    price_mxn: 119000,
    looks: [
      { label: 'naranja', swatch: '#f2a44f', src: ph('michi-naranja') },
      { label: 'gris',    swatch: '#a9a8a4', src: ph('michi-gris') },
      { label: 'negro',   swatch: '#2f2d2b', src: ph('michi-negro') },
    ],
    href: null,
    stock: null,
  },
  {
    id: 'ph-salchicha',
    name: 'salchicha',
    blurb: 'larga, para el buró largo. o para el buró normal, no juzgamos.',
    price_mxn: 149000,
    looks: [
      { label: 'café',     swatch: '#8b5a3c', src: ph('salchicha-cafe') },
      { label: 'caramelo', swatch: '#d08a4c', src: ph('salchicha-caramelo') },
    ],
    href: null,
    stock: null,
  },
  {
    id: 'ph-bolita',
    name: 'bolita',
    blurb: 'luz bajita, para cuando ya te vas a dormir. igual que ella.',
    price_mxn: 99000,
    looks: [
      { label: 'naranja', swatch: '#f2a44f', src: ph('bolita-naranja') },
      { label: 'blanco',  swatch: '#f1ede4', src: ph('bolita-blanco') },
    ],
    href: null,
    stock: null,
  },
]
