import { Resend } from 'resend'
import { fmt, folio, escapeHtml } from '@/lib/utils'
import { supabaseAdmin } from '@/lib/supabase.server'

// Formato de correos tomado de gangstafairy y vestido de GALLO: un solo
// armazón (encabezado con el wordmark, pie con a dónde escribir), remitente
// con nombre, versión de texto plano y bloques armados con tablas — Gmail y
// Outlook ignoran flexbox, así que nada de display:flex aquí.

const getResend = () => new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'pedidos@compadregallo.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'
const SITE = APP_URL.replace(/^https?:\/\//, '')

// Buzón al que llegan las respuestas: es el que entra a /casa/soporte.
export const SUPPORT_EMAIL = 'hola@compadregallo.com'

// Nombre que ve el cliente en su bandeja en vez de la dirección pelona.
const FROM_WITH_NAME = FROM.includes('<') ? FROM : `GALLO <${FROM}>`

// ── Colores (los mismos tokens del sitio) ────────────────────────────────────
const INK = '#0a0a0a'
const MUTED = '#6b6a64'
const SUBTLE = '#9a9994'
const LINE = '#e8e7e1'
const SOFT = '#f6f5f1'
const RED = '#ff0100'
const YELLOW = '#ffe200'
const FONT = `'Helvetica Neue',Helvetica,Arial,sans-serif`
const MONO = `ui-monospace,Menlo,Consolas,monospace`

// ── Envío y bitácora ─────────────────────────────────────────────────────────
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

// Versión de texto plano a partir del HTML: los correos sin ella puntúan peor
// en los filtros de spam y no se leen en clientes que solo muestran texto.
export function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Los saltos de línea del código HTML no son saltos de verdad.
    .replace(/\s+/g, ' ')
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
      const texto = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!texto) return ''
      return href.startsWith('mailto:') || texto === href ? texto : `${texto} (${href})`
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li|ul|table)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function send(opts: {
  tipo: string
  to: string
  subject: string
  html: string
  folioNumber?: number
  isTest?: boolean
}): Promise<{ error?: string }> {
  // Vista previa local: con EMAIL_PREVIEW=1 (y nunca en producción) el correo
  // se guarda en .email-previews/ en vez de mandarse. Sirve para revisar el
  // diseño sin llenarle la bandeja a nadie.
  if (process.env.EMAIL_PREVIEW === '1' && process.env.NODE_ENV !== 'production') {
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir('.email-previews', { recursive: true })
    await writeFile(`.email-previews/${opts.tipo}.html`, opts.html)
    await writeFile(`.email-previews/${opts.tipo}.txt`, `Para: ${opts.to}\nAsunto: ${opts.subject}\n\n${htmlToText(opts.html)}`)
    return {}
  }

  const { data, error } = await getResend().emails.send({
    from: FROM_WITH_NAME,
    to: opts.to,
    replyTo: SUPPORT_EMAIL,
    subject: opts.subject,
    html: opts.html,
    text: htmlToText(opts.html),
  })
  await logEmail(opts.tipo, opts.to, opts.subject, {
    folioNumber: opts.folioNumber,
    resendId: data?.id,
    error: error?.message,
    isTest: opts.isTest,
  })
  return { error: error?.message }
}

// ── Armazón ──────────────────────────────────────────────────────────────────
const HEADER_HTML = `
    <div style="background:#ffffff;padding:22px 32px 18px;border-bottom:1px solid ${LINE}">
      <a href="${APP_URL}/tienda" style="text-decoration:none;font-family:${FONT};font-size:30px;font-weight:900;letter-spacing:-0.06em;line-height:1">
        <span style="color:#003a87">g</span><span style="color:#00c4df">a</span><span style="color:#ffd49a">l</span><span style="color:${RED}">l</span><span style="color:${YELLOW}">o</span>
      </a>
    </div>`

function footerHtml(extra = ''): string {
  return `
    <div style="padding:20px 32px;border-top:1px solid ${LINE};text-align:center;font-family:${FONT}">
      <p style="margin:0 0 6px;font-size:12px;color:${SUBTLE}">
        ${SITE} — ¿dudas? escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${SUBTLE}">${SUPPORT_EMAIL}</a>
      </p>
      <p style="margin:0;font-size:12px;color:${SUBTLE}">
        <a href="${APP_URL}/rastrear" style="color:${SUBTLE}">rastrear pedido</a> ·
        <a href="${APP_URL}/politicas/cambios-y-devoluciones" style="color:${SUBTLE}">cambios y devoluciones</a>
      </p>
      ${extra}
    </div>`
}

