import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import type { StoreCategory, StoreSize, StoreSettings, PackagingType } from '@/lib/supabase'
import ConfiguracionAdmin from './ConfiguracionAdmin'

const DEFAULT_SETTINGS: StoreSettings = {
  shipping_local_mxn: 8900, shipping_national_mxn: 14900,
  shipping_intl_mxn: 45000, shipping_free_threshold_mxn: 150000,
  return_policy: '', shipping_policy: '',
  skydropx_enabled: false, skydropx_markup_pct: 0, skydropx_allowed_carriers: [],
  envia_enabled: false, envia_test_mode: true, envia_carriers: ['dhl'], envia_markup_pct: 0, origin_number: '',
  origin_name: 'GALLO', origin_street: '', origin_phone: '', origin_email: '',
  origin_zip: '', origin_state: '', origin_city: '', origin_colonia: '',
  stripe_test_mode: true, stripe_pk_test: '', stripe_sk_test: '',
  stripe_pk_live: '', stripe_sk_live: '', stripe_webhook_secret: '',
  stripe_statement_desc: 'GALLO', stripe_markup_pct: 0,
  ai_chat_enabled: false,
}

export default async function ConfiguracionPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  await requireAdmin()

  const [categories, sizes, packaging, settingsRes, secretsRes] = await Promise.all([
    supabaseAdmin.from('store_categories').select('*').order('sort_order'),
    supabaseAdmin.from('store_sizes').select('*').order('sort_order'),
    supabaseAdmin.from('packaging_types').select('*').order('sort_order'),
    supabaseAdmin.from('store_settings').select('*').eq('id', 1).single(),
    supabaseAdmin.from('store_secrets').select('stripe_sk_test, stripe_sk_live, stripe_webhook_secret, envia_api_key_test, envia_api_key_live').eq('id', 1).single(),
  ])

  // Las llaves de Envia no viajan al navegador: solo sus últimos 4 caracteres.
  const { envia_api_key_test, envia_api_key_live, ...stripeRaw } = (secretsRes.data ?? {}) as Record<string, string | null>
  const last4 = (k: string | null | undefined) => (k && k.length > 8 ? k.slice(-4) : null)
  // Igual con Stripe: la llave secreta (sk_live incluida) y el secreto del
  // webhook ya no viajan al navegador. Se manda una máscara con los últimos
  // caracteres, solo para mostrar cuál está guardada.
  const mask = (k: string | null | undefined) => (k && k.length > 8 ? `••••••••${k.slice(-6)}` : '')
  const stripeSecrets = {
    stripe_sk_test: mask(stripeRaw.stripe_sk_test),
    stripe_sk_live: mask(stripeRaw.stripe_sk_live),
    stripe_webhook_secret: mask(stripeRaw.stripe_webhook_secret),
  }

  const settings = {
    ...(settingsRes.data ?? DEFAULT_SETTINGS),
    ...stripeSecrets,
    envia_key_test_hint: last4(envia_api_key_test),
    envia_key_live_hint: last4(envia_api_key_live),
  } as StoreSettings

  return (
    <ConfiguracionAdmin
      categories={(categories.data ?? []) as StoreCategory[]}
      sizes={(sizes.data ?? []) as StoreSize[]}
      packaging={(packaging.data ?? []) as PackagingType[]}
      settings={settings}
    />
  )
}
