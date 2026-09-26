// Cliente Envia.com — solo para uso en servidor.
//
// Portado de gangstafairy (src/lib/envia.ts), con lo que allá se aprendió en
// vivo. Diferencias a la medida de aquí: la llave y el modo (prueba o
// producción) no vienen de variables de entorno sino de store_secrets /
// store_settings, igual que Stripe, y se pasan en cada llamada.
//
// Lo que hay que saber de Envia (confirmado en vivo en gangstafairy):
//  - Token estático (Developer → API Keys), sin OAuth ni polling: cotizar y
//    comprar guía son síncronos.
//  - Regresa HTTP 200 aun cuando el body es un error ({meta:'error'}): nunca
//    confiar solo en res.ok.
//  - Cotiza UNA paquetería por request (`shipment.carrier` es obligatorio).
//  - Quiere el estado en código corto ("PU"), no "Puebla".
//  - Quiere el número exterior aparte de la calle.
//  - /ship/generate/ exige printFormat y printSize.
//  - /ship/generaltrack/ pide `trackingNumbers` (arreglo) y los eventos vienen
//    en `eventHistory`.
//  - No tiene endpoint de saldo: el saldo solo aparece en las respuestas de
//    generate y cancel.

import 'server-only'

export type EnviaMode = 'test' | 'live'
export type EnviaAuth = { apiKey: string; mode: EnviaMode }

const baseFor = (mode: EnviaMode) => (mode === 'live' ? 'https://api.envia.com' : 'https://api-test.envia.com')

export type ShippingRate = {
  rate_id: string       // "carrier:service" — Envia no da un id opaco
  carrier: string       // código para la API: "dhl", "fedex"
  carrier_name: string  // para mostrar: "DHL"
  service: string       // código: "express"
  service_name: string  // para mostrar: "DHL Express"
  total_mxn: number     // pesos, con decimales, tal como cobra Envia
  days: number | null
}

export type EnviaAddress = {
  name: string
  company?: string
  email?: string
  phone: string
  street: string
  number: string
  district?: string
  city: string
  state: string   // código corto: usa toEnviaStateCode()
  country?: string
  postalCode: string
  reference?: string
}

export type EnviaParcel = {
  weight_kg: number
  length_cm: number
  width_cm: number
  height_cm: number
  content?: string
  declaredValue?: number
}

// Solo "PU" y "JA" están confirmados con cotizaciones reales (en
// gangstafairy); el resto son las abreviaturas usuales de 2 letras.
const STATE_CODES: Record<string, string> = {
  'Aguascalientes': 'AG', 'Baja California': 'BC', 'Baja California Sur': 'BS',
  'Campeche': 'CM', 'Chiapas': 'CS', 'Chihuahua': 'CH',
  'Ciudad de México': 'CX', 'Distrito Federal': 'CX', 'CDMX': 'CX',
  'Coahuila': 'CO', 'Coahuila de Zaragoza': 'CO', 'Colima': 'CL',
  'Durango': 'DG', 'Guanajuato': 'GT', 'Guerrero': 'GR', 'Hidalgo': 'HG',
  'Jalisco': 'JA', 'México': 'EM', 'Estado de México': 'EM',
  'Michoacán': 'MI', 'Michoacán de Ocampo': 'MI', 'Morelos': 'MO',
  'Nayarit': 'NA', 'Nuevo León': 'NL', 'Oaxaca': 'OA', 'Puebla': 'PU',
  'Querétaro': 'QE', 'Quintana Roo': 'QR', 'San Luis Potosí': 'SL',
  'Sinaloa': 'SI', 'Sonora': 'SO', 'Tabasco': 'TB', 'Tamaulipas': 'TM',
  'Tlaxcala': 'TL', 'Veracruz': 'VE', 'Veracruz de Ignacio de la Llave': 'VE',
  'Yucatán': 'YU', 'Zacatecas': 'ZA',
}

export function toEnviaStateCode(nombre: string): string {
  const n = nombre.trim()
  if (/^[A-Z]{2}$/.test(n)) return n
  return STATE_CODES[n] ?? n.slice(0, 2).toUpperCase()
}