export function wrapEmail(content: string, opts?: { footerExtra?: string }): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:${FONT};background:${SOFT};margin:0;padding:40px 16px;color:${INK}">
  <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid ${LINE}">
    ${HEADER_HTML}
    <div style="padding:32px;font-family:${FONT}">${content}</div>
    ${footerHtml(opts?.footerExtra)}
  </div>
</body></html>`
}

// ── Bloques ──────────────────────────────────────────────────────────────────
const title = (text: string) =>
  `<h1 style="margin:0 0 8px;font-size:26px;line-height:1.1;font-weight:900;letter-spacing:-0.03em;color:${INK}">${text}</h1>`

const lead = (text: string) =>
  `<p style="margin:0 0 24px;color:${MUTED};font-size:15px;line-height:1.5">${text}</p>`

const para = (text: string) =>
  `<p style="margin:0 0 16px;color:${MUTED};font-size:14px;line-height:1.55">${text}</p>`

const label = (text: string, color = SUBTLE) =>
  `<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${color}">${text}</p>`

function button(href: string, text: string, bg = RED, fg = '#ffffff') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0"><tr><td style="background:${bg};border-radius:4px">
    <a href="${href}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:${fg};text-decoration:none">${text}</a>
  </td></tr></table>`
}

// El folio grande en su recuadro, con la liga para seguir el pedido.
function folioBlock(folioNumber: number) {
  const f = folio(folioNumber)
  return `<div style="background:${SOFT};border-radius:6px;padding:16px 18px;margin-bottom:24px">
    ${label('pedido')}
    <p style="margin:0;font-size:24px;font-weight:900;color:${INK};font-family:${MONO};letter-spacing:0.02em">${f}</p>
    <p style="margin:8px 0 0;font-size:13px;color:${MUTED}">con este folio y tu correo sigues tu pedido en <a href="${APP_URL}/rastrear?folio=${f}" style="color:${INK}">${SITE}/rastrear</a>.</p>
  </div>`
}

type Item = { product_name: string; quantity: number; unit_price_mxn: number }

function itemsTable(items: Item[]) {
  const th = (t: string, align: string) =>
    `<th style="text-align:${align};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${SUBTLE};padding:0 0 8px">${t}</th>`
  const rows = items.map(i => `<tr>
      <td style="padding:10px 0;border-top:1px solid ${LINE};font-size:14px;color:${INK}">${escapeHtml(i.product_name)}</td>
      <td style="padding:10px 0;border-top:1px solid ${LINE};font-size:14px;color:${MUTED};text-align:center">×${i.quantity}</td>
      <td style="padding:10px 0;border-top:1px solid ${LINE};font-size:14px;color:${INK};text-align:right;font-family:${MONO}">${fmt(i.unit_price_mxn * i.quantity)}</td>
    </tr>`).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${th('producto', 'left')}${th('cant.', 'center')}${th('precio', 'right')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function totalsTable(rows: [string, string][], total: string) {
  const r = rows.map(([k, v]) => `<tr>
      <td style="padding:4px 0;font-size:13px;color:${MUTED}">${k}</td>
      <td style="padding:4px 0;font-size:13px;color:${MUTED};text-align:right;font-family:${MONO}">${v}</td>
    </tr>`).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid ${LINE}">
    <tr><td colspan="2" style="height:10px"></td></tr>
    ${r}
    <tr>
      <td style="padding:10px 0 0;font-size:17px;font-weight:900;color:${INK}">total</td>
      <td style="padding:10px 0 0;font-size:17px;font-weight:900;color:${INK};text-align:right;font-family:${MONO}">${total}</td>
    </tr>
  </table>`
}

