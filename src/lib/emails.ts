import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'pedidos@compadregallo.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'naitsabxs@icloud.com'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function folio(n: number) {
  return `GALLO-${String(n).padStart(5, '0')}`
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

export async function sendOrderConfirmation(order: OrderWithItems) {
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

  await resend.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `tu pedido ${folio(order.folio_number)} está confirmado`,
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
      <h2 style="margin:0 0 8px;font-size:22px;color:#0a0a0a">gracias, ${order.customer_name ?? 'compadre'}.</h2>
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
}

export async function sendAdminNewOrder(order: OrderWithItems) {
  const items = order.order_items ?? []
  const summary = items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')
  const addr = order.shipping_address
  const addrText = addr
    ? `${addr.street}, ${addr.colonia}, ${addr.zip} ${addr.city}, ${addr.state}`
    : '—'

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `nuevo pedido ${folio(order.folio_number)} — ${fmt(order.total_mxn)}`,
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
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64;width:120px">cliente</td><td style="padding:6px 0;font-size:13px;font-weight:600">${order.customer_name ?? '—'}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64">correo</td><td style="padding:6px 0;font-size:13px">${order.customer_email}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64">dirección</td><td style="padding:6px 0;font-size:13px">${addrText}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64">productos</td><td style="padding:6px 0;font-size:13px">${summary}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b6a64">total</td><td style="padding:6px 0;font-size:15px;font-weight:900;font-family:monospace">${fmt(order.total_mxn)}</td></tr>
      </table>

      <div style="margin-top:24px">
        <a href="https://compadregallo.vercel.app/casa/ordenes/${order.id}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:700">
          ver pedido en admin →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
  })
}
