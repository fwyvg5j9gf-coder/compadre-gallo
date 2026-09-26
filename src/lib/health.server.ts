// Salud del sistema: ¿está conectado cada servicio del que depende el sitio?
// Lo usa /casa/salud. Cada chequeo corre en paralelo, con tiempo límite, y
// nunca regresa el valor de una llave: solo si existe y si funciona.

import 'server-only'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase.server'
import { getShippingConfig, testQuote } from '@/lib/shipping.server'

export type HealthStatus = 'ok' | 'aviso' | 'falla'
export type HealthCheck = { area: string; nombre: string; status: HealthStatus; detalle: string; ms?: number }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
const has = (k: string) => !!process.env[k]?.trim()

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`sin respuesta en ${ms / 1000} s`)), ms))])
}

async function run(area: string, nombre: string, fn: () => Promise<Omit<HealthCheck, 'area' | 'nombre' | 'ms'>>): Promise<HealthCheck> {
  const t0 = Date.now()
  try {
    const r = await withTimeout(fn())
    return { area, nombre, ...r, ms: Date.now() - t0 }
  } catch (e) {
    return { area, nombre, status: 'falla', detalle: e instanceof Error ? e.message : String(e), ms: Date.now() - t0 }
  }
}

const ok = (detalle: string) => ({ status: 'ok' as const, detalle })
const aviso = (detalle: string) => ({ status: 'aviso' as const, detalle })
const falla = (detalle: string) => ({ status: 'falla' as const, detalle })

