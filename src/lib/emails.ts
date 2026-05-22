import { Resend } from 'resend'
import { fmt, folio, escapeHtml } from '@/lib/utils'
import { supabaseAdmin } from '@/lib/supabase.server'

const getResend = () => new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'pedidos@compadregallo.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'

async function logEmail(tipo: string, toEmail: string, subject: string, opts?: {
  folioNumber?: number
  resendId?: string
  error?: string
  isTest?: boolean
  recipientCount?: number
}) {
  await supabaseAdmin.from('email_logs').insert({
    tipo,
    to_email: toEmail,
    subject,
    folio_number: opts?.folioNumber ?? null,
    resend_id: opts?.resendId ?? null,
    error: opts?.error ?? null,
    is_test: opts?.isTest ?? false,
    recipient_count: opts?.recipientCount ?? null,
  })
}

function getTrackingUrl(carrier: string | null, trackingNumber: string): string | null {
  if (!carrier) return null
  const c = carrier.toLowerCase()
  if (c.includes('dhl'))          return `https://www.dhl.com/mx-es/home/tracking.html?tracking-id=${trackingNumber}`
  if (c.includes('fedex'))        return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  if (c.includes('estafeta'))     return `https://www.estafeta.com/Rastreo/BusquedaAvanzada?wayBill=${trackingNumber}`
  if (c.includes('redpack'))      return `https://www.redpack.com.mx/es/rastreo/?guias=${trackingNumber}`
  if (c.includes('ups'))          return `https://www.ups.com/track?tracknum=${trackingNumber}`
  if (c.includes('paquetexpress')) return `https://www.paquetexpress.com.mx/rastreo?guia=${trackingNumber}`
  if (c.includes('99minutos'))    return `https://tracking.99minutos.com/?guia=${trackingNumber}`
  return null
}

const HEADER_HTML = `
    <div style="background:#0a0a0a;padding:24px 32px">
      <span style="font-size:28px;font-weight:900;letter-spacing:-0.05em">
        <span style="color:#003a87">g</span><span style="color:#00c4df">a</span><span style="color:#ffd49a">l</span><span style="color:#ff0100">l</span><span style="color:#ffe200">o</span>
      </span>
    </div>`

const FOOTER_HTML = `
    <div style="padding:20px 32px;border-top:1px solid #e8e7e1;text-align:center">
      <p style="margin:0;font-size:12px;color:#9a9994">compadregallo.com — cualquier duda, contáctanos.</p>
    </div>`

