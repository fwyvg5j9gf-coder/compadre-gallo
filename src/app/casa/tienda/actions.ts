'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'

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

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) throw new Error('no autorizado')
}

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
  await requireAdmin()

  const category = formData.get('category') as string
  const pricePesos = parseFloat(formData.get('price_mxn') as string)
  const weightRaw = formData.get('weight_grams') as string

  const packagingId = (formData.get('packaging_type_id') as string) || null

  const { data, error } = await supabaseAdmin.from('products').insert({
    name: (formData.get('name') as string).trim(),
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

  revalidatePath('/casa/tienda')
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin()

  const category = formData.get('category') as string
  const pricePesos = parseFloat(formData.get('price_mxn') as string)
  const weightRaw = formData.get('weight_grams') as string

  const packagingId = (formData.get('packaging_type_id') as string) || null

  const { error } = await supabaseAdmin.from('products').update({
    name: (formData.get('name') as string).trim(),
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

  revalidatePath('/casa/tienda')
}

export async function togglePublished(id: string, current: boolean) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('products')
    .update({ is_published: !current, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda')
}

export async function deleteProduct(id: string) {
  await requireAdmin()
  // Las variantes se borran en cascada por el FK
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/tienda')
}
