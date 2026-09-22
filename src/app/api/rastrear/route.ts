import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

// Rastreo público de un pedido. A propósito pide folio Y correo juntos: el
// folio es secuencial y trivial de adivinar (GALLO-00001, 00002…), así que
// solo con eso cualquiera podría leer el nombre, la dirección y lo que compró
// otro cliente. El correo es algo que el dueño del pedido ya sabe.
//
// Patrón tomado de /rastrear de gangstafairy.

const ESTADOS_VISIBLES = new Set(['paid', 'shipped', 'delivered', 'cancelled', 'refunded'])

export async function GET(req: NextRequest) {
  const { allowed, retryAfterSeconds } = checkRateLimit(`rastrear:${getClientIp(req)}`, {
    limit: 15,
    windowMs: 15 * 60 * 1000,
  })
  if (!allowed) {
    return NextResponse.json(
      { error: 'demasiados intentos. espera unos minutos e intenta de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    )
  }

  const { searchParams } = req.nextUrl
  const folioRaw = (searchParams.get('folio') ?? '').trim()
  const email = (searchParams.get('email') ?? '').trim().toLowerCase()

  if (!folioRaw || !email) {
    return NextResponse.json({ error: 'falta el número de pedido o el correo' }, { status: 400 })
  }

  // Acepta "17", "00017" o "GALLO-00017" — nadie debería tener que recordar
  // el formato exacto que le mandamos por correo.
  const digitos = folioRaw.replace(/\D/g, '')
  if (!digitos) {
    return NextResponse.json({ error: 'no encontramos ese pedido — revisa el número y el correo.' }, { status: 404 })
  }
  const folioNumber = Number(digitos)

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('folio_number, status, created_at, customer_email, customer_name, subtotal_mxn, shipping_mxn, discount_mxn, total_mxn, shipping_carrier, tracking_number, shipping_address, order_items(product_name, quantity, unit_price_mxn)')
    .eq('folio_number', folioNumber)
    .maybeSingle()

  // Mismo mensaje sin importar cuál de los dos datos falló: a quien esté
  // adivinando folios no se le confirma que ese folio existe.
  if (!order || (order.customer_email ?? '').toLowerCase() !== email) {
    return NextResponse.json({ error: 'no encontramos ese pedido — revisa el número y el correo.' }, { status: 404 })
  }

  // Un pedido que nunca se pagó no se expone: su folio existe, pero no hay
  // nada que rastrear y sí datos personales que mostrar.
  if (!ESTADOS_VISIBLES.has(order.status)) {
    return NextResponse.json({ error: 'no encontramos ese pedido — revisa el número y el correo.' }, { status: 404 })
  }

  const addr = (order.shipping_address ?? {}) as Record<string, string>

  return NextResponse.json({
    folio: `GALLO-${String(order.folio_number).padStart(5, '0')}`,
    status: order.status,
    createdAt: order.created_at,
    nombre: order.customer_name,
    // Solo ciudad y estado: la calle no aporta nada aquí y es lo más sensible
    // que guarda la orden.
    ciudad: addr.city ?? null,
    estado: addr.state ?? null,
    subtotalMxn: order.subtotal_mxn,
    shippingMxn: order.shipping_mxn,
    discountMxn: order.discount_mxn ?? 0,
    totalMxn: order.total_mxn,
    carrier: order.shipping_carrier,
    guia: order.tracking_number,
    items: (order.order_items ?? []).map(i => ({
      nombre: i.product_name,
      qty: i.quantity,
      precioMxn: i.unit_price_mxn,
    })),
  })
}