function wrapEmail(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f6f5f1;margin:0;padding:40px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e8e7e1">
    ${HEADER_HTML}
    <div style="padding:32px">${content}</div>
    ${FOOTER_HTML}
  </div>
</body></html>`
}

type OrderWithItems = {
  id: string
  folio_number: number
  customer_name: string | null
  customer_email: string
  total_mxn: number
  subtotal_mxn: number
  shipping_mxn: number
  status: string
  shipping_address: Record<string, string> | null
  tracking_number: string | null
  order_items: { product_name: string; quantity: number; unit_price_mxn: number }[]
}

export async function sendOrderConfirmation(order: OrderWithItems, isTest = false) {
  const items = order.order_items ?? []
  const itemsHtml = items
    .map(i => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0efe9">${i.product_name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0efe9;text-align:center">×${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0efe9;text-align:right;font-family:monospace">${fmt(i.unit_price_mxn * i.quantity)}</td>
    </tr>`)
    .join('')

  const addr = order.shipping_address
  const addrText = addr
    ? `${addr.street}, ${addr.colonia}, ${addr.zip} ${addr.city}, ${addr.state}`
    : '—'

  const subject = `tu pedido ${folio(order.folio_number)} está confirmado`
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: order.customer_email,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f6f5f1;margin:0;padding:40px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e8e7e1">
    <div style="background:#0a0a0a;padding:24px 32px">
      <span style="font-size:28px;font-weight:900;letter-spacing:-0.05em">
        <span style="color:#003a87">g</span><span style="color:#00c4df">a</span><span style="color:#ffd49a">l</span><span style="color:#ff0100">l</span><span style="color:#ffe200">o</span>
      </span>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#0a0a0a">gracias, ${escapeHtml(order.customer_name ?? 'compadre')}.</h2>
      <p style="margin:0 0 24px;color:#6b6a64;font-size:14px">tu pedido quedó confirmado.</p>

      <div style="background:#f6f5f1;border-radius:6px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;color:#6b6a64">folio</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#0a0a0a;letter-spacing:-0.02em">${folio(order.folio_number)}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr>
            <th style="text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9a9994;padding-bottom:8px">producto</th>
            <th style="text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9a9994;padding-bottom:8px">cant.</th>
            <th style="text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9a9994;padding-bottom:8px">precio</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="border-top:1px solid #e8e7e1;padding-top:16px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b6a64">
          <span>subtotal</span><span style="font-family:monospace">${fmt(order.subtotal_mxn)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b6a64">
          <span>envío</span><span style="font-family:monospace">${order.shipping_mxn === 0 ? 'gratis' : fmt(order.shipping_mxn)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0a0a0a;margin-top:4px">
          <span>total</span><span style="font-family:monospace">${fmt(order.total_mxn)}</span>
        </div>
      </div>

      ${addrText !== '—' ? `
      <div style="margin-top:24px;border-top:1px solid #e8e7e1;padding-top:20px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9a9994">dirección de envío</p>
        <p style="margin:0;font-size:13px;color:#6b6a64">${addrText}</p>
      </div>` : ''}

      ${order.tracking_number ? `
      <div style="margin-top:20px;background:#f0f9ff;border-radius:6px;padding:14px 16px">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#007a8c">número de guía</p>
        <p style="margin:0;font-size:14px;font-weight:700;font-family:monospace;color:#003a87">${order.tracking_number}</p>
      </div>` : ''}

    </div>
    <div style="padding:20px 32px;border-top:1px solid #e8e7e1;text-align:center">
      <p style="margin:0;font-size:12px;color:#9a9994">compadregallo.com — cualquier duda, contáctanos.</p>
    </div>
  </div>
</body>
</html>`,
  })
  await logEmail('confirmacion_pedido', order.customer_email, subject, {
    folioNumber: order.folio_number,
    resendId: data?.id,
    error: error?.message,
    isTest,
  })
}

export async function sendShipmentNotification(order: {
  customer_email: string
  customer_name: string | null
  folio_number: number
}, trackingNumber: string, carrier: string | null, isTest = false) {
  const subject = `tu pedido ${folio(order.folio_number)} está en camino`
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: order.customer_email,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f6f5f1;margin:0;padding:40px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e8e7e1">
    <div style="background:#0a0a0a;padding:24px 32px">
      <span style="font-size:28px;font-weight:900;letter-spacing:-0.05em">
        <span style="color:#003a87">g</span><span style="color:#00c4df">a</span><span style="color:#ffd49a">l</span><span style="color:#ff0100">l</span><span style="color:#ffe200">o</span>
      </span>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#0a0a0a">ya va en camino, ${escapeHtml(order.customer_name ?? 'compadre')}.</h2>
      <p style="margin:0 0 24px;color:#6b6a64;font-size:14px">tu pedido ${folio(order.folio_number)} fue enviado${carrier ? ` con ${escapeHtml(carrier)}` : ''}.</p>

      <div style="background:rgba(0,196,223,0.08);border:1px solid rgba(0,196,223,0.25);border-radius:6px;padding:20px 24px;margin-bottom:24px">
        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#007a8c;font-weight:700">número de guía</p>
        <p style="margin:0;font-size:22px;font-weight:900;font-family:monospace;color:#003a87;letter-spacing:0.02em">${escapeHtml(trackingNumber)}</p>
        ${carrier ? `<p style="margin:8px 0 0;font-size:13px;color:#6b6a64">paquetería: <strong>${escapeHtml(carrier)}</strong></p>` : ''}
      </div>

      ${getTrackingUrl(carrier, trackingNumber) ? `
      <a href="${getTrackingUrl(carrier, trackingNumber)}" style="display:inline-block;background:#003a87;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:700;margin-bottom:16px">
        rastrear mi pedido →
      </a>` : ''}
      <p style="font-size:13px;color:#6b6a64;margin:0">también puedes usar el número de guía directamente en el sitio de la paquetería.</p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #e8e7e1;text-align:center">
      <p style="margin:0;font-size:12px;color:#9a9994">compadregallo.com — cualquier duda, contáctanos.</p>
    </div>
  </div>
</body>
</html>`,
  })
  await logEmail('notificacion_envio', order.customer_email, subject, {
    folioNumber: order.folio_number,
    resendId: data?.id,
    error: error?.message,
    isTest,
  })
}

