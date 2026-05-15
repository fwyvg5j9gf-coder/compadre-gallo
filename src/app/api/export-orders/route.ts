import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase.server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return new Response('No autorizado', { status: 401 })

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })

  if (error) return new Response(error.message, { status: 500 })

  const rows: string[] = [
    'folio,fecha,cliente,email,producto,talla,cantidad,precio_unit,total_orden,estado,calle,ciudad,estado_envio,cp',
  ]

  for (const order of orders ?? []) {
    const addr = (order.shipping_address ?? {}) as Record<string, string>
    const items = order.order_items ?? []

    if (items.length === 0) {
      rows.push([
        order.id.slice(0, 8),
        order.created_at.slice(0, 10),
        csv(order.customer_name ?? ''),
        csv(order.customer_email),
        '', '', '',
        '',
        (order.total_mxn / 100).toFixed(2),
        order.status,
        csv(addr.street ?? ''),
        csv(addr.city ?? ''),
        csv(addr.state ?? ''),
        addr.zip ?? '',
      ].join(','))
    } else {
      for (const item of items) {
        rows.push([
          order.id.slice(0, 8),
          order.created_at.slice(0, 10),
          csv(order.customer_name ?? ''),
          csv(order.customer_email),
          csv(item.product_name),
          csv(item.size ?? ''),
          item.quantity,
          (item.unit_price_mxn / 100).toFixed(2),
          (order.total_mxn / 100).toFixed(2),
          order.status,
          csv(addr.street ?? ''),
          csv(addr.city ?? ''),
          csv(addr.state ?? ''),
          addr.zip ?? '',
        ].join(','))
      }
    }
  }

  const filename = `ordenes-${new Date().toISOString().slice(0, 10)}.csv`
  return new Response('﻿' + rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// Escapa un valor para CSV (entre comillas si tiene comas o saltos)
function csv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}
