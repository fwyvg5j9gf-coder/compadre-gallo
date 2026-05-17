// Cliente SkyDropX — solo para uso en servidor

export type ShippingRate = {
  rate_id: string
  quotation_id: string
  carrier: string
  service_level: string
  total_mxn: number
  days: number | null
}

const BASE = 'https://api-pro.skydropx.com/api/v1'

// Token cache — se reutiliza 110 min para no regenerar por request (API expira en 120)
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const cached = tokenCache.get(clientId)
  if (cached && Date.now() < cached.expiresAt) return cached.token

  const params = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
  const res = await fetch(`${BASE}/oauth/token`, {
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

  tokenCache.set(clientId, { token: json.access_token, expiresAt: Date.now() + 110 * 60 * 1000 })
  return json.access_token as string
}

function cleanId(s: string) { return s.replace(/\s+/g, '') }

export type PackageType = { id: string; name: string }

export async function getPackageTypes(clientId: string, clientSecret: string): Promise<PackageType[]> {
  const token = await getAccessToken(cleanId(clientId), cleanId(clientSecret))
  const res = await fetch(`${BASE}/package_types`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json = await res.json()
  const items: Record<string, unknown>[] = json?.data ?? json ?? []
  return items.map(i => ({
    id: String(i.id ?? (i as Record<string, unknown>).type ?? ''),
    name: String(
      ((i as Record<string, unknown>).attributes as Record<string, unknown>)?.name ??
      (i as Record<string, unknown>).name ??
      i.id ?? ''
    ),
  })).filter(i => i.id)
}

export async function getShippingRates({
  clientId, clientSecret,
  originZip, originState, originCity, originColonia,
  destZip, destState, destCity, destColonia,
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
  parcel: { weight_kg: number; length_cm: number; width_cm: number; height_cm: number; packageType?: string; consignmentNote?: string }
}): Promise<ShippingRate[]> {
  const token = await getAccessToken(cleanId(clientId), cleanId(clientSecret))

  const parcelObj: Record<string, unknown> = {
    weight: Math.max(0.01, parcel.weight_kg),
    length: Math.max(1, Math.round(parcel.length_cm)),
    width: Math.max(1, Math.round(parcel.width_cm)),
    height: Math.max(1, Math.round(parcel.height_cm)),
  }
  if (parcel.packageType)    parcelObj.package_type    = parcel.packageType
  if (parcel.consignmentNote) parcelObj.consignment_note = parcel.consignmentNote

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
      parcels: [parcelObj],
    },
  }

  const createRes = await fetch(`${BASE}/quotations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => '')
    throw new Error(`SkyDropX quotation ${createRes.status}: ${text}`)
  }

  const created = await createRes.json()

  if (created?.is_completed && Array.isArray(created?.rates)) {
    const qid = String(created?.id ?? created?.data?.id ?? '')
    return mapRates(created.rates, qid)
  }

  const quotationId = String(created?.data?.id ?? created?.id ?? '')
  if (!quotationId) throw new Error(`SkyDropX: sin ID de cotización`)

  // Polling — máx 6 intentos × 1.5s = 9s
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 1500))
    const pollRes = await fetch(`${BASE}/quotations/${quotationId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!pollRes.ok) break
    const pollJson = await pollRes.json()
    const data = pollJson?.data ?? pollJson
    const attrs = data?.attributes ?? data
    const isCompleted = attrs?.is_completed ?? false
    const rawRates: Record<string, unknown>[] = attrs?.rates ?? data?.rates ?? []
    if (isCompleted || rawRates.length > 0) return mapRates(rawRates, quotationId)
  }

  return []
}

// ── Crear guía ────────────────────────────────────────────────────────────────

export type ShipmentResult = {
  shipmentId: string
  trackingNumber: string
  labelUrl: string | null
  carrier: string
}

type Address = {
  name: string
  email?: string
  phone?: string
  postalCode: string
  state: string
  city: string
  colonia: string
  street: string
  reference?: string
}

// ── Catálogos SAT (Carta Porte) ───────────────────────────────────────────────

export type SatCode = { id: string; name: string }

