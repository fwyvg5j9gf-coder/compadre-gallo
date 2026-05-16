import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { csvCell } from '@/lib/utils'

const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)

export async function GET() {
  const { userId } = await auth()
  if (!userId) return new Response('No autorizado', { status: 401 })
  if (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(userId)) {
    return new Response('No autorizado', { status: 403 })
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .order('folio_number', { ascending: false })
    .limit(10000)

  if (error) return new Response(error.message, { status: 500 })

  const rows: string[] = [
    'folio,fecha,cliente,email,producto,talla,cantidad,precio_unit,total_orden,estado,calle,ciudad,estado_envio,cp',
  ]

  for (const order of orders ?? []) {
    const addr = (order.shipping_address ?? {}) as Record<string, string>
    const items = order.order_items ?? []
    const folioStr = `GALLO-${String(order.folio_number).padStart(5, '0')}`

    if (items.length === 0) {
      rows.push([
        csvCell(folioStr),
        csvCell(order.created_at.slice(0, 10)),
        csvCell(order.customer_name ?? ''),
        csvCell(order.customer_email),
        '', '', '', '',
        csvCell((order.total_mxn / 100).toFixed(2)),
        csvCell(order.status),
        csvCell(addr.street ?? ''),
        csvCell(addr.city ?? ''),
        csvCell(addr.state ?? ''),
        csvCell(addr.zip ?? ''),
      ].join(','))
    } else {
      for (const item of items) {
        rows.push([
          csvCell(folioStr),
          csvCell(order.created_at.slice(0, 10)),
          csvCell(order.customer_name ?? ''),
          csvCell(order.customer_email),
          csvCell(item.product_name),
          csvCell(item.size ?? ''),
          csvCell(String(item.quantity)),
          csvCell((item.unit_price_mxn / 100).toFixed(2)),
          csvCell((order.total_mxn / 100).toFixed(2)),
          csvCell(order.status),
          csvCell(addr.street ?? ''),
          csvCell(addr.city ?? ''),
          csvCell(addr.state ?? ''),
          csvCell(addr.zip ?? ''),
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