export async function sendAdminNewOrder(order: OrderWithItems, isTest = false) {
  if (!ADMIN_EMAIL) return  // skip if not configured

  const items = order.order_items ?? []
  const summary = items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')
  const addr = order.shipping_address
  const addrText = addr
    ? `${addr.street}, ${addr.colonia}, ${addr.zip} ${addr.city}, ${addr.state}`
    : '—'

  const subject = `nuevo pedido ${folio(order.folio_number)} — ${fmt(order.total_mxn)}`
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#0a0a0a;margin:0;padding:40px 16px">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#0a0a0a;padding:20px 28px;display:flex;align-items:center;gap:12px">
      <span style="font-size:24px;font-weight:900;letter-spacing:-0.05em">
        <span style="color:#003a87">g</span><span style="color:#00c4df">a</span><span style="color:#ffd49a">l</span><span style="color:#ff0100">l</span><span style="color:#ffe200">o</span>
      </span>
      <span style="color:#6b6a64;font-size:13px">nuevo pedido</span>
    </div>
    <div style="padding:28px">
      <h2 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#0a0a0a">${folio(order.folio_number)}</h2>

      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64;width:120px">cliente</td><td style="padding:6px 0;font-size:13px;font-weight:600">${escapeHtml(order.customer_name ?? '—')}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64">correo</td><td style="padding:6px 0;font-size:13px">${escapeHtml(order.customer_email)}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64">dirección</td><td style="padding:6px 0;font-size:13px">${escapeHtml(addrText)}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64">productos</td><td style="padding:6px 0;font-size:13px">${escapeHtml(summary)}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64">total</td><td style="padding:6px 0;font-size:15px;font-weight:900;font-family:monospace">${fmt(order.total_mxn)}</td></tr>
      </table>

      <div style="margin-top:24px">
        <a href="${APP_URL}/casa/ordenes/${order.id}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:700">
          ver pedido en admin →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
  })
  await logEmail('notificacion_admin', ADMIN_EMAIL, subject, {
    folioNumber: order.folio_number,
    resendId: data?.id,
    error: error?.message,
    isTest,
  })
}

// ── Welcome ─────────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(email: string, name: string | null, isTest = false) {
  const subject = 'bienvenido a gallo.'
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: email,
    subject,
    html: wrapEmail(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#0a0a0a">bienvenido, ${escapeHtml(name ?? 'compadre')}.</h2>
      <p style="margin:0 0 24px;color:#6b6a64;font-size:14px">ya eres parte de gallo. aquí vas a encontrar música, merch y preventas antes que nadie.</p>
      <a href="${APP_URL}/tienda" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:700">
        explorar tienda →
      </a>
    `),
  })
  await logEmail('bienvenida', email, subject, { resendId: data?.id, error: error?.message, isTest })
}

// ── Order cancelled / refunded ───────────────────────────────────────────────
export async function sendOrderCancelled(order: {
  customer_email: string
  customer_name: string | null
  folio_number: number
  status: 'cancelled' | 'refunded'
}, isTest = false) {
  const isCancelled = order.status === 'cancelled'
  const subject = `tu pedido ${folio(order.folio_number)} fue ${isCancelled ? 'cancelado' : 'reembolsado'}`
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: order.customer_email,
    subject,
    html: wrapEmail(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#0a0a0a">
        ${isCancelled ? 'pedido cancelado.' : 'reembolso procesado.'}
      </h2>
      <p style="margin:0 0 24px;color:#6b6a64;font-size:14px">
        ${escapeHtml(order.customer_name ?? 'compadre')}, tu pedido ${folio(order.folio_number)} fue ${isCancelled ? 'cancelado' : 'reembolsado'}.
        ${isCancelled ? '' : ' el reembolso puede tardar 5–10 días hábiles en reflejarse en tu cuenta.'}
      </p>
      <p style="font-size:13px;color:#6b6a64;margin:0 0 24px">¿tienes dudas? contáctanos, con gusto te ayudamos.</p>
      <a href="${APP_URL}/tienda" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:700">
        ver tienda →
      </a>
    `),
  })
  await logEmail(isCancelled ? 'pedido_cancelado' : 'pedido_reembolsado', order.customer_email, subject, {
    folioNumber: order.folio_number,
    resendId: data?.id,
    error: error?.message,
    isTest,
  })
}

