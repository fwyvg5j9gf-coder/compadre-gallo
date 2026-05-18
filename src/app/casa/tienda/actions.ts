'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdminOrThrow, requireAdminUserId } from '@/lib/auth.server'
import { logAction } from '@/lib/audit.server'

export async function getUploadUrl(filename: string, contentType: string) {
  await requireAdmin()

  const ext = filename.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from('product-images')
    .createSignedUploadUrl(path)

  if (error) throw new Error(error.message)

  const publicUrl = supabaseAdmin.storage
    .from('product-images')
    .getPublicUrl(path).data.publicUrl

  return { signedUrl: data.signedUrl, publicUrl }
}

const requireAdmin = requireAdminOrThrow

function extractVariants(formData: FormData, productId: string) {
  const enabledStr = (formData.get('enabled_sizes') as string) ?? ''
  const sizes = enabledStr.split(',').filter(Boolean)

  if (sizes.length > 0) {
    return sizes.map(size => ({
      product_id: productId,
      size,
      stock: parseInt((formData.get(`stock_${size}`) as string) || '0', 10),
    }))
  }

  return [{
    product_id: productId,
    size: 'única',
    stock: parseInt((formData.get('stock_unica') as string) || '0', 10),
  }]
}

export async function createProduct(formData: FormData) {
  const userId = await requireAdminUserId()

  const category = formData.get('category') as string
  const pricePesos = parseFloat(formData.get('price_mxn') as string)
  const weightRaw = formData.get('weight_grams') as string
  const name = (formData.get('name') as string).trim()
  const packagingId = (formData.get('packaging_type_id') as string) || null

  const { data, error } = await supabaseAdmin.from('products').insert({
    name,
    description: (formData.get('description') as string)?.trim() || null,
    price_mxn: Math.round(pricePesos * 100),
    weight_grams: weightRaw ? parseInt(weightRaw, 10) : null,
    category,
    packaging_type_id: packagingId,
    image_url: (formData.get('image_url') as string)?.trim() || null,
    is_published: false,
  }).select('id').single()

  if (error) throw new Error(error.message)

  const variants = extractVariants(formData, data.id)
  const { error: vErr } = await supabaseAdmin.from('product_variants').insert(variants)
  if (vErr) throw new Error(vErr.message)

  logAction({ userId, action: 'create', tableName: 'products', recordId: data.id, summary: `creó producto "${name}"` })
  revalidatePath('/casa/tienda')
}

export async function updateProduct(id: string, formData: FormData) {
  const userId = await requireAdminUserId()

  const category = formData.get('category') as string
  const pricePesos = parseFloat(formData.get('price_mxn') as string)
  const weightRaw = formData.get('weight_grams') as string
  const name = (formData.get('name') as string).trim()

  const packagingId = (formData.get('packaging_type_id') as string) || null

  const { error } = await supabaseAdmin.from('products').update({
    name,
    description: (formData.get('description') as string)?.trim() || null,
    price_mxn: Math.round(pricePesos * 100),
    weight_grams: weightRaw ? parseInt(weightRaw, 10) : null,
    category,
    packaging_type_id: packagingId,
    image_url: (formData.get('image_url') as string)?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) throw new Error(error.message)

  // Upsert variantes (actualiza stock sin perder datos)
  const variants = extractVariants(formData, id)
  const { error: vErr } = await supabaseAdmin
    .from('product_variants')
    .upsert(variants, { onConflict: 'product_id,size' })
  if (vErr) throw new Error(vErr.message)

  // Si cambió la categoría de ropa a no-ropa o viceversa, limpiar variantes que ya no aplican
  const { data: existing } = await supabaseAdmin
    .from('product_variants')
    .select('size')
    .eq('product_id', id)

  const keepSizes = new Set(variants.map(v => v.size))
  const toDelete = (existing ?? []).filter(v => !keepSizes.has(v.size)).map(v => v.size)
  if (toDelete.length > 0) {
    await supabaseAdmin.from('product_variants')
      .delete()
      .eq('product_id', id)
      .in('size', toDelete)
  }

  logAction({ userId, action: 'update', tableName: 'products', recordId: id, summary: `actualizó producto "${name}"` })
  revalidatePath('/casa/tienda')
}

export async function togglePublished(id: string, current: boolean) {
  const userId = await requireAdminUserId()
  const { error } = await supabaseAdmin.from('products')
    .update({ is_published: !current, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  logAction({ userId, action: current ? 'unpublish' : 'publish', tableName: 'products', recordId: id, summary: `${current ? 'quitó publicación' : 'publicó'} producto` })
  revalidatePath('/casa/tienda')
}

export async function deleteProduct(id: string) {
  const userId = await requireAdminUserId()
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  logAction({ userId, action: 'delete', tableName: 'products', recordId: id, summary: `eliminó producto` })
  revalidatePath('/casa/tienda')
}

export async function bulkPublish(ids: string[], publish: boolean) {
  const userId = await requireAdminUserId()
  const { error } = await supabaseAdmin.from('products')
    .update({ is_published: publish, updated_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw new Error(error.message)
  logAction({ userId, action: publish ? 'bulk_publish' : 'bulk_unpublish', tableName: 'products', summary: `${publish ? 'publicó' : 'despublicó'} ${ids.length} productos en masa` })
  revalidatePath('/casa/tienda')
}

export async function bulkDelete(ids: string[]) {
  const userId = await requireAdminUserId()
  const { error } = await supabaseAdmin.from('products').delete().in('id', ids)
  if (error) throw new Error(error.message)
  logAction({ userId, action: 'bulk_delete', tableName: 'products', summary: `eliminó ${ids.length} productos en masa` })
  revalidatePath('/casa/tienda')
}
