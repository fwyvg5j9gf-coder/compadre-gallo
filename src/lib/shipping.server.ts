// Envíos a la medida de compadregallo, sobre Envia.com (src/lib/envia.ts).
//
// Todo lo que decide cuánto cuesta un envío pasa por aquí, en el servidor:
//  - La configuración (llave de prueba o producción, paqueterías, recargo,
//    origen) sale de store_settings / store_secrets, igual que Stripe.
//  - El paquete se arma con los productos reales del carrito, nunca con lo que
//    diga el navegador.
//  - Las opciones del checkout salen FIRMADAS (HMAC): el cobro solo acepta un
//    precio de envío con firma válida para ese código postal y ese carrito.
//    Antes el servidor creía el costo de envío que mandaba el navegador.
//  - Envío gratis desde el umbral de configuración se respeta siempre.
//
// Skydropx (src/lib/skydropx.ts) se queda en el repo sin usarse, por si vuelve.

import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase.server'
import {
  cancelEnviaShipment, createEnviaShipment, getEnviaRates, splitStreet, trackEnviaShipment,
  type EnviaAddress, type EnviaAuth, type EnviaParcel, type EnviaTrackResult, type ShippingRate,
} from '@/lib/envia'

export type { ShippingRate } from '@/lib/envia'

// ── Configuración ────────────────────────────────────────────────────────────
export type ShippingConfig = {
  enabled: boolean
  auth: EnviaAuth | null
  carriers: string[]
  markupPct: number
  freeThresholdMxn: number  // centavos; 0 = sin envío gratis
  flatMxn: number           // centavos; tarifa fija cuando Envia no está disponible
  origin: EnviaAddress | null
  missing: string[]         // qué falta para poder cotizar/comprar
}

export async function getShippingConfig(): Promise<ShippingConfig> {
  const [{ data: s }, { data: k }] = await Promise.all([
    supabaseAdmin.from('store_settings').select(
      'envia_enabled, envia_test_mode, envia_carriers, envia_markup_pct, shipping_free_threshold_mxn, shipping_national_mxn, ' +
      'origin_name, origin_street, origin_number, origin_colonia, origin_city, origin_state, origin_zip, origin_phone, origin_email',
    ).eq('id', 1).single(),
    supabaseAdmin.from('store_secrets').select('envia_api_key_test, envia_api_key_live').eq('id', 1).single(),
  ])

  const settings = (s ?? {}) as Record<string, unknown>
  const secrets = (k ?? {}) as Record<string, string | null>
  const mode = settings.envia_test_mode === false ? 'live' : 'test'
  const apiKey = (mode === 'live' ? secrets.envia_api_key_live : secrets.envia_api_key_test)?.trim()

  const missing: string[] = []
  if (!apiKey) missing.push(`llave de Envia (${mode === 'live' ? 'producción' : 'prueba'})`)
  for (const [key, label] of [
    ['origin_street', 'calle'], ['origin_number', 'número'], ['origin_zip', 'código postal'],
    ['origin_city', 'ciudad'], ['origin_state', 'estado'], ['origin_phone', 'teléfono'],
  ] as const) if (!String(settings[key] ?? '').trim()) missing.push(`${label} de origen`)

  const origin: EnviaAddress | null = missing.some(m => m.includes('origen')) ? null : {
    name: String(settings.origin_name || 'GALLO'),
    company: 'GALLO',
    email: String(settings.origin_email ?? ''),
    phone: String(settings.origin_phone),
    street: String(settings.origin_street),
    number: String(settings.origin_number),
    district: String(settings.origin_colonia ?? ''),
    city: String(settings.origin_city),
    state: String(settings.origin_state),
    postalCode: String(settings.origin_zip),
  }

  const carriers = ((settings.envia_carriers as string[] | null) ?? []).map(c => c.toLowerCase().trim()).filter(Boolean)
  if (carriers.length === 0) missing.push('al menos una paquetería')

  return {
    enabled: settings.envia_enabled === true,
    auth: apiKey ? { apiKey, mode } : null,
    carriers,
    markupPct: Number(settings.envia_markup_pct ?? 0),
    freeThresholdMxn: Number(settings.shipping_free_threshold_mxn ?? 0),
    flatMxn: Number(settings.shipping_national_mxn ?? 0),
    origin,
    missing,
  }
}

