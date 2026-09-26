'use server'

import { randomInt } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import { checkRateLimit } from '@/lib/rateLimit'
import { sendDiscountWelcome } from '@/lib/emails'
import { WELCOME_PERCENT } from '@/lib/newsletter'

// "10% en tu primera compra a cambio de tu correo" (aprendido de Crème
// Atelier). Cada correo recibe un código propio de un solo uso. Suscribirse
// otra vez con el mismo correo no genera otro código: así nadie junta
// descuentos ni llena la bandeja de alguien más.
const VALID_DAYS = 30

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Sin 0/O ni 1/I/L: el código se dicta y se copia a mano.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export type SubscribeState = { ok: boolean; msg: string } | null

function newCode() {
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return `HOLA${s}`
}

async function clientIp() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown'
}

export async function subscribe(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  // Campo trampa: invisible para personas, los bots lo llenan.
  if ((formData.get('empresa') as string | null)?.trim()) {
    return { ok: true, msg: 'listo. revisa tu correo: ahí va tu código.' }
  }

  const email = ((formData.get('email') as string | null) ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, msg: 'ese correo no se ve bien. revísalo.' }
  }

  const { allowed } = checkRateLimit(`subscribe:${await clientIp()}`, { limit: 5, windowMs: 10 * 60_000 })
  if (!allowed) return { ok: false, msg: 'demasiados intentos. espera unos minutos.' }

  const { data: existing } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('id, unsubscribed_at')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    if (existing.unsubscribed_at) {
      await supabaseAdmin.from('newsletter_subscribers').update({ unsubscribed_at: null }).eq('id', existing.id)
      return { ok: true, msg: 'de vuelta en la lista. el descuento es uno por correo y ya te lo habíamos mandado.' }
    }
    return { ok: true, msg: 'ya estabas en la lista. tu código te llegó cuando te suscribiste; si no lo ves, revisa spam.' }
  }

  // Código único: el choque es rarísimo, pero la columna es unique y se reintenta.
  const expiresAt = new Date(Date.now() + VALID_DAYS * 86_400_000).toISOString()
  let code: { id: string; code: string } | null = null
  for (let i = 0; i < 4 && !code; i++) {
    const { data } = await supabaseAdmin
      .from('discount_codes')
      .insert({ code: newCode(), type: 'percent', value: WELCOME_PERCENT, max_uses: 1, min_order_mxn: 0, expires_at: expiresAt })
      .select('id, code')
      .single()
    code = data
  }
  if (!code) return { ok: false, msg: 'no pudimos generar tu código. intenta de nuevo en un rato.' }

  const { data: sub, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .insert({ email, discount_code_id: code.id })
    .select('unsubscribe_token')
    .single()

  if (error || !sub) {
    // Dos envíos al mismo tiempo con el mismo correo: gana el primero.
    await supabaseAdmin.from('discount_codes').delete().eq('id', code.id)
    return { ok: true, msg: 'ya estabas en la lista. revisa tu correo.' }
  }

  const sent = await sendDiscountWelcome({
    email,
    code: code.code,
    percent: WELCOME_PERCENT,
    expiresAt,
    unsubscribeUrl: `${APP_URL}/correos/baja?t=${sub.unsubscribe_token}`,
  }).catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }))

  if (sent.error) {
    console.error('[subscribe] no se mandó el correo de bienvenida:', sent.error)
    return { ok: false, msg: 'quedaste en la lista, pero no pudimos mandarte el código. escríbenos a hola@compadregallo.com y te lo pasamos.' }
  }

  return { ok: true, msg: 'listo. revisa tu correo: ahí va tu código.' }
}

// Baja con confirmación explícita (botón), no al abrir la liga: algunos
// antivirus de correo abren todas las ligas y darían de baja a la gente.
export async function unsubscribe(formData: FormData): Promise<void> {
  const token = ((formData.get('t') as string | null) ?? '').trim()
  if (!/^[0-9a-f]{36}$/.test(token)) redirect('/correos/baja')
  await supabaseAdmin
    .from('newsletter_subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .is('unsubscribed_at', null)
  redirect(`/correos/baja?t=${token}&listo=1`)
}