function addressText(addr: Record<string, string> | null): string | null {
  if (!addr) return null
  const parts = [addr.street, addr.colonia, [addr.zip, addr.city].filter(Boolean).join(' '), addr.state].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

function infoBlock(k: string, v: string) {
  return `<div style="margin-top:24px;border-top:1px solid ${LINE};padding-top:18px">
    ${label(k)}
    <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.5">${v}</p>
  </div>`
}

function trackingUrl(carrier: string | null, trackingNumber: string): string | null {
  if (!carrier) return null
  const c = carrier.toLowerCase()
  const n = encodeURIComponent(trackingNumber)
  if (c.includes('dhl'))           return `https://www.dhl.com/mx-es/home/tracking.html?tracking-id=${n}`
  if (c.includes('fedex'))         return `https://www.fedex.com/fedextrack/?trknbr=${n}`
  if (c.includes('estafeta'))      return `https://www.estafeta.com/Rastreo/BusquedaAvanzada?wayBill=${n}`
  if (c.includes('redpack'))       return `https://www.redpack.com.mx/es/rastreo/?guias=${n}`
  if (c.includes('ups'))           return `https://www.ups.com/track?tracknum=${n}`
  if (c.includes('paquetexpress')) return `https://www.paquetexpress.com.mx/rastreo?guia=${n}`
  if (c.includes('99minutos'))     return `https://tracking.99minutos.com/?guia=${n}`
  return null
}

const nombre = (n: string | null | undefined) => escapeHtml(n?.trim() || 'compadre')

// ── Pedidos ──────────────────────────────────────────────────────────────────
type OrderWithItems = {
  id: string
  folio_number: number
  customer_name: string | null
  customer_email: string
  total_mxn: number
  subtotal_mxn: number
  shipping_mxn: number
  discount_mxn?: number | null
  status: string
  shipping_address: Record<string, string> | null
  tracking_number: string | null
  order_items: Item[]
}

export async function sendOrderConfirmation(order: OrderWithItems, isTest = false) {
  const addr = addressText(order.shipping_address)
  const rows: [string, string][] = [['subtotal', fmt(order.subtotal_mxn)]]
  if (order.discount_mxn) rows.push(['descuento', `−${fmt(order.discount_mxn)}`])
  rows.push(['envío', order.shipping_mxn === 0 ? 'gratis' : fmt(order.shipping_mxn)])

  const subject = `tu pedido ${folio(order.folio_number)} está confirmado`
  await send({
    tipo: 'confirmacion_pedido',
    to: order.customer_email,
    subject,
    folioNumber: order.folio_number,
    isTest,
    html: wrapEmail(`
      ${title(`gracias, ${nombre(order.customer_name)}.`)}
      ${lead('tu pedido quedó confirmado. te avisamos por aquí en cuanto salga.')}
      ${folioBlock(order.folio_number)}
      ${itemsTable(order.order_items ?? [])}
      ${totalsTable(rows, fmt(order.total_mxn))}
      ${addr ? infoBlock('dirección de envío', escapeHtml(addr)) : ''}
      ${button(`${APP_URL}/rastrear?folio=${folio(order.folio_number)}`, 'rastrear mi pedido →')}
    `),
  })
}

export async function sendShipmentNotification(order: {
  customer_email: string
  customer_name: string | null
  folio_number: number
}, trackingNumber: string, carrier: string | null, isTest = false) {
  const url = trackingUrl(carrier, trackingNumber)
  const subject = `tu pedido ${folio(order.folio_number)} ya va en camino`
  await send({
    tipo: 'notificacion_envio',
    to: order.customer_email,
    subject,
    folioNumber: order.folio_number,
    isTest,
    html: wrapEmail(`
      ${title(`ya va en camino, ${nombre(order.customer_name)}.`)}
      ${lead(`tu pedido ${folio(order.folio_number)} salió${carrier ? ` con ${escapeHtml(carrier)}` : ''}.`)}
      <div style="background:${SOFT};border-radius:6px;padding:18px 20px;margin-bottom:8px">
        ${label('número de guía')}
        <p style="margin:0;font-size:22px;font-weight:900;font-family:${MONO};color:${INK};letter-spacing:0.02em">${escapeHtml(trackingNumber)}</p>
        ${carrier ? `<p style="margin:8px 0 0;font-size:13px;color:${MUTED}">paquetería: <strong style="color:${INK}">${escapeHtml(carrier)}</strong></p>` : ''}
      </div>
      ${button(url ?? `${APP_URL}/rastrear?folio=${folio(order.folio_number)}`, 'rastrear mi pedido →')}
      <p style="margin:16px 0 0;font-size:13px;color:${MUTED}">también puedes poner el número de guía directo en el sitio de la paquetería.</p>
    `),
  })
}

export async function sendOrderCancelled(order: {
  customer_email: string
  customer_name: string | null
  folio_number: number
  status: 'cancelled' | 'refunded'
}, isTest = false) {
  const isCancelled = order.status === 'cancelled'
  const subject = `tu pedido ${folio(order.folio_number)} fue ${isCancelled ? 'cancelado' : 'reembolsado'}`
  await send({
    tipo: isCancelled ? 'pedido_cancelado' : 'pedido_reembolsado',
    to: order.customer_email,
    subject,
    folioNumber: order.folio_number,
    isTest,
    html: wrapEmail(`
      ${title(isCancelled ? 'pedido cancelado.' : 'reembolso hecho.')}
      ${lead(`${nombre(order.customer_name)}, tu pedido ${folio(order.folio_number)} fue ${isCancelled ? 'cancelado' : 'reembolsado'}.`)}
      ${isCancelled ? '' : para('el dinero regresa a tu mismo método de pago. puede tardar de 5 a 10 días hábiles en verse en tu estado de cuenta, según tu banco.')}
      ${para(`si algo no te cuadra, contesta este correo o escríbenos a <a href="mailto:${SUPPORT_EMAIL}" style="color:${INK}">${SUPPORT_EMAIL}</a>.`)}
      ${button(`${APP_URL}/tienda`, 'ver la tienda →', INK)}
    `),
  })
}

export async function sendPaymentFailed(order: {
  customer_email: string
  customer_name: string | null
  folio_number: number
}, isTest = false) {
  const subject = `hubo un problema con el pago de tu pedido ${folio(order.folio_number)}`
  await send({
    tipo: 'pago_fallido',
    to: order.customer_email,
    subject,
    folioNumber: order.folio_number,
    isTest,
    html: wrapEmail(`
      ${title('tu pago no pasó.')}
      ${lead(`${nombre(order.customer_name)}, no pudimos cobrar tu pedido ${folio(order.folio_number)}, así que no se hizo ningún cargo.`)}
      ${para('suele pasar por fondos insuficientes, un dato mal escrito o un rechazo del banco. puedes intentar de nuevo con otra tarjeta, con Apple Pay o con Google Pay.')}
      ${button(`${APP_URL}/carrito`, 'intentar de nuevo →')}
    `),
  })
}

// Aviso interno: va a ADMIN_EMAIL, no al cliente.
export async function sendAdminNewOrder(order: OrderWithItems, isTest = false) {
  if (!ADMIN_EMAIL) return

  const addr = addressText(order.shipping_address) ?? '—'
  const row = (k: string, v: string) => `<tr>
      <td style="padding:7px 0;border-top:1px solid ${LINE};font-size:13px;color:${MUTED};width:110px;vertical-align:top">${k}</td>
      <td style="padding:7px 0;border-top:1px solid ${LINE};font-size:13px;color:${INK}">${v}</td>
    </tr>`

  const subject = `nuevo pedido ${folio(order.folio_number)} — ${fmt(order.total_mxn)}`
  await send({
    tipo: 'notificacion_admin',
    to: ADMIN_EMAIL,
    subject,
    folioNumber: order.folio_number,
    isTest,
    html: wrapEmail(`
      ${label('nuevo pedido', RED)}
      ${title(folio(order.folio_number))}
      <p style="margin:0 0 20px;font-size:22px;font-weight:900;font-family:${MONO}">${fmt(order.total_mxn)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
        ${row('cliente', escapeHtml(order.customer_name ?? '—'))}
        ${row('correo', escapeHtml(order.customer_email))}
        ${row('dirección', escapeHtml(addr))}
      </table>
      ${itemsTable(order.order_items ?? [])}
      ${button(`${APP_URL}/casa/ordenes/${order.id}`, 'ver pedido en el panel →', INK)}
    `),
  })
}

// ── Cuentas (se conserva para quien ya tiene cuenta; la tienda no las pide) ──
export async function sendWelcomeEmail(email: string, name: string | null, isTest = false) {
  await send({
    tipo: 'bienvenida',
    to: email,
    subject: 'bienvenido a gallo.',
    isTest,
    html: wrapEmail(`
      ${title(`bienvenido, ${nombre(name)}.`)}
      ${lead('ya eres parte de gallo. aquí vas a encontrar las piezas nuevas antes que nadie.')}
      ${button(`${APP_URL}/tienda`, 'ver la tienda →', INK)}
    `),
  })
}

// ── Descuento de bienvenida (10% por dejar tu correo) ────────────────────────
export async function sendDiscountWelcome(opts: {
  email: string
  code: string
  percent: number
  expiresAt: string | null
  unsubscribeUrl: string
}, isTest = false): Promise<{ error?: string }> {
  const vence = opts.expiresAt
    ? new Date(opts.expiresAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' })
    : null
  const baja = `<p style="margin:10px 0 0;font-size:11px;color:${SUBTLE}">te llegó porque dejaste tu correo en ${SITE}. <a href="${opts.unsubscribeUrl}" style="color:${SUBTLE}">ya no quiero correos</a></p>`

  return send({
    tipo: 'descuento_bienvenida',
    to: opts.email,
    subject: `tu ${opts.percent}% para la primera, compadre`,
    isTest,
    html: wrapEmail(`
      ${title('aquí está tu descuento.')}
      ${lead(`${opts.percent}% en tu primera compra. es de un solo uso y es solo para ti.`)}
      <div style="border:2px dashed ${INK};border-radius:8px;padding:22px 20px;text-align:center;margin-bottom:8px">
        ${label('tu código')}
        <p style="margin:6px 0 0;font-size:30px;font-weight:900;font-family:${MONO};letter-spacing:0.08em;color:${INK}">
          <span style="background:${YELLOW};padding:2px 10px">${escapeHtml(opts.code)}</span>
        </p>
        ${vence ? `<p style="margin:12px 0 0;font-size:13px;color:${MUTED}">vale hasta el ${vence}.</p>` : ''}
      </div>
      ${para('ponlo en el checkout, en "código de descuento", antes de pagar.')}
      ${button(`${APP_URL}/tienda`, 'ir a la tienda →')}
    `, { footerExtra: baja }),
  })
}

// ── Boletos ──────────────────────────────────────────────────────────────────
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
  const { data: artist } = await supabaseAdmin
    .from('artists').select('name').eq('id', data.artistId).single()
  const artistName = artist?.name ?? 'artista'

  const showDate = new Date(data.date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const boletoUrl = `${APP_URL}/boleto/${encodeURIComponent(data.folioCode)}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(boletoUrl)}&bgcolor=ffffff&color=0a0a0a&margin=4`
  const row = (k: string, v: string, last = false) => `<tr>
      <td style="padding:8px 0;${last ? '' : `border-bottom:1px solid ${LINE};`}font-size:13px;color:${MUTED};width:110px">${k}</td>
      <td style="padding:8px 0;${last ? '' : `border-bottom:1px solid ${LINE};`}font-size:14px;color:${INK}">${v}</td>
    </tr>`

  await send({
    tipo: 'confirmacion_boleto',
    to: data.customerEmail,
    subject: `tus boletos para ${artistName} — ${data.folioCode}`,
    isTest,
    html: wrapEmail(`
      ${title(`listo, ${nombre(data.customerName)}.`)}
      ${lead('tus boletos están confirmados. nos vemos en el show.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border-radius:8px;margin-bottom:24px">
        <tr>
          <td style="padding:18px;width:96px;vertical-align:top"><img src="${qrUrl}" alt="${escapeHtml(data.folioCode)}" width="96" height="96" style="display:block;border-radius:4px"></td>
          <td style="padding:18px 18px 18px 0;vertical-align:middle">
            ${label('folio')}
            <p style="margin:0;font-size:22px;font-weight:900;font-family:${MONO};color:${INK}">${escapeHtml(data.folioCode)}</p>
            <p style="margin:6px 0 0;font-size:13px;color:${MUTED}">${data.quantity} ${data.quantity === 1 ? 'boleto' : 'boletos'}</p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        ${row('artista', escapeHtml(artistName))}
        ${row('lugar', escapeHtml(data.venue))}
        ${row('ciudad', escapeHtml(data.city))}
        ${row('fecha', escapeHtml(showDate))}
        ${row('total', `<strong style="font-family:${MONO}">${fmt(data.totalMxn)}</strong>`, true)}
      </table>
      ${button(boletoUrl, 'ver mi boleto →', INK)}
      <p style="margin:16px 0 0;font-size:12px;color:${SUBTLE}">presenta el código QR o el folio en la entrada.</p>
    `),
  })
}

// ── Masivos ──────────────────────────────────────────────────────────────────
export async function sendMassEmail(
  subject: string,
  bodyHtml: string,
  recipients: { email: string; name: string | null; unsubscribeUrl?: string }[],
): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  let sent = 0
  let failed = 0

  // Lotes de 100 (límite de Resend)
  for (let i = 0; i < recipients.length; i += 100) {
    const batch = recipients.slice(i, i + 100)
    try {
      await resend.batch.send(
        batch.map(r => {
          const html = wrapEmail(
            bodyHtml.replace(/\{\{nombre\}\}/g, nombre(r.name)),
            r.unsubscribeUrl
              ? { footerExtra: `<p style="margin:10px 0 0;font-size:11px;color:${SUBTLE}"><a href="${r.unsubscribeUrl}" style="color:${SUBTLE}">ya no quiero correos</a></p>` }
              : undefined,
          )
          return { from: FROM_WITH_NAME, to: r.email, replyTo: SUPPORT_EMAIL, subject, html, text: htmlToText(html) }
        }),
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