const ready = (c: ShippingConfig) => c.enabled && !!c.auth && !!c.origin && c.missing.length === 0

// ── Paquete ──────────────────────────────────────────────────────────────────
export type ParcelItem = { productId: string; qty: number }

const DEFAULT_BOX = { length_cm: 30, width_cm: 20, height_cm: 15 }
const DEFAULT_ITEM_GRAMS = 500

// Una sola caja: la más grande de las que usan los productos del pedido, con
// el peso de todo lo que va adentro. Si un producto no tiene peso, cuenta el
// peso de su embalaje (o 500 g).
export async function parcelsForItems(items: ParcelItem[]): Promise<{ parcels: EnviaParcel[]; subtotal: number }> {
  const ids = [...new Set(items.map(i => i.productId))]
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, price_mxn, is_published, weight_grams, packaging_types(weight_grams, length_cm, width_cm, height_cm)')
    .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

  type Row = { id: string; price_mxn: number; weight_grams: number | null; packaging_types: { weight_grams: number; length_cm: number; width_cm: number; height_cm: number } | null }
  const byId = new Map(((data ?? []) as unknown as Row[]).map(p => [p.id, p]))

  let grams = 0
  let subtotal = 0
  let box = DEFAULT_BOX
  let boxVolume = 0
  for (const item of items) {
    const p = byId.get(item.productId)
    if (!p) continue
    const qty = Math.max(1, Math.round(item.qty))
    subtotal += p.price_mxn * qty
    const pkg = p.packaging_types
    grams += (p.weight_grams ?? pkg?.weight_grams ?? DEFAULT_ITEM_GRAMS) * qty
    if (pkg) {
      const v = Number(pkg.length_cm) * Number(pkg.width_cm) * Number(pkg.height_cm)
      if (v > boxVolume) { boxVolume = v; box = { length_cm: Number(pkg.length_cm), width_cm: Number(pkg.width_cm), height_cm: Number(pkg.height_cm) } }
    }
  }

  return { parcels: [{ ...box, weight_kg: Math.max(0.1, grams / 1000) }], subtotal }
}

// ── Firma de cotizaciones ────────────────────────────────────────────────────
const QUOTE_TTL_MS = 2 * 60 * 60 * 1000

function quoteSecret() {
  const s = process.env.SHIPPING_QUOTE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('falta el secreto para firmar cotizaciones de envío')
  return s
}

function cartKey(items: ParcelItem[]) {
  return items.map(i => `${i.productId}x${Math.max(1, Math.round(i.qty))}`).sort().join(',')
}

function sign(id: string, priceMxn: number, zip: string, items: ParcelItem[], exp: number) {
  return createHmac('sha256', quoteSecret()).update(`${id}|${priceMxn}|${zip.trim()}|${cartKey(items)}|${exp}`).digest('hex')
}

export type ShippingOption = {
  id: string            // "dhl:express" o "flat"
  carrier_name: string
  service_name: string
  days: number | null
  price_mxn: number     // centavos, lo que se cobra
  free: boolean
  token: string         // "exp.firma"
}

export type ShippingQuote = Pick<ShippingOption, 'id' | 'price_mxn' | 'token'>

function signed(o: Omit<ShippingOption, 'token'>, zip: string, items: ParcelItem[]): ShippingOption {
  const exp = Date.now() + QUOTE_TTL_MS
  return { ...o, token: `${exp}.${sign(o.id, o.price_mxn, zip, items, exp)}` }
}

