import { supabaseAdmin } from '@/lib/supabase.server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cp = searchParams.get('cp')?.trim()
  if (!cp || !/^\d{5}$/.test(cp)) {
    return Response.json({ error: 'CP inválido' }, { status: 400 })
  }

  // 1. Revisar caché en Supabase
  const { data: cached } = await supabaseAdmin
    .from('postal_codes')
    .select('estado, municipio, colonias')
    .eq('cp', cp)
    .single()

  if (cached) {
    return Response.json(toResponse(cached.estado, cached.municipio, cached.colonias as string[]))
  }

  // 2. Cache miss — Nominatim (gratis, sin token, sin límite)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=MX&format=json&addressdetails=1&limit=1`,
      { headers: { 'User-Agent': 'compadregallo.com/1.0 (contacto@compadregallo.com)' } },
    )
    if (!res.ok) throw new Error(`nominatim ${res.status}`)

    const json = await res.json()
    if (!json.length) return Response.json({ error: 'CP no encontrado' }, { status: 404 })

    const addr = json[0].address
    const estado: string = addr.state ?? ''
    const municipio: string = (addr.county ?? addr.state_district ?? addr.city ?? '')
      .replace(/^(Municipio de |Municipalidad de )/i, '')

    if (!estado || !municipio) {
      return Response.json({ error: 'No se encontró estado/municipio para ese CP' }, { status: 404 })
    }

    // 3. Guardar en caché (colonias vacío = usar municipio como fallback)
    await supabaseAdmin.from('postal_codes').upsert({ cp, estado, municipio, colonias: [] })

    return Response.json(toResponse(estado, municipio, []))
  } catch (e) {
    console.error('[sepomex]', e)
    return Response.json({ error: 'Error consultando datos postales' }, { status: 502 })
  }
}

function toResponse(estado: string, municipio: string, colonias: string[]) {
  return {
    estado,
    municipio,
    colonias: colonias.length
      ? colonias.map(c => ({ colonia: c, municipio, estado }))
      : [{ colonia: municipio, municipio, estado }],
  }
}