export async function getConsignmentNotePackagings(clientId: string, clientSecret: string): Promise<SatCode[]> {
  try {
    const token = await getAccessToken(cleanId(clientId), cleanId(clientSecret))
    const res = await fetch(`${BASE}/consignment_notes/packagings`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    const items: Record<string, unknown>[] = json?.data ?? json ?? []
    return items.map(i => {
      const attrs = (i.attributes ?? i) as Record<string, unknown>
      return { id: String(i.id ?? attrs.code ?? ''), name: String(attrs.name ?? attrs.description ?? i.id ?? '') }
    }).filter(i => i.id)
  } catch { return [] }
}

export async function getConsignmentNoteClasses(clientId: string, clientSecret: string): Promise<SatCode[]> {
  try {
    const token = await getAccessToken(cleanId(clientId), cleanId(clientSecret))
    const res = await fetch(`${BASE}/consignment_notes/classes`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    const items: Record<string, unknown>[] = json?.data ?? json ?? []
    return items.map(i => {
      const attrs = (i.attributes ?? i) as Record<string, unknown>
      return { id: String(i.id ?? attrs.code ?? ''), name: String(attrs.name ?? attrs.description ?? i.id ?? '') }
    }).filter(i => i.id)
  } catch { return [] }
}

export async function createShipment({
  clientId, clientSecret, rateId, quotationId, addressFrom, addressTo, parcel, packagingCode, classCode,
}: {
  clientId: string
  clientSecret: string
  rateId: string
  quotationId: string
  addressFrom: Address
  addressTo: Address
  parcel: { weight_kg: number; length_cm: number; width_cm: number; height_cm: number }
  packagingCode: string
  classCode: string
}): Promise<ShipmentResult> {
  const token = await getAccessToken(cleanId(clientId), cleanId(clientSecret))

  // Con quotation_id el peso/dimensiones ya están en la cotización.
  // Solo enviamos los campos de Carta Porte en los paquetes.
  const body = {
    shipment: {
      quotation_id: quotationId,
      rate_id: rateId,
      address_from: {
        name: addressFrom.name,
        email: addressFrom.email ?? '',
        phone: (addressFrom.phone ?? '').replace(/\D/g, ''),
        country_code: 'MX',
        postal_code: addressFrom.postalCode.trim(),
        area_level1: addressFrom.state.trim(),
        area_level2: addressFrom.city.trim(),
        area_level3: addressFrom.colonia.trim(),
        street1: addressFrom.street.trim(),
        reference: addressFrom.reference ?? addressFrom.name,
      },
      address_to: {
        name: addressTo.name,
        email: addressTo.email ?? '',
        phone: (addressTo.phone ?? '').replace(/\D/g, ''),
        country_code: 'MX',
        postal_code: addressTo.postalCode.trim(),
        area_level1: addressTo.state.trim(),
        area_level2: addressTo.city.trim(),
        area_level3: addressTo.colonia.trim(),
        street1: addressTo.street.trim(),
        reference: addressTo.reference ?? addressTo.name,
      },
      parcels: [{
        weight: Math.max(0.01, parcel.weight_kg),
        mass_unit: 'KG',
        dimension_unit: 'CM',
        length: Math.max(1, Math.round(parcel.length_cm)),
        width: Math.max(1, Math.round(parcel.width_cm)),
        height: Math.max(1, Math.round(parcel.height_cm)),
        quantity: 1,
      }],
    },
  }

  const bodyStr = JSON.stringify(body)

  const res = await fetch(`${BASE}/shipments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: bodyStr,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SkyDropX ${res.status}: ${text.slice(0, 400)}\nBODY: ${bodyStr.slice(0, 500)}`)
  }

  const json = await res.json()
  const data = json?.data ?? json
  const attrs = data?.attributes ?? data

  const trackingNumber = String(attrs?.tracking_number ?? attrs?.tracking ?? '')
  const labelUrl: string | null = attrs?.label_url ?? attrs?.label ?? null
  const shipmentId = String(data?.id ?? attrs?.id ?? '')
  const carrier = String(attrs?.carrier ?? attrs?.provider_display_name ?? '')

  if (!trackingNumber) throw new Error('Skydropx no devolvió número de guía')

  return { shipmentId, trackingNumber, labelUrl, carrier }
}

function mapRates(rates: Record<string, unknown>[], quotationId: string): ShippingRate[] {
  return rates
    .filter(r => r.success !== false)
    .map(r => ({
      rate_id: String(r.id ?? ''),
      quotation_id: quotationId,
      carrier: String(r.provider_display_name ?? r.provider_name ?? r.carrier ?? ''),
      service_level: String(r.provider_service_name ?? r.service_level ?? ''),
      total_mxn: parseFloat(String(r.total ?? r.amount ?? 0)),
      days: r.days != null ? Number(r.days) : null,
    }))
    .sort((a, b) => a.total_mxn - b.total_mxn)
}