export type VerifiedShipping = { id: string; priceMxn: number }

// allowExpired: al registrar un pedido YA cobrado la firma se sigue exigiendo
// (precio, CP y carrito), pero la caducidad no: el cargo ya se validó contra
// el total y rechazarlo ahí dejaría a alguien cobrado y sin pedido.
export function verifyShippingQuote(quote: ShippingQuote | null | undefined, zip: string, items: ParcelItem[], opts?: { allowExpired?: boolean }): VerifiedShipping | { error: string } {
  if (!quote?.token || typeof quote.id !== 'string') return { error: 'falta elegir el envío' }
  const [expStr, sig] = quote.token.split('.')
  const exp = Number(expStr)
  if (!exp || !sig) return { error: 'falta elegir el envío' }
  if (!opts?.allowExpired && Date.now() > exp) return { error: 'la cotización de envío caducó. vuelve a poner tu código postal' }
  const price = Math.round(Number(quote.price_mxn))
  const expected = Buffer.from(sign(quote.id, price, zip, items, exp), 'hex')
  const given = Buffer.from(sig, 'hex')
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { error: 'el envío no coincide con tu carrito o tu código postal. vuelve a cotizar' }
  }
  return { id: quote.id, priceMxn: price }
}

// ── Opciones del checkout ────────────────────────────────────────────────────
export async function getCheckoutShippingOptions(dest: {
  zip: string; state: string; city: string; colonia: string
}, items: ParcelItem[]): Promise<{ options: ShippingOption[]; source: 'envia' | 'flat'; free: boolean }> {
  const [config, { parcels, subtotal }] = await Promise.all([getShippingConfig(), parcelsForItems(items)])
  const free = config.freeThresholdMxn > 0 && subtotal >= config.freeThresholdMxn

  const flat = () => ({
    options: [signed({
      id: 'flat', carrier_name: 'envío estándar', service_name: '', days: null,
      price_mxn: free ? 0 : config.flatMxn, free,
    }, dest.zip, items)],
    source: 'flat' as const,
    free,
  })

  if (!ready(config) || !/^\d{5}$/.test(dest.zip.trim())) return flat()

  let rates: ShippingRate[]
  try {
    rates = await getEnviaRates({
      auth: config.auth!,
      origin: config.origin!,
      // Al cotizar aún no hay calle: Envia cotiza por CP, colonia y ciudad.
      destination: {
        name: 'Cliente', phone: config.origin!.phone, street: 'Domicilio', number: 'S/N',
        district: dest.colonia, city: dest.city, state: dest.state, postalCode: dest.zip,
      },
      parcels,
      carriers: config.carriers,
    })
  } catch (e) {
    console.error('[envíos] Envia no cotizó, se usa la tarifa fija:', e)
    return flat()
  }
  // Fuera los servicios "a ocurre": el paquete se queda en una sucursal y el
  // cliente tiene que ir por él (DHL "Domicilio - Ocurre", servicio *_do).
  // Suelen ser los más baratos, así que saldrían preseleccionados y nadie
  // leería la letra chica. En el panel sí se pueden elegir.
  rates = rates.filter(r => !/_do$/i.test(r.service) && !/domicilio\s*-\s*ocurre/i.test(r.service_name))
  if (rates.length === 0) return flat()

  // Precio al cliente: costo + recargo, redondeado hacia arriba a pesos enteros.
  const priced = rates.map(r => ({
    id: r.rate_id,
    carrier_name: r.carrier_name,
    service_name: r.service_name,
    days: r.days,
    price_mxn: Math.ceil(r.total_mxn * (1 + config.markupPct / 100)) * 100,
    free: false,
  }))

  // Con envío gratis solo se ofrece la opción más barata, en $0.
  const options = free ? [{ ...priced[0], price_mxn: 0, free: true }] : priced
  return { options: options.map(o => signed(o, dest.zip, items)), source: 'envia', free }
}