// "Calle Ejemplo 123" → { street: "Calle Ejemplo", number: "123" }, para
// direcciones que se capturaron en un solo campo.
export function splitStreet(calle: string): { street: string; number: string } {
  const m = calle.trim().match(/^(.*?)[\s,#]+(?:no\.?\s*)?(\d+[a-zA-Z]?(?:[-\s]?(?:int\.?|interior)?\s*\w+)?)\s*$/i)
  if (m && m[1].trim()) return { street: m[1].trim(), number: m[2].trim() }
  return { street: calle.trim() || 'S/N', number: 'S/N' }
}

function buildAddress(a: EnviaAddress) {
  return {
    name: a.name.slice(0, 60),
    company: a.company ?? '',
    email: a.email ?? '',
    phone: a.phone.replace(/\D/g, '').slice(-10),
    street: a.street,
    number: a.number || 'S/N',
    district: a.district ?? '',
    city: a.city,
    state: toEnviaStateCode(a.state),
    country: a.country ?? 'MX',
    postalCode: a.postalCode.trim(),
    reference: a.reference ?? '',
  }
}

function buildPackages(parcels: EnviaParcel[]) {
  return parcels.map(p => ({
    type: 'box',
    content: p.content ?? 'Artículos de decoración',
    amount: 1,
    declaredValue: p.declaredValue ?? 0,
    weightUnit: 'KG',
    weight: Math.max(0.1, Math.round(p.weight_kg * 100) / 100),
    lengthUnit: 'CM',
    dimensions: {
      length: Math.max(1, Math.round(p.length_cm)),
      width: Math.max(1, Math.round(p.width_cm)),
      height: Math.max(1, Math.round(p.height_cm)),
    },
  }))
}

async function call(auth: EnviaAuth, path: string, body: unknown, label: string) {
  const res = await fetch(`${baseFor(auth.mode)}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.meta === 'error') {
    const msg = json?.error?.message ?? json?.error?.description ?? JSON.stringify(json)?.slice(0, 300) ?? `HTTP ${res.status}`
    throw new Error(`Envia ${label}: ${msg}`)
  }
  return json
}

// ── Cotizar ──────────────────────────────────────────────────────────────────
export async function getEnviaRates({ auth, origin, destination, parcels, carriers }: {
  auth: EnviaAuth
  origin: EnviaAddress
  destination: EnviaAddress
  parcels: EnviaParcel[]
  carriers: string[]
}): Promise<ShippingRate[]> {
  const base = {
    origin: buildAddress(origin),
    destination: buildAddress(destination),
    packages: buildPackages(parcels),
    settings: { currency: 'MXN' },
  }

  const results = await Promise.allSettled(carriers.map(async carrier => {
    const json = await call(auth, '/ship/rate/', { ...base, shipment: { type: 1, import: 0, carrier } }, `cotizar (${carrier})`)
    const raw: Record<string, unknown>[] = Array.isArray(json?.data) ? json.data : []
    return raw.map(r => {
      const delivery = r.deliveryDate as Record<string, unknown> | undefined
      return {
        rate_id: `${r.carrier}:${r.service}`,
        carrier: String(r.carrier ?? carrier),
        carrier_name: String(r.carrierDescription ?? r.carrier ?? carrier).toUpperCase(),
        service: String(r.service ?? ''),
        service_name: String(r.serviceDescription ?? r.service ?? ''),
        total_mxn: Number(r.totalPrice ?? 0),
        days: delivery && typeof delivery === 'object' ? Number(delivery.dateDifference ?? NaN) || null : null,
      }
    })
  }))

  const rates = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
  if (rates.length === 0) {
    const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
    if (firstError) throw firstError.reason
  }
  return rates.filter(r => r.total_mxn > 0).sort((a, b) => a.total_mxn - b.total_mxn)
}

// ── Comprar guía ─────────────────────────────────────────────────────────────
export type EnviaShipmentResult = {
  trackingNumber: string
  labelUrl: string | null
  trackUrl: string | null
  carrier: string
  cost: number | null
  currentBalance: number | null
}

export async function createEnviaShipment({ auth, carrier, service, origin, destination, parcels }: {
  auth: EnviaAuth
  carrier: string
  service: string
  origin: EnviaAddress
  destination: EnviaAddress
  parcels: EnviaParcel[]
}): Promise<EnviaShipmentResult> {
  const json = await call(auth, '/ship/generate/', {
    origin: buildAddress(origin),
    destination: buildAddress(destination),
    packages: buildPackages(parcels),
    settings: { currency: 'MXN', printFormat: 'PDF', printSize: 'PAPER_4X6' },
    shipment: { type: 1, import: 0, carrier, service },
  }, 'comprar guía')

  const data = Array.isArray(json?.data) ? json.data[0] : json?.data
  if (!data?.trackingNumber) throw new Error('Envia: no se recibió número de guía')
  return {
    trackingNumber: String(data.trackingNumber),
    labelUrl: data.label ?? data.labelUrl ?? null,
    trackUrl: data.trackUrl ?? null,
    carrier: String(data.carrier ?? carrier),
    cost: data.totalPrice != null ? Number(data.totalPrice) : null,
    currentBalance: data.currentBalance != null ? Number(data.currentBalance) : null,
  }
}

// ── Cancelar guía ────────────────────────────────────────────────────────────
// Solo funciona si la paquetería todavía no la escaneó. Envia regresa el saldo.
export type EnviaCancelResult = { balanceReturned: boolean; balanceReturnDate: string | null; currentBalance: number | null }

export async function cancelEnviaShipment({ auth, carrier, trackingNumber }: {
  auth: EnviaAuth
  carrier: string
  trackingNumber: string
}): Promise<EnviaCancelResult> {
  const json = await call(auth, '/ship/cancel/', { carrier, trackingNumber }, 'cancelar guía')
  const data = json?.data ?? json
  return {
    balanceReturned: Boolean(data?.balanceReturned),
    balanceReturnDate: data?.balanceReturnDate ?? null,
    currentBalance: data?.currentBalance != null ? Number(data.currentBalance) : null,
  }
}

// ── Rastrear ─────────────────────────────────────────────────────────────────
// Best effort: si Envia cambia la forma de la respuesta, regresa null en vez
// de tronar. No es crítico para ningún flujo.
export type EnviaTrackEvent = { date: string; status: string; description: string }
export type EnviaTrackResult = { status: string; events: EnviaTrackEvent[] } | null

export async function trackEnviaShipment({ auth, carrier, trackingNumber }: {
  auth: EnviaAuth
  carrier: string
  trackingNumber: string
}): Promise<EnviaTrackResult> {
  try {
    const json = await call(auth, '/ship/generaltrack/', { carrier, trackingNumbers: [trackingNumber] }, 'rastrear')
    const data = Array.isArray(json?.data) ? json.data[0] : json?.data
    if (!data) return null
    const events: EnviaTrackEvent[] = Array.isArray(data.eventHistory)
      ? data.eventHistory.map((e: Record<string, unknown>) => ({
          date: String(e.date ?? ''),
          status: String(e.event ?? e.description ?? ''),
          description: e.location ? `${e.description} — ${e.location}` : String(e.description ?? ''),
        }))
      : []
    return { status: String(data.status ?? ''), events }
  } catch {
    return null
  }
}
