'use server'

import { sendOrderConfirmation, sendAdminNewOrder, sendShipmentNotification } from '@/lib/emails'

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
    if (tipo === 'confirmacion_pedido') {
      await sendOrderConfirmation({ ...TEST_ORDER, customer_email: toEmail }, true)
    } else if (tipo === 'notificacion_envio') {
      await sendShipmentNotification(
        { customer_email: toEmail, customer_name: 'Cliente Prueba', folio_number: 0 },
        'TEST123456789', 'DHL', true,
      )
    } else if (tipo === 'notificacion_admin') {
      await sendAdminNewOrder({ ...TEST_ORDER, customer_email: toEmail }, true)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' }
  }
}
