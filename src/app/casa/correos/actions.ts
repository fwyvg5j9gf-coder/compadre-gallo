'use server'

import {
  sendOrderConfirmation, sendAdminNewOrder, sendShipmentNotification,
  sendWelcomeEmail, sendOrderCancelled, sendPaymentFailed, sendMassEmail,
} from '@/lib/emails'
import { supabaseAdmin } from '@/lib/supabase.server'

const TEST_ORDER = {
  id: 'test',
  folio_number: 0,
  customer_name: 'Cliente Prueba',
  total_mxn: 35000,
  subtotal_mxn: 29900,
  shipping_mxn: 5100,
  status: 'paid',
  shipping_address: { street: 'Av. Prueba 123', colonia: 'Centro', zip: '06600', city: 'CDMX', state: 'Ciudad de México' },
  tracking_number: null,
  order_items: [{ product_name: 'producto de prueba', quantity: 1, unit_price_mxn: 29900 }],
}

export async function sendTestEmail(tipo: string, toEmail: string): Promise<{ ok: boolean; error?: string }> {
  try {
    switch (tipo) {
      case 'confirmacion_pedido':
        await sendOrderConfirmation({ ...TEST_ORDER, customer_email: toEmail }, true)
        break
      case 'notificacion_envio':
        await sendShipmentNotification(
          { customer_email: toEmail, customer_name: 'Cliente Prueba', folio_number: 0 },
          'TEST123456789', 'DHL', true,
        )
        break
      case 'notificacion_admin':
        await sendAdminNewOrder({ ...TEST_ORDER, customer_email: toEmail }, true)
        break
      case 'bienvenida':
        await sendWelcomeEmail(toEmail, 'Cliente Prueba', true)
        break
      case 'pedido_cancelado':
        await sendOrderCancelled({ customer_email: toEmail, customer_name: 'Cliente Prueba', folio_number: 0, status: 'cancelled' }, true)
        break
      case 'pedido_reembolsado':
        await sendOrderCancelled({ customer_email: toEmail, customer_name: 'Cliente Prueba', folio_number: 0, status: 'refunded' }, true)
        break
      case 'pago_fallido':
        await sendPaymentFailed({ customer_email: toEmail, customer_name: 'Cliente Prueba', folio_number: 0 }, true)
        break
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' }
  }
}

export async function getMassEmailRecipients(audience: string): Promise<{ email: string; name: string | null }[]> {
  if (audience === 'compradores') {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('customer_email, customer_name')
      .in('status', ['paid', 'shipped', 'delivered'])
    if (!data) return []
    const seen = new Set<string>()
    return data.reduce<{ email: string; name: string | null }[]>((acc, o) => {
      if (!seen.has(o.customer_email)) {
        seen.add(o.customer_email)
        acc.push({ email: o.customer_email, name: o.customer_name })
      }
      return acc
    }, [])
  }

  // 'todos' — orders + registered users
  const [ordersRes, usersRes] = await Promise.all([
    supabaseAdmin.from('orders').select('customer_email, customer_name').in('status', ['paid', 'shipped', 'delivered']),
    supabaseAdmin.from('users').select('email, name').eq('role', 'fan'),
  ])
  const seen = new Set<string>()
  const result: { email: string; name: string | null }[] = []
  for (const o of ordersRes.data ?? []) {
    if (!seen.has(o.customer_email)) {
      seen.add(o.customer_email)
      result.push({ email: o.customer_email, name: o.customer_name })
    }
  }
  for (const u of usersRes.data ?? []) {
    if (!seen.has(u.email)) {
      seen.add(u.email)
      result.push({ email: u.email, name: u.name })
    }
  }
  return result
}

export async function sendMasivo(
  subject: string,
  bodyHtml: string,
  audience: string,
): Promise<{ ok: boolean; sent?: number; failed?: number; error?: string }> {
  try {
    const recipients = await getMassEmailRecipients(audience)
    if (recipients.length === 0) return { ok: false, error: 'no hay destinatarios para esta audiencia' }
    const result = await sendMassEmail(subject, bodyHtml, recipients)
    return { ok: true, ...result }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' }
  }
}
