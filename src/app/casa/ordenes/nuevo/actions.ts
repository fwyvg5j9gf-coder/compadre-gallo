'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdmin } from '@/lib/auth.server'

export type UserLookup = {
  email: string
  name: string | null
  phone: string | null
  address: Record<string, string> | null
}

export async function lookupUser(email: string): Promise<{ data?: UserLookup; error?: string }> {
  try {
    await requireAdmin()
    const q = email.trim().toLowerCase()
    if (!q) return { error: 'escribe un correo o nombre' }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .or(`email.ilike.%${q}%,name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(1)
      .single()

    if (!user) return { error: 'usuario no encontrado' }

    // Buscar última dirección de envío en órdenes previas
    const { data: lastOrder } = await supabaseAdmin
      .from('orders')
      .select('customer_phone, shipping_address')
      .eq('customer_email', user.email)
      .not('shipping_address', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return {
      data: {
        email: user.email,
        name: user.name,
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
    await requireAdmin()

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
