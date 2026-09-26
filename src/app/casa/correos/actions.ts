'use server'

import {
  sendOrderConfirmation, sendAdminNewOrder, sendShipmentNotification,
  sendWelcomeEmail, sendOrderCancelled, sendPaymentFailed, sendMassEmail,
  sendDiscountWelcome, sendTicketConfirmation,
} from '@/lib/emails'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdminOrThrow } from '@/lib/auth.server'

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
  await requireAdminOrThrow()
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
      case 'descuento_bienvenida':
        await sendDiscountWelcome({
          email: toEmail, code: 'HOLAPRUEBA', percent: 10,
          expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'}/correos/baja`,
        }, true)
        break
      case 'confirmacion_boleto':
        await sendTicketConfirmation({
          customerName: 'Cliente Prueba', customerEmail: toEmail, folioCode: 'PRUEBA-0000',
          quantity: 2, unitPriceMxn: 35000, totalMxn: 70000, artistId: '00000000-0000-0000-0000-000000000000',
          venue: 'foro de prueba', city: 'Puebla', date: new Date().toISOString().slice(0, 10),
        }, true)
        break
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' }
  }
}

type Recipient = { email: string; name: string | null; unsubscribeUrl?: string }

export async function getMassEmailRecipients(audience: string): Promise<Recipient[]> {
  await requireAdminOrThrow()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'

  const [subsRes, unsubRes] = await Promise.all([
    supabaseAdmin.from('newsletter_subscribers').select('email, unsubscribe_token').is('unsubscribed_at', null),
    supabaseAdmin.from('newsletter_subscribers').select('email').not('unsubscribed_at', 'is', null),
  ])
  // Quien pidió no recibir correos no los recibe, aunque también haya comprado.
  const optedOut = new Set((unsubRes.data ?? []).map(r => r.email.toLowerCase()))
  const tokenOf = new Map((subsRes.data ?? []).map(r => [r.email.toLowerCase(), r.unsubscribe_token as string]))

  const seen = new Set<string>()
  const result: Recipient[] = []
  const push = (email: string | null, name: string | null) => {
    const e = email?.trim().toLowerCase()
    if (!e || seen.has(e) || optedOut.has(e)) return
    seen.add(e)
    const token = tokenOf.get(e)
    result.push({ email: e, name, unsubscribeUrl: token ? `${appUrl}/correos/baja?t=${token}` : undefined })
  }

  if (audience === 'suscriptores' || audience === 'todos') {
    for (const s of subsRes.data ?? []) push(s.email, null)
  }
  if (audience === 'compradores' || audience === 'todos') {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('customer_email, customer_name')
      .in('status', ['paid', 'shipped', 'delivered'])
    for (const o of data ?? []) push(o.customer_email, o.customer_name)
  }
  if (audience === 'todos') {
    const { data } = await supabaseAdmin.from('users').select('email, name').eq('role', 'fan')
    for (const u of data ?? []) push(u.email, u.name)
  }
  return result
}

export async function sendMasivo(
  subject: string,
  bodyHtml: string,
  audience: string,
): Promise<{ ok: boolean; sent?: number; failed?: number; error?: string }> {
  await requireAdminOrThrow()
  try {
    const recipients = await getMassEmailRecipients(audience)
    if (recipients.length === 0) return { ok: false, error: 'no hay destinatarios para esta audiencia' }
    const result = await sendMassEmail(subject, bodyHtml, recipients)
    return { ok: true, ...result }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' }
  }
}