// ── Panel: guías ─────────────────────────────────────────────────────────────
type OrderForShipping = {
  id: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  shipping_address: Record<string, string> | null
  shipping_rate_id: string | null
  tracking_number: string | null
  shipping_carrier: string | null
  shipping_provider: string | null
  order_items: { product_id: string | null; quantity: number }[]
}

async function loadOrder(orderId: string): Promise<OrderForShipping> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, customer_name, customer_email, customer_phone, shipping_address, shipping_rate_id, tracking_number, shipping_carrier, shipping_provider, order_items(product_id, quantity)')
    .eq('id', orderId)
    .single()
  if (!data) throw new Error('orden no encontrada')
  return data as unknown as OrderForShipping
}

export function destinationFromOrder(order: Pick<OrderForShipping, 'customer_name' | 'customer_email' | 'customer_phone' | 'shipping_address'>): EnviaAddress {
  const a = order.shipping_address ?? {}
  const fromOne = splitStreet(a.street ?? '')
  const number = (a.number ?? '').trim()
  return {
    name: order.customer_name?.trim() || 'Cliente',
    email: order.customer_email ?? '',
    phone: order.customer_phone ?? '',
    street: number ? (a.street ?? '').trim() : fromOne.street,
    number: number || fromOne.number,
    district: a.colonia ?? '',
    city: a.city ?? '',
    state: a.state ?? '',
    postalCode: a.zip ?? '',
    reference: a.reference ?? '',
  }
}

function orderParcelItems(order: OrderForShipping): ParcelItem[] {
  return order.order_items.filter(i => i.product_id).map(i => ({ productId: i.product_id!, qty: i.quantity }))
}

export type ReadinessItem = { label: string; ok: boolean; detail?: string }

export async function shipmentReadiness(orderId: string): Promise<{ ready: boolean; items: ReadinessItem[] }> {
  const [config, order] = await Promise.all([getShippingConfig(), loadOrder(orderId)])
  const a = order.shipping_address ?? {}
  const dest = destinationFromOrder(order)
  const items: ReadinessItem[] = [
    { label: 'Envia activado', ok: config.enabled, detail: config.enabled ? undefined : 'actívalo en configuración' },
    { label: `llave de ${config.auth?.mode === 'live' ? 'producción' : 'prueba'}`, ok: !!config.auth },
    { label: 'origen completo', ok: !!config.origin, detail: config.missing.filter(m => m.includes('origen')).join(', ') || undefined },
    { label: 'dirección del cliente', ok: !!(a.zip && a.city && a.state && a.street), detail: ['zip', 'city', 'state', 'street'].filter(k => !a[k]).join(', ') || undefined },
    { label: 'número exterior', ok: dest.number !== 'S/N', detail: dest.number === 'S/N' ? 'no se encontró en la calle; edítalo en los datos de envío' : dest.number },
    { label: 'teléfono del cliente', ok: !!order.customer_phone, detail: order.customer_phone ? undefined : 'las paqueterías lo piden' },
  ]
  return { ready: items.every(i => i.ok || i.label === 'número exterior'), items }
}

/** Costo real (sin recargo) de mandar este pedido, por paquetería. */
export async function ratesForOrder(orderId: string): Promise<ShippingRate[]> {
  const [config, order] = await Promise.all([getShippingConfig(), loadOrder(orderId)])
  if (!ready(config)) throw new Error(`Envia no está listo: ${config.missing.join(', ') || 'actívalo en configuración'}`)
  const { parcels } = await parcelsForItems(orderParcelItems(order))
  return getEnviaRates({ auth: config.auth!, origin: config.origin!, destination: destinationFromOrder(order), parcels, carriers: config.carriers })
}

type ShipmentEvent = { type: 'created' | 'cancelled'; at: string; provider: 'envia'; mode: string; tracking?: string; carrier?: string; service?: string; cost_mxn?: number; label_url?: string; note?: string }

