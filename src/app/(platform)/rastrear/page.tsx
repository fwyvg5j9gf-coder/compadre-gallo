import type { Metadata } from 'next'
import RastrearClient from './RastrearClient'

export const metadata: Metadata = {
  title: 'rastrear pedido — gallo',
  description: 'consulta el estado de tu pedido con tu número de folio y tu correo.',
}

export default function RastrearPage() {
  return <RastrearClient />
}
