import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdminOrThrow } from '@/lib/auth.server'
import { getShippingRates } from '@/lib/skydropx'

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

    const [{ data: settings }, { data: secrets }] = await Promise.all([
      supabaseAdmin.from('store_settings').select('origin_zip, origin_state, origin_city, origin_colonia, skydropx_enabled').single(),
      supabaseAdmin.from('store_secrets').select('skydropx_client_id, skydropx_client_secret').single(),
    ])

    if (!settings?.skydropx_enabled) return NextResponse.json({ error: 'Skydropx no está habilitado' }, { status: 400 })
    if (!secrets?.skydropx_client_id || !secrets?.skydropx_client_secret) return NextResponse.json({ error: 'faltan credenciales de Skydropx' }, { status: 400 })
    if (!settings.origin_zip) return NextResponse.json({ error: 'falta código postal de origen en configuración' }, { status: 400 })
    if (!body.destZip) return NextResponse.json({ error: 'agrega el código postal de destino' }, { status: 400 })

    let parcel = { weight_kg: 0.5, length_cm: 30, width_cm: 20, height_cm: 10 }

    if (body.productIds.length > 0) {
      const { data: product } = await supabaseAdmin
        .from('products').select('packaging_type_id, weight_grams').eq('id', body.productIds[0]).single()
      if (product?.packaging_type_id) {
        const { data: pkg } = await supabaseAdmin
          .from('packaging_types').select('weight_grams, length_cm, width_cm, height_cm').eq('id', product.packaging_type_id).single()
        if (pkg) {
          parcel = {
            weight_kg: Math.max(0.01, (product.weight_grams ?? pkg.weight_grams) / 1000),
            length_cm: Number(pkg.length_cm),
            width_cm: Number(pkg.width_cm),
            height_cm: Number(pkg.height_cm),
          }
        }
      }
    }

    const rates = await getShippingRates({
      clientId: secrets.skydropx_client_id,
      clientSecret: secrets.skydropx_client_secret,
      originZip: settings.origin_zip,
      originState: settings.origin_state ?? '',
      originCity: settings.origin_city ?? '',
      originColonia: settings.origin_colonia ?? '',
      destZip: body.destZip,
      destState: body.destState,
      destCity: body.destCity,
      destColonia: body.destColonia,
      parcel,
    })

    return NextResponse.json({ rates })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error al cotizar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
