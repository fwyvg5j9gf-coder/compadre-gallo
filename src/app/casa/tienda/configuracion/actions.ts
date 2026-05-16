'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { getShippingRates } from '@/lib/skydropx'
import type { ShippingRate } from '@/lib/skydropx'
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

export async function addPackaging(formData: FormData) {
  await requireAdmin()
  const { data: max } = await supabaseAdmin.from('packaging_types').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const { error } = await supabaseAdmin.from('packaging_types').insert({
    name: (formData.get('name') as string).trim(),
    weight_grams: parseInt(formData.get('weight_grams') as string, 10),
    length_cm: parseFloat(formData.get('length_cm') as string),
    width_cm: parseFloat(formData.get('width_cm') as string),
    height_cm: parseFloat(formData.get('height_cm') as string),
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

// ── SkyDropX ──────────────────────────────────────────────────────────────────

export async function saveSkydropxConfig(formData: FormData) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('store_settings').update({
    skydropx_client_id: (formData.get('client_id') as string).replace(/\s+/g, ''),
    skydropx_client_secret: (formData.get('client_secret') as string).replace(/\s+/g, ''),
    origin_zip: (formData.get('origin_zip') as string).trim(),
    origin_state: (formData.get('origin_state') as string).trim(),
    origin_city: (formData.get('origin_city') as string).trim(),
    origin_colonia: (formData.get('origin_colonia') as string ?? '').trim(),
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
}

export async function toggleSkydropx(enabled: boolean) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('store_settings')
    .update({ skydropx_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
}

export async function testShippingQuote(destZip: string, destState: string, destCity: string, destColonia: string, packagingId: string): Promise<ShippingRate[]> {
  await requireAdmin()

  const [{ data: settings }, { data: pkg }] = await Promise.all([
    supabaseAdmin.from('store_settings').select('skydropx_enabled, skydropx_client_id, skydropx_client_secret, origin_zip, origin_state, origin_city, origin_colonia').eq('id', 1).single(),
    supabaseAdmin.from('packaging_types').select('*').eq('id', packagingId).single(),
  ])

  if (!settings?.skydropx_enabled) throw new Error('activa SkyDropX primero')
  if (!settings.skydropx_client_id) throw new Error('falta la clave de cliente de SkyDropX')
  if (!settings.skydropx_client_secret) throw new Error('falta la clave secreta de SkyDropX')
  if (!settings.origin_zip) throw new Error('falta el CP de origen')
  if (!pkg) throw new Error('embalaje no encontrado')

  return getShippingRates({
    clientId: settings.skydropx_client_id,
    clientSecret: settings.skydropx_client_secret,
    originZip: settings.origin_zip,
    originState: settings.origin_state,
    originCity: settings.origin_city,
    originColonia: settings.origin_colonia ?? '',
    destZip: destZip.trim(),
    destState: destState.trim(),
    destCity: destCity.trim(),
    destColonia: destColonia.trim(),
    parcel: {
      weight_kg: pkg.weight_grams / 1000,
      length_cm: Number(pkg.length_cm),
      width_cm: Number(pkg.width_cm),
      height_cm: Number(pkg.height_cm),
    },
  })
}

// ── Stripe ────────────────────────────────────────────────────────────────────

export async function saveStripeConfig(formData: FormData) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('store_settings').update({
    stripe_test_mode:     formData.get('test_mode') === 'true',
    stripe_pk_test:       (formData.get('pk_test') as string ?? '').trim(),
    stripe_sk_test:       (formData.get('sk_test') as string ?? '').trim(),
    stripe_pk_live:       (formData.get('pk_live') as string ?? '').trim(),
    stripe_sk_live:       (formData.get('sk_live') as string ?? '').trim(),
    stripe_webhook_secret:(formData.get('webhook_secret') as string ?? '').trim(),
    stripe_statement_desc:(formData.get('statement_desc') as string ?? '').trim().slice(0, 22),
    stripe_markup_pct:    parseFloat((formData.get('markup_pct') as string) || '0'),
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
}

export async function saveSkydropxExtra(formData: FormData) {
  await requireAdmin()
  const carriersRaw = (formData.get('allowed_carriers') as string ?? '')
  const carriers = carriersRaw.split(',').map(c => c.trim()).filter(Boolean)
  const { error } = await supabaseAdmin.from('store_settings').update({
    skydropx_markup_pct:       parseFloat((formData.get('markup_pct') as string) || '0'),
    skydropx_allowed_carriers: carriers,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda/configuracion')
}

// ── Envíos manuales ───────────────────────────────────────────────────────────

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
