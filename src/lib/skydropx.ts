// Cliente SkyDropX — solo para uso en servidor

export type ShippingRate = {
  rate_id: string
  carrier: string
  service_level: string
  total_mxn: number
  days: number | null
}

const BASE = 'https://api-pro.skydropx.com'

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })
  const res = await fetch(`${BASE}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: params.toString(),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SkyDropX OAuth ${res.status}: ${text.slice(0, 300)}`)
  }
  const json = await res.json()
  if (!json.access_token) throw new Error('SkyDropX: no se recibió access_token')
  return json.access_token as string
}

export async function getShippingRates({
  clientId,
  clientSecret,
  originZip,
  originState,
  originCity,
  originColonia,
  destZip,
  destState,
  destCity,
  destColonia,
  parcel,
}: {
  clientId: string
  clientSecret: string
  originZip: string
  originState: string
  originCity: string
  originColonia: string
  destZip: string
  destState: string
  destCity: string
  destColonia: string
  parcel: { weight_kg: number; length_cm: number; width_cm: number; height_cm: number }
}): Promise<ShippingRate[]> {
  const token = await getAccessToken(
    clientId.replace(/\s+/g, ''),
    clientSecret.replace(/\s+/g, ''),
  )

  const body = {
    quotation: {
      address_from: {
        country_code: 'MX',
        postal_code: originZip.trim(),
        area_level1: originState.trim(),
        area_level2: originCity.trim(),
        area_level3: originColonia.trim(),
      },
      address_to: {
        country_code: 'MX',
        postal_code: destZip.trim(),
        area_level1: destState.trim(),
        area_level2: destCity.trim(),
        area_level3: destColonia.trim(),
      },
      parcels: [{
        weight: Math.max(0.01, parcel.weight_kg),
        length: Math.max(1, Math.round(parcel.length_cm)),
        width: Math.max(1, Math.round(parcel.width_cm)),
        height: Math.max(1, Math.round(parcel.height_cm)),
      }],
    },
  }

  // 1. Crear cotización
  const createRes = await fetch(`${BASE}/api/v1/quotations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => '')
    throw new Error(`SkyDropX ${createRes.status}: ${text}`)
  }

  const created = await createRes.json()

  // Si la respuesta ya viene completa, úsala directo
  if (created?.is_completed && Array.isArray(created?.rates)) {
    return mapRates(created.rates)
  }

  const quotationId = created?.data?.id ?? created?.id
  if (!quotationId) throw new Error(`SkyDropX: sin ID de cotización`)

  // 2. Esperar a que la cotización esté completa (máx 8 intentos × 1.5s)
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 1500))
    const pollRes = await fetch(`${BASE}/api/v1/quotations/${quotationId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!pollRes.ok) break
    const pollJson = await pollRes.json()
    const data = pollJson?.data ?? pollJson
    const attrs = data?.attributes ?? data
    const isCompleted = attrs?.is_completed ?? false
    const rawRates: Record<string, unknown>[] = attrs?.rates ?? data?.rates ?? []
    if (isCompleted || rawRates.length > 0) {
      return mapRates(rawRates)
    }
  }

  return []
}

function mapRates(rates: Record<string, unknown>[]): ShippingRate[] {
  return rates
    .filter(r => r.success !== false)
    .map(r => ({
      rate_id: String(r.id ?? ''),
      carrier: String(r.provider_display_name ?? r.provider_name ?? r.carrier ?? ''),
      service_level: String(r.provider_service_name ?? r.service_level ?? ''),
      total_mxn: parseFloat(String(r.total ?? r.amount ?? 0)),
      days: r.days != null ? Number(r.days) : null,
    }))
    .sort((a, b) => a.total_mxn - b.total_mxn)
}