async function pushEvent(orderId: string, event: ShipmentEvent) {
  const { data } = await supabaseAdmin.from('orders').select('shipment_events').eq('id', orderId).single()
  const events = ((data?.shipment_events as ShipmentEvent[] | null) ?? []).concat(event)
  await supabaseAdmin.from('orders').update({ shipment_events: events }).eq('id', orderId)
}

async function saveBalance(balance: number | null) {
  if (balance == null) return
  await supabaseAdmin.from('store_settings')
    .update({ envia_last_balance: balance, envia_last_balance_at: new Date().toISOString() }).eq('id', 1)
}

export type BoughtLabel = { trackingNumber: string; labelUrl: string | null; carrier: string; service: string; costMxn: number | null; mode: string }

/**
 * Compra la guía. Sin rateId usa la paquetería que eligió el cliente; si eligió
 * la tarifa fija, la opción más barata.
 */
export async function buyLabel(orderId: string, rateId?: string): Promise<BoughtLabel> {
  const [config, order] = await Promise.all([getShippingConfig(), loadOrder(orderId)])
  if (!ready(config)) throw new Error(`Envia no está listo: ${config.missing.join(', ') || 'actívalo en configuración'}`)
  if (order.tracking_number) throw new Error('esta orden ya tiene guía')

  const destination = destinationFromOrder(order)
  const { parcels } = await parcelsForItems(orderParcelItems(order))

  let chosen = rateId ?? order.shipping_rate_id ?? ''
  if (!chosen.includes(':')) {
    const rates = await getEnviaRates({ auth: config.auth!, origin: config.origin!, destination, parcels, carriers: config.carriers })
    if (!rates.length) throw new Error('Envia no devolvió tarifas para esta dirección')
    chosen = rates[0].rate_id
  }
  const [carrier, ...rest] = chosen.split(':')
  const service = rest.join(':')

  const result = await createEnviaShipment({ auth: config.auth!, carrier, service, origin: config.origin!, destination, parcels })
  const costMxn = result.cost != null ? Math.round(result.cost * 100) : null

  await supabaseAdmin.from('orders').update({
    tracking_number: result.trackingNumber,
    label_url: result.labelUrl,
    shipping_carrier: result.carrier.toUpperCase(),
    shipping_service: service,
    shipping_provider: 'envia',
    shipment_cost_mxn: costMxn,
    status: 'shipped',
    updated_at: new Date().toISOString(),
  }).eq('id', orderId)
  await pushEvent(orderId, {
    type: 'created', at: new Date().toISOString(), provider: 'envia', mode: config.auth!.mode,
    tracking: result.trackingNumber, carrier: result.carrier, service, cost_mxn: costMxn ?? undefined, label_url: result.labelUrl ?? undefined,
  })
  await saveBalance(result.currentBalance)

  return { trackingNumber: result.trackingNumber, labelUrl: result.labelUrl, carrier: result.carrier, service, costMxn, mode: config.auth!.mode }
}

/** Cancela la guía en Envia (regresa el saldo) y deja la orden lista para otra. */
export async function cancelLabel(orderId: string, reason: string): Promise<{ balanceReturned: boolean; warning?: string }> {
  const [config, order] = await Promise.all([getShippingConfig(), loadOrder(orderId)])
  if (!order.tracking_number) throw new Error('esta orden no tiene guía')

  let balanceReturned = false
  let warning: string | undefined
  if (order.shipping_provider === 'envia' && config.auth && order.shipping_carrier) {
    try {
      const r = await cancelEnviaShipment({ auth: config.auth, carrier: order.shipping_carrier.toLowerCase(), trackingNumber: order.tracking_number })
      balanceReturned = r.balanceReturned
      await saveBalance(r.currentBalance)
    } catch (e) {
      warning = e instanceof Error ? e.message : 'Envia no confirmó la cancelación'
    }
  } else {
    warning = 'la guía no se compró con Envia: cancélala directo con la paquetería'
  }

  await pushEvent(orderId, { type: 'cancelled', at: new Date().toISOString(), provider: 'envia', mode: config.auth?.mode ?? 'test', tracking: order.tracking_number, note: [reason, warning].filter(Boolean).join(' — ') || undefined })
  await supabaseAdmin.from('orders').update({
    tracking_number: null, label_url: null, shipment_cost_mxn: null, shipping_service: null,
    status: 'paid', updated_at: new Date().toISOString(),
  }).eq('id', orderId)

  return { balanceReturned, warning }
}

