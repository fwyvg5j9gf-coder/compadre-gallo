'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { testQuote, type ShippingRate } from '@/lib/shipping.server'
import { requireAdminOrThrow as requireAdmin } from '@/lib/auth.server'

// ── Categorías ────────────────────────────────────────────────────────────────

export async function addCategory(name: string) {
  await requireAdmin()
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
  const { data: max } = await supabaseAdmin.from('store_categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const { error } = await supabaseAdmin.from('store_categories').insert({ name: slug, sort_order: (max?.sort_order ?? -1) + 1 })
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

export async function updateCategory(id: string, name: string) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('store_categories').update({ name: name.trim().toLowerCase().replace(/\s+/g, '-') }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

export async function deleteCategory(id: string) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('store_categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

export async function reorderCategory(id: string, direction: 'up' | 'down') {
  await requireAdmin()
  const { data: all } = await supabaseAdmin.from('store_categories').select('id, sort_order').order('sort_order')
  if (!all) return
  const idx = all.findIndex(c => c.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= all.length) return
  await Promise.all([
    supabaseAdmin.from('store_categories').update({ sort_order: all[swapIdx].sort_order }).eq('id', id),
    supabaseAdmin.from('store_categories').update({ sort_order: all[idx].sort_order }).eq('id', all[swapIdx].id),
  ])
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

// ── Tallas ────────────────────────────────────────────────────────────────────

export async function addSize(name: string) {
  await requireAdmin()
  const { data: max } = await supabaseAdmin.from('store_sizes').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const { error } = await supabaseAdmin.from('store_sizes').insert({ name: name.trim().toUpperCase(), sort_order: (max?.sort_order ?? -1) + 1 })
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

export async function updateSize(id: string, name: string) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('store_sizes').update({ name: name.trim().toUpperCase() }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

export async function deleteSize(id: string) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('store_sizes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

export async function reorderSize(id: string, direction: 'up' | 'down') {
  await requireAdmin()
  const { data: all } = await supabaseAdmin.from('store_sizes').select('id, sort_order').order('sort_order')
  if (!all) return
  const idx = all.findIndex(s => s.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= all.length) return
  await Promise.all([
    supabaseAdmin.from('store_sizes').update({ sort_order: all[swapIdx].sort_order }).eq('id', id),
    supabaseAdmin.from('store_sizes').update({ sort_order: all[idx].sort_order }).eq('id', all[swapIdx].id),
  ])
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

// ── Embalajes ─────────────────────────────────────────────────────────────────

// Los códigos SAT de Carta Porte eran de Skydropx; Envia no los pide. Ya no
// se capturan, pero si un formulario los trae se guardan, y si no, no se borran.
function satFields(formData: FormData) {
  const out: Record<string, string> = {}
  if (formData.has('skydropx_package_type')) out.skydropx_package_type = (formData.get('skydropx_package_type') as string ?? '').trim()
  if (formData.has('consignment_note')) out.consignment_note = (formData.get('consignment_note') as string ?? '').trim()
  return out
}

export async function addPackaging(formData: FormData) {
  await requireAdmin()
  const { data: max } = await supabaseAdmin.from('packaging_types').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const { error } = await supabaseAdmin.from('packaging_types').insert({
    name: (formData.get('name') as string).trim(),
    weight_grams: parseInt(formData.get('weight_grams') as string, 10),
    length_cm: parseFloat(formData.get('length_cm') as string),
    width_cm: parseFloat(formData.get('width_cm') as string),
    height_cm: parseFloat(formData.get('height_cm') as string),
    ...satFields(formData),
    consignment_note: (formData.get('consignment_note') as string ?? 'Merch').trim() || 'Merch',
    sort_order: (max?.sort_order ?? -1) + 1,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

export async function updatePackaging(id: string, formData: FormData) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('packaging_types').update({
    name: (formData.get('name') as string).trim(),
    weight_grams: parseInt(formData.get('weight_grams') as string, 10),
    length_cm: parseFloat(formData.get('length_cm') as string),
    width_cm: parseFloat(formData.get('width_cm') as string),
    height_cm: parseFloat(formData.get('height_cm') as string),
    ...satFields(formData),
    consignment_note: (formData.get('consignment_note') as string ?? 'Merch').trim() || 'Merch',
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

export async function deletePackaging(id: string) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('packaging_types').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

export async function reorderPackaging(id: string, direction: 'up' | 'down') {
  await requireAdmin()
  const { data: all } = await supabaseAdmin.from('packaging_types').select('id, sort_order').order('sort_order')
  if (!all) return
  const idx = all.findIndex(p => p.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= all.length) return
  await Promise.all([
    supabaseAdmin.from('packaging_types').update({ sort_order: all[swapIdx].sort_order }).eq('id', id),
    supabaseAdmin.from('packaging_types').update({ sort_order: all[idx].sort_order }).eq('id', all[swapIdx].id),
  ])
  revalidatePath('/casa/tienda/configuracion')
  revalidatePath('/casa/tienda')
}

// ── Envia ─────────────────────────────────────────────────────────────────────

const CARRIERS_VALIDOS = ['dhl', 'fedex', 'estafeta', 'ups', 'redpack', 'paquetexpress', '99minutos']

export async function saveEnviaConfig(formData: FormData) {
  await requireAdmin()

  // Llaves: un campo vacío conserva la guardada (el panel nunca recibe la
  // llave completa, solo sus últimos 4 caracteres).
  const secrets: Record<string, string> = {}
  const test = ((formData.get('envia_api_key_test') as string) ?? '').replace(/\s+/g, '')
  const live = ((formData.get('envia_api_key_live') as string) ?? '').replace(/\s+/g, '')
  if (test) secrets.envia_api_key_test = test
  if (live) secrets.envia_api_key_live = live
  if (Object.keys(secrets).length) {
    const { error } = await supabaseAdmin.from('store_secrets').update(secrets).eq('id', 1)
    if (error) throw new Error(error.message)
  }

  const carriers = formData.getAll('envia_carriers').map(c => String(c).toLowerCase()).filter(c => CARRIERS_VALIDOS.includes(c))
  const markup = parseFloat((formData.get('envia_markup_pct') as string) || '0')

  const { error } = await supabaseAdmin.from('store_settings').update({
    envia_test_mode: formData.get('envia_mode') !== 'live',
    envia_carriers: carriers.length ? carriers : ['dhl'],
    envia_markup_pct: Number.isFinite(markup) ? Math.min(100, Math.max(0, markup)) : 0,
    origin_name:    (formData.get('origin_name') as string ?? '').trim(),
    origin_street:  (formData.get('origin_street') as string ?? '').trim(),
    origin_number:  (formData.get('origin_number') as string ?? '').trim(),
    origin_phone:   (formData.get('origin_phone') as string ?? '').trim(),
    origin_email:   (formData.get('origin_email') as string ?? '').trim(),
    origin_zip:     (formData.get('origin_zip') as string ?? '').trim(),
    origin_state:   (formData.get('origin_state') as string ?? '').trim(),
    origin_city:    (formData.get('origin_city') as string ?? '').trim(),
    origin_colonia: (formData.get('origin_colonia') as string ?? '').trim(),
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
}

export async function toggleEnvia(enabled: boolean) {
  await requireAdmin()
  await supabaseAdmin.from('store_settings')
    .update({ envia_enabled: enabled, updated_at: new Date().toISOString() }).eq('id', 1)
  revalidatePath('/casa/tienda/configuracion')
}

export async function toggleAiChat(enabled: boolean) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('store_settings')
    .update({ ai_chat_enabled: enabled })
    .eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
}

export async function testShippingQuote(destZip: string, destState: string, destCity: string, destColonia: string, packagingId: string): Promise<ShippingRate[]> {
  await requireAdmin()
  const { data: pkg } = await supabaseAdmin
    .from('packaging_types').select('weight_grams, length_cm, width_cm, height_cm').eq('id', packagingId).single()
  if (!pkg) throw new Error('elige un embalaje')
  return testQuote(
    { zip: destZip, state: destState, city: destCity, colonia: destColonia },
    { weight_kg: Math.max(0.1, pkg.weight_grams / 1000), length_cm: Number(pkg.length_cm), width_cm: Number(pkg.width_cm), height_cm: Number(pkg.height_cm) },
  )
}

export async function saveStripeConfig(formData: FormData) {
  await requireAdmin()
  // Las llaves secretas solo se reemplazan si se escribió una nueva: el panel
  // ya no las recibe completas, así que un campo vacío significa "no tocar".
  const secrets: Record<string, string> = {}
  for (const [field, column] of [['sk_test', 'stripe_sk_test'], ['sk_live', 'stripe_sk_live'], ['webhook_secret', 'stripe_webhook_secret']] as const) {
    const v = ((formData.get(field) as string) ?? '').trim()
    if (v) secrets[column] = v
  }
  const [{ error }, { error: secretsError }] = await Promise.all([
    supabaseAdmin.from('store_settings').update({
      stripe_test_mode:     formData.get('test_mode') === 'true',
      stripe_pk_test:       (formData.get('pk_test') as string ?? '').trim(),
      stripe_pk_live:       (formData.get('pk_live') as string ?? '').trim(),
      stripe_statement_desc:(formData.get('statement_desc') as string ?? '').trim().slice(0, 22),
      stripe_markup_pct:    parseFloat((formData.get('markup_pct') as string) || '0'),
      updated_at: new Date().toISOString(),
    }).eq('id', 1),
    Object.keys(secrets).length
      ? supabaseAdmin.from('store_secrets').update(secrets).eq('id', 1)
      : Promise.resolve({ error: null }),
  ])
  if (error) throw new Error(error.message)
  if (secretsError) throw new Error(secretsError.message)
  revalidatePath('/casa/tienda/configuracion')
}

export async function saveShipping(formData: FormData) {
  await requireAdmin()
  const toC = (v: string) => Math.round(parseFloat(v) * 100)
  const { error } = await supabaseAdmin.from('store_settings').update({
    shipping_local_mxn: toC(formData.get('shipping_local') as string),
    shipping_national_mxn: toC(formData.get('shipping_national') as string),
    shipping_intl_mxn: toC(formData.get('shipping_intl') as string),
    shipping_free_threshold_mxn: toC(formData.get('shipping_free_threshold') as string),
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
}

// ── Políticas ─────────────────────────────────────────────────────────────────

export async function savePolicies(formData: FormData) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('store_settings').update({
    return_policy: (formData.get('return_policy') as string).trim(),
    shipping_policy: (formData.get('shipping_policy') as string).trim(),
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
}
