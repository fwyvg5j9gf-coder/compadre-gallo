import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrThrow } from '@/lib/auth.server'
import { quoteForAdmin } from '@/lib/shipping.server'

// Cotiza con Envia para capturar una orden a mano (/casa/ordenes/nuevo).
export async function POST(req: NextRequest) {
  try {
    await requireAdminOrThrow()
    const body = await req.json() as {
      destZip: string
      destState: string
      destCity: string
      destColonia: string
      productIds: string[]
    }
    if (!body.destZip) return NextResponse.json({ error: 'agrega el código postal de destino' }, { status: 400 })

    const rates = await quoteForAdmin(
      { zip: String(body.destZip), state: String(body.destState ?? ''), city: String(body.destCity ?? ''), colonia: String(body.destColonia ?? '') },
      (body.productIds ?? []).slice(0, 50).map(productId => ({ productId: String(productId), qty: 1 })),
    )
    return NextResponse.json({ rates })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error al cotizar' }, { status: 500 })
  }
}
