'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdminOrThrow } from '@/lib/auth.server'
import { getShippingRates, type ShippingRate } from '@/lib/skydropx'

export type UserLookup = {
  email: string
  name: string | null
  phone: string | null
  address: Record<string, string> | null
}

export type { ShippingRate }

export async function fetchRatesForNewOrder({
  destZip, destState, destCity, destColonia,
  productIds,
}: {
  destZip: string
  destState: string
  destCity: string
  destColonia: string
  productIds: string[]
}): Promise<{ rates?: ShippingRate[]; error?: string }> {
  try {
    await requireAdminOrThrow()

    const [{ data: settings }, { data: secrets }] = await Promise.all([
      supabaseAdmin.from('store_settings').select('origin_zip, origin_state, origin_city, origin_colonia, skydropx_enabled').single(),
      supabaseAdmin.from('store_secrets').select('skydropx_client_id, skydropx_client_secret').single(),
    ])

    if (!settings?.skydropx_enabled) return { error: 'Skydropx no está habilitado' }
    if (!secrets?.skydropx_client_id || !secrets?.skydropx_client_secret) return { error: 'faltan credenciales de Skydropx' }
    if (!settings.origin_zip) return { error: 'falta código postal de origen en configuración' }
    if (!destZip) return { error: 'agrega el código postal de destino' }

    let parcel = { weight_kg: 0.5, length_cm: 30, width_cm: 20, height_cm: 10 }

    if (productIds.length > 0) {
      const { data: product } = await supabaseAdmin
        .from('products').select('packaging_type_id, weight_grams').eq('id', productIds[0]).single()
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
      clientId: secrets!.skydropx_client_id,
      clientSecret: secrets!.skydropx_client_secret,
      originZip: settings.origin_zip,
      originState: settings.origin_state ?? '',
      originCity: settings.origin_city ?? '',
      originColonia: settings.origin_colonia ?? '',
      destZip,
      destState,
      destCity,
      destColonia,
      parcel,
    })

    return { rates }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al cotizar' }
  }
}

export async function lookupUser(query: string): Promise<{ data?: UserLookup; error?: string }> {
  try {
    await requireAdminOrThrow()
    const q = query.trim()
    if (!q) return { error: 'escribe un correo o nombre' }

    const isEmail = q.includes('@')

    // 1. Buscar en tabla users
    let user: { email: string; name: string | null } | null = null
    if (isEmail) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('email, name')
        .ilike('email', q)
        .limit(1)
        .maybeSingle()
      user = data
    } else {
      const { data } = await supabaseAdmin
        .from('users')
        .select('email, name')
        .ilike('name', `%${q}%`)
        .limit(1)
        .maybeSingle()
      user = data
    }

    // 2. Buscar en orders — primero por email exacto, luego por nombre
    let lastOrder: { customer_email: string; customer_name: string | null; customer_phone: string | null; shipping_address: unknown } | null = null
    const emailForOrders = user?.email ?? (isEmail ? q : null)

    if (emailForOrders) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('customer_email, customer_name, customer_phone, shipping_address')
        .ilike('customer_email', emailForOrders)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lastOrder = data
    } else {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('customer_email, customer_name, customer_phone, shipping_address')
        .ilike('customer_name', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lastOrder = data
    }

    const resolvedEmail = user?.email ?? lastOrder?.customer_email
    if (!resolvedEmail) return { error: 'cliente no encontrado' }

    return {
      data: {
        email: resolvedEmail,
        name: user?.name ?? lastOrder?.customer_name ?? null,
        phone: lastOrder?.customer_phone ?? null,
        address: lastOrder?.shipping_address as Record<string, string> | null,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al buscar' }
  }
}

export type ManualItem = {
  productId: string
  productName: string
  variantId: string | null
  size: string | null
  quantity: number
  unitPriceMxn: number  // centavos
}

export type ManualOrderResult = { orderId?: string; error?: string }

export async function createManualOrder(formData: FormData): Promise<ManualOrderResult> {
  try {
    await requireAdminOrThrow()

    const customerEmail = (formData.get('customer_email') as string ?? '').trim()
    const customerName  = (formData.get('customer_name')  as string ?? '').trim()
    const customerPhone = (formData.get('customer_phone') as string ?? '').trim()
    const notes         = (formData.get('notes')          as string ?? '').trim()
    const status        = (formData.get('status')         as string) || 'paid'
    const isTest        = formData.get('is_test') === '1'
    const shippingPesos = parseFloat((formData.get('shipping_mxn') as string) || '0')
    const shippingMxn   = isNaN(shippingPesos) ? 0 : Math.round(shippingPesos * 100)

    if (!customerEmail) return { error: 'el correo del cliente es requerido' }

    const itemsRaw = formData.get('items_json') as string
    let items: ManualItem[] = []
    try { items = JSON.parse(itemsRaw) } catch { return { error: 'lista de productos inválida' } }
    if (items.length === 0) return { error: 'agrega al menos un producto' }
    if (items.some(i => i.quantity < 1)) return { error: 'la cantidad mínima por producto es 1' }

    const subtotal = items.reduce((s, i) => s + i.unitPriceMxn * i.quantity, 0)
    const total = subtotal + shippingMxn

    const street  = (formData.get('addr_street')  as string ?? '').trim()
    const colonia = (formData.get('addr_colonia') as string ?? '').trim()
    const zip     = (formData.get('addr_zip')     as string ?? '').trim()
    const city    = (formData.get('addr_city')    as string ?? '').trim()
    const state   = (formData.get('addr_state')   as string ?? '').trim()
    const shippingAddress = (street || zip) ? { street, colonia, zip, city, state } : null

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_email: customerEmail,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        status,
        subtotal_mxn: subtotal,
        shipping_mxn: shippingMxn,
        total_mxn: total,
        shipping_address: shippingAddress,
        notes: notes || null,
        is_test: isTest,
      })
      .select('id')
      .single()

    if (orderErr || !order) return { error: 'error al crear la orden: ' + (orderErr?.message ?? 'desconocido') }

    const orderItems = items.map(i => ({
      order_id: order.id,
      product_id: i.productId || null,
      product_name: i.productName,
      size: i.size || null,
      variant_id: i.variantId || null,
      quantity: i.quantity,
      unit_price_mxn: i.unitPriceMxn,
    }))

    const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(orderItems)
    if (itemsErr) return { error: 'orden creada pero error al guardar productos: ' + itemsErr.message }

    revalidatePath('/casa/ordenes')
    return { orderId: order.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error inesperado' }
  }
}
