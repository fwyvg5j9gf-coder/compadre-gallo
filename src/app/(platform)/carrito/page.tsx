import type { Metadata } from 'next'
import CarritoClient from './CarritoClient'

export const metadata: Metadata = {
  title: 'tu carrito — compadregallo',
}

export default function CarritoPage() {
  return <CarritoClient />
}