export async function runHealthChecks(): Promise<HealthCheck[]> {
  const [{ data: settings }, { data: secrets }] = await Promise.all([
    supabaseAdmin.from('store_settings').select('stripe_test_mode, stripe_pk_test, stripe_pk_live, ai_chat_enabled').eq('id', 1).single(),
    supabaseAdmin.from('store_secrets').select('stripe_sk_test, stripe_sk_live, stripe_webhook_secret').eq('id', 1).single(),
  ])
  const stripeTest = settings?.stripe_test_mode ?? true
  const stripeKey = ((stripeTest ? secrets?.stripe_sk_test : secrets?.stripe_sk_live) || process.env.STRIPE_SECRET_KEY || '').trim()

  return Promise.all([
    // ── Sitio ──
    run('sitio', 'dirección pública', async () => {
      if (!APP_URL) return aviso('falta NEXT_PUBLIC_APP_URL; se usa https://compadregallo.com por defecto')
      if (!APP_URL.startsWith('https://compadregallo.com')) return aviso(`NEXT_PUBLIC_APP_URL es ${APP_URL}; los correos ligan ahí`)
      return ok(APP_URL)
    }),

    // ── Base de datos ──
    run('base de datos', 'Supabase', async () => {
      const { count, error } = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true })
      if (error) return falla(error.message)
      return ok(`responde · ${count} productos`)
    }),
    run('base de datos', 'almacenamiento de archivos', async () => {
      const { data, error } = await supabaseAdmin.storage.listBuckets()
      if (error) return falla(error.message)
      const b = new Map(data.map(x => [x.id, x.public]))
      const faltan = ['product-images', 'biblioteca'].filter(id => !b.has(id))
      if (faltan.length) return falla(`faltan buckets: ${faltan.join(', ')}`)
      if (b.get('biblioteca')) return falla('el bucket biblioteca es público: los STL quedarían expuestos')
      return ok('product-images (público) · biblioteca (privado)')
    }),

    // ── Pagos ──
    run('pagos', 'Stripe · llave secreta', async () => {
      if (!stripeKey) return falla(`falta la llave secreta de ${stripeTest ? 'prueba' : 'producción'}`)
      const stripe = new Stripe(stripeKey)
      const bal = await stripe.balance.retrieve()
      const mxn = bal.available.find(a => a.currency === 'mxn')
      const modo = stripeKey.startsWith('sk_live') ? 'producción' : 'prueba'
      if (stripeTest !== !stripeKey.startsWith('sk_live')) return aviso(`la llave es de ${modo} pero el panel dice modo ${stripeTest ? 'prueba' : 'producción'}`)
      return stripeTest ? aviso(`funciona, pero la tienda está en MODO PRUEBA: nadie puede pagar de verdad`) : ok(`producción · saldo disponible ${((mxn?.amount ?? 0) / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`)
    }),
    run('pagos', 'Stripe · llave pública', async () => {
      const pk = (stripeTest ? settings?.stripe_pk_test : settings?.stripe_pk_live) || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
      if (!pk) return falla('falta la llave pública: el formulario de tarjeta no carga')
      if (stripeTest === pk.startsWith('pk_live')) return falla('la llave pública no coincide con el modo (prueba/producción)')
      return ok(pk.startsWith('pk_live') ? 'producción' : 'prueba')
    }),
    run('pagos', 'Stripe · webhook', async () => {
      if (!stripeKey) return falla('sin llave secreta no se puede revisar')
      const whSecret = secrets?.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET
      const eps = await new Stripe(stripeKey).webhookEndpoints.list({ limit: 20 })
      const target = `${APP_URL || 'https://compadregallo.com'}/api/stripe/webhook`
      const ep = eps.data.find(e => e.url === target || e.url.endsWith('/api/stripe/webhook'))
      if (!ep) return falla(`Stripe no tiene registrado ${target}: reembolsos y pagos fallidos no se reflejan en los pedidos`)
      const needed = ['payment_intent.succeeded', 'payment_intent.payment_failed', 'charge.refunded']
      const missing = ep.enabled_events.includes('*') ? [] : needed.filter(n => !ep.enabled_events.includes(n))
      if (ep.status !== 'enabled') return falla(`el webhook está ${ep.status}`)
      if (missing.length) return aviso(`faltan eventos: ${missing.join(', ')}`)
      if (!whSecret) return falla('falta el secreto de firma del webhook (whsec_…): se rechazarían todos los avisos de Stripe')
      return ok(ep.url.replace('https://', ''))
    }),

    // ── Correo ──
    run('correo', 'Resend · envío', async () => {
      if (!has('RESEND_API_KEY')) return falla('falta RESEND_API_KEY: no sale ningún correo')
      const from = process.env.RESEND_FROM_EMAIL ?? 'pedidos@compadregallo.com'
      const domain = from.split('@').pop()!.replace('>', '')
      const { data, error } = await new Resend(process.env.RESEND_API_KEY).domains.list()
      if (error) return falla(error.message)
      const list = (data as unknown as { data?: { name: string; status: string }[] })?.data ?? []
      const d = list.find(x => x.name === domain)
      if (!d) return falla(`el dominio ${domain} no está en Resend`)
      if (d.status !== 'verified') return falla(`el dominio ${domain} está "${d.status}", no verificado: los correos pueden caer en spam o rebotar`)
      return ok(`${domain} verificado · remitente ${from}`)
    }),
    run('correo', 'Resend · correos recientes', async () => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
      const { data } = await supabaseAdmin.from('email_logs').select('error, is_test').gte('created_at', since)
      const reales = (data ?? []).filter(r => !r.is_test)
      const errores = reales.filter(r => r.error)
      if (errores.length) return aviso(`${errores.length} de ${reales.length} correos fallaron en 7 días: "${errores[0].error}"`)
      return ok(reales.length ? `${reales.length} enviados en 7 días, sin errores` : 'sin correos en 7 días')
    }),
    run('correo', 'Resend · buzón de soporte (entrada)', async () => {
      if (!has('RESEND_WEBHOOK_SIGNING_SECRET')) return falla('falta RESEND_WEBHOOK_SIGNING_SECRET: los correos a hola@ no entran a /casa/soporte')
      const { data } = await supabaseAdmin.from('support_ticket_messages').select('created_at').eq('direction', 'inbound').order('created_at', { ascending: false }).limit(1)
      const last = data?.[0]?.created_at
      return last ? ok(`último correo recibido: ${last.slice(0, 10)}`) : aviso('configurado, pero nunca ha entrado un correo')
    }),

    // ── Envíos ──
    run('envíos', 'Envia', async () => {
      const c = await getShippingConfig()
      if (!c.auth) return falla(c.missing[0] ?? 'sin llave')
      if (!c.origin) return falla(`origen incompleto: ${c.missing.join(', ')}`)
      const rates = await testQuote({ zip: '06600', state: 'Ciudad de México', city: 'Cuauhtémoc', colonia: 'Juárez' }, { weight_kg: 1, length_cm: 30, width_cm: 20, height_cm: 15 })
      const resumen = `${rates.length} tarifas (${c.carriers.join(', ')}) · modo ${c.auth.mode === 'live' ? 'producción' : 'prueba'}`
      if (!rates.length) return aviso(`responde pero sin tarifas · ${resumen}`)
      if (!c.enabled) return aviso(`funciona, pero está APAGADO en la tienda: el checkout cobra la tarifa fija · ${resumen}`)
      return ok(resumen)
    }),
    run('envíos', 'códigos postales', async () => {
      const r = await fetch('https://nominatim.openstreetmap.org/search?postalcode=72000&country=MX&format=json&limit=1', {
        headers: { 'User-Agent': 'compadregallo.com/1.0 (hola@compadregallo.com)' }, cache: 'no-store',
      })
      if (!r.ok) return falla(`Nominatim respondió ${r.status}`)
      const { count } = await supabaseAdmin.from('postal_codes').select('cp', { count: 'exact', head: true })
      return ok(`Nominatim responde · ${count} CP en caché`)
    }),

    // ── Cuentas y panel ──
    run('cuentas', 'Clerk (inicio de sesión)', async () => {
      const sk = process.env.CLERK_SECRET_KEY ?? ''
      const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
      if (!sk || !pk) return falla('faltan las llaves de Clerk: nadie puede entrar al panel')
      const res = await fetch('https://api.clerk.com/v1/users/count', { headers: { Authorization: `Bearer ${sk}` }, cache: 'no-store' })
      if (!res.ok) return falla(`Clerk respondió ${res.status}`)
      const { total_count } = await res.json()
      if (sk.startsWith('sk_test')) return aviso(`funciona (${total_count} usuarios), pero es una instancia de DESARROLLO: tiene límites y muestra avisos de "development" en el login`)
      return ok(`producción · ${total_count} usuarios`)
    }),
    run('cuentas', 'Clerk · webhook y admins', async () => {
      const faltan = ['CLERK_WEBHOOK_SECRET', 'ADMIN_USER_IDS'].filter(k => !has(k))
      if (faltan.includes('CLERK_WEBHOOK_SECRET')) return aviso('falta CLERK_WEBHOOK_SECRET: los usuarios nuevos no se copian a la base')
      if (faltan.includes('ADMIN_USER_IDS')) return aviso('falta ADMIN_USER_IDS: los admins dependen solo de users.role en la base')
      return ok('webhook y lista de admins configurados')
    }),
    run('panel', 'asistente IA', async () => {
      if (!settings?.ai_chat_enabled) return ok('apagado en configuración')
      return has('ANTHROPIC_API_KEY') ? ok('encendido y con llave') : falla('encendido pero falta ANTHROPIC_API_KEY: el asistente del panel falla')
    }),
    run('panel', 'GitHub (changelog de desarrollo)', async () => {
      const repo = process.env.GITHUB_REPO ?? 'fwyvg5j9gf-coder/compadre-gallo'
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
        cache: 'no-store',
      })
      if (res.status === 404) return falla(`no se ve el repo ${repo}${process.env.GITHUB_TOKEN ? '' : ' (es privado y falta GITHUB_TOKEN)'}`)
      if (!res.ok) return aviso(`GitHub respondió ${res.status}`)
      return process.env.GITHUB_TOKEN ? ok(repo) : aviso(`se ve ${repo} sin token: GitHub limita a 60 consultas por hora`)
    }),
  ])
}