/** Rastreo en vivo de una guía de Envia. null si no aplica o si Envia no respondió. */
export async function trackOrder(order: { tracking_number: string | null; shipping_carrier: string | null; shipping_provider: string | null }): Promise<EnviaTrackResult> {
  if (!order.tracking_number || !order.shipping_carrier || order.shipping_provider !== 'envia') return null
  const config = await getShippingConfig()
  if (!config.auth) return null
  return trackEnviaShipment({ auth: config.auth, carrier: order.shipping_carrier.toLowerCase(), trackingNumber: order.tracking_number })
}

export async function lastKnownBalance(): Promise<{ balance: number | null; at: string | null; mode: string }> {
  const [{ data }, config] = await Promise.all([
    supabaseAdmin.from('store_settings').select('envia_last_balance, envia_last_balance_at').eq('id', 1).single(),
    getShippingConfig(),
  ])
  return { balance: data?.envia_last_balance != null ? Number(data.envia_last_balance) : null, at: data?.envia_last_balance_at ?? null, mode: config.auth?.mode ?? (config.enabled ? 'test' : 'off') }
}

/**
 * Cotización para capturar una orden a mano desde el panel: mismas reglas que
 * el checkout (paquete armado con los productos, recargo), pero regresa las
 * tarifas tal cual para que el admin elija. `total_mxn` ya trae el recargo.
 */
export async function quoteForAdmin(dest: { zip: string; state: string; city: string; colonia: string }, items: ParcelItem[]): Promise<ShippingRate[]> {
  const [config, { parcels }] = await Promise.all([getShippingConfig(), parcelsForItems(items)])
  if (!ready(config)) throw new Error(`Envia no está listo: ${config.missing.join(', ') || 'actívalo en configuración'}`)
  if (!/^\d{5}$/.test(dest.zip.trim())) throw new Error('agrega un código postal de 5 dígitos')
  const rates = await getEnviaRates({
    auth: config.auth!,
    origin: config.origin!,
    destination: { name: 'Cliente', phone: config.origin!.phone, street: 'Domicilio', number: 'S/N', district: dest.colonia, city: dest.city, state: dest.state, postalCode: dest.zip },
    parcels,
    carriers: config.carriers,
  })
  return rates.map(r => ({ ...r, total_mxn: Math.ceil(r.total_mxn * (1 + config.markupPct / 100)) }))
}

/** Para el botón "probar cotización" de configuración: un embalaje a un CP. */
export async function testQuote(dest: { zip: string; state: string; city: string; colonia: string }, parcel: EnviaParcel): Promise<ShippingRate[]> {
  const config = await getShippingConfig()
  if (!config.auth) throw new Error(config.missing[0] ?? 'falta la llave de Envia')
  if (!config.origin) throw new Error(`completa el origen: ${config.missing.filter(m => m.includes('origen')).join(', ')}`)
  if (config.carriers.length === 0) throw new Error('elige al menos una paquetería')
  return getEnviaRates({
    auth: config.auth,
    origin: config.origin,
    destination: { name: 'Prueba', phone: config.origin.phone, street: 'Domicilio', number: 'S/N', district: dest.colonia, city: dest.city, state: dest.state, postalCode: dest.zip },
    parcels: [parcel],
    carriers: config.carriers,
  })
}