// ── Payment failed ───────────────────────────────────────────────────────────
export async function sendPaymentFailed(order: {
  customer_email: string
  customer_name: string | null
  folio_number: number
}, isTest = false) {
  const subject = `problema con el pago de tu pedido ${folio(order.folio_number)}`
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: order.customer_email,
    subject,
    html: wrapEmail(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#0a0a0a">hubo un problema con tu pago.</h2>
      <p style="margin:0 0 8px;color:#6b6a64;font-size:14px">
        ${escapeHtml(order.customer_name ?? 'compadre')}, no pudimos procesar el pago de tu pedido ${folio(order.folio_number)}.
      </p>
      <p style="margin:0 0 24px;color:#6b6a64;font-size:14px">
        esto puede pasar por fondos insuficientes, datos incorrectos, o un rechazo de tu banco. intenta de nuevo con otra tarjeta o contáctanos.
      </p>
      <a href="${APP_URL}/tienda" style="display:inline-block;background:#ff0100;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:700">
        volver a la tienda →
      </a>
    `),
  })
  await logEmail('pago_fallido', order.customer_email, subject, {
    folioNumber: order.folio_number,
    resendId: data?.id,
    error: error?.message,
    isTest,
  })
}

// ── Ticket confirmation ──────────────────────────────────────────────────────
export async function sendTicketConfirmation(data: {
  customerName: string
  customerEmail: string
  folioCode: string
  quantity: number
  unitPriceMxn: number
  totalMxn: number
  artistId: string
  venue: string
  city: string
  date: string
}, isTest = false) {
  // Fetch artist name for the email
  const { data: artist } = await supabaseAdmin
    .from('artists').select('name').eq('id', data.artistId).single()
  const artistName = artist?.name ?? 'artista'

  const showDate = new Date(data.date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(data.folioCode)}&bgcolor=ffffff&color=0a0a0a&margin=4`

  const subject = `tus boletos para ${escapeHtml(artistName)} — ${data.folioCode}`
  const { data: res, error } = await getResend().emails.send({
    from: FROM,
    to: data.customerEmail,
    subject,
    html: wrapEmail(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#0a0a0a">listo, ${escapeHtml(data.customerName)}.</h2>
      <p style="margin:0 0 24px;color:#6b6a64;font-size:14px">tus boletos están confirmados. nos vemos en el show.</p>

      <div style="background:#f6f5f1;border-radius:8px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:flex-start;gap:20px">
        <img src="${qrUrl}" alt="${data.folioCode}" width="80" height="80" style="flex-shrink:0;border-radius:4px" />
        <div>
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9a9994;font-weight:700">folio</p>
          <p style="margin:0;font-size:22px;font-weight:900;color:#003a87;font-family:monospace;letter-spacing:0.04em">${data.folioCode}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#6b6a64">${data.quantity} ${data.quantity === 1 ? 'boleto' : 'boletos'}</p>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0efe9;font-size:13px;color:#6b6a64;width:120px">artista</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0efe9;font-size:13px;font-weight:600">${escapeHtml(artistName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0efe9;font-size:13px;color:#6b6a64">venue</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0efe9;font-size:13px">${escapeHtml(data.venue)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0efe9;font-size:13px;color:#6b6a64">ciudad</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0efe9;font-size:13px">${escapeHtml(data.city)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0efe9;font-size:13px;color:#6b6a64">fecha</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0efe9;font-size:13px">${escapeHtml(showDate)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b6a64">total</td>
          <td style="padding:8px 0;font-size:16px;font-weight:900;font-family:monospace">${fmt(data.totalMxn)}</td>
        </tr>
      </table>

      <a href="${APP_URL}/cuenta" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:700">
        ver mis boletos →
      </a>

      <p style="margin:20px 0 0;font-size:12px;color:#9a9994">presenta el código QR o el folio en la entrada del show.</p>
    `),
  })
  await logEmail('confirmacion_boleto', data.customerEmail, subject, {
    resendId: res?.id,
    error: error?.message,
    isTest,
  })
}

// ── Mass email ───────────────────────────────────────────────────────────────
export async function sendMassEmail(
  subject: string,
  bodyHtml: string,
  recipients: { email: string; name: string | null }[],
): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  let sent = 0
  let failed = 0

  // Send in batches of 100 (Resend limit)
  for (let i = 0; i < recipients.length; i += 100) {
    const batch = recipients.slice(i, i + 100)
    try {
      await resend.batch.send(
        batch.map(r => ({
          from: FROM,
          to: r.email,
          subject,
          html: wrapEmail(bodyHtml.replace(/\{\{nombre\}\}/g, escapeHtml(r.name ?? 'compadre'))),
        })),
      )
      sent += batch.length
    } catch {
      failed += batch.length
    }
  }

  await logEmail('masivo', FROM, subject, {
    recipientCount: recipients.length,
    error: failed > 0 ? `${failed} fallidos de ${recipients.length}` : undefined,
  })

  return { sent, failed }
}
