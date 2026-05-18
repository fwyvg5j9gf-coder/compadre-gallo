'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdminUserId } from '@/lib/auth.server'

export type Movement = {
  id: string
  type: string
  qty_change: number
  qty_before: number | null
  qty_after: number | null
  reason: string | null
  reference_id: string | null
  user_id: string | null
  created_at: string
}

// ── Ajustar stock de una variante ────────────────────────────────────────────
export async function adjustVariantStock(
  variantId: string,
  newQty: number,
  reason: string,
  type: 'adjustment' | 'restock' | 'correction' | 'return' = 'adjustment',
): Promise<{ error?: string }> {
  try {
    const userId = await requireAdminUserId()
    const { error } = await supabaseAdmin.rpc('adjust_stock', {
      p_variant_id:   variantId,
      p_new_qty:      Math.max(0, newQty),
      p_type:         type,
      p_reason:       reason.trim() || 'ajuste manual',
      p_user_id:      userId,
      p_reference_id: null,
    })
    if (error) return { error: error.message }
    revalidatePath('/casa/inventario')
    revalidatePath('/casa/tienda')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error al ajustar stock' }
  }
}

// ── Actualizar reorder_point de una variante ─────────────────────────────────
export async function updateReorderPoint(
  variantId: string,
  reorderPoint: number,
): Promise<{ error?: string }> {
  try {
    await requireAdminUserId()
    const { error } = await supabaseAdmin
      .from('product_variants')
      .update({ reorder_point: Math.max(0, reorderPoint) })
      .eq('id', variantId)
    if (error) return { error: error.message }
    revalidatePath('/casa/inventario')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error' }
  }
}

// ── Actualizar SKU de un producto ────────────────────────────────────────────
export async function updateProductSku(
  productId: string,
  sku: string,
): Promise<{ error?: string }> {
  try {
    await requireAdminUserId()
    const clean = sku.trim().toUpperCase() || null
    const { error } = await supabaseAdmin
      .from('products')
      .update({ sku: clean })
      .eq('id', productId)
    if (error) return { error: error.message }
    revalidatePath('/casa/inventario')
    revalidatePath('/casa/tienda')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error' }
  }
}

// ── Actualizar SKU de una variante ───────────────────────────────────────────
export async function updateVariantSku(
  variantId: string,
  sku: string,
): Promise<{ error?: string }> {
  try {
    await requireAdminUserId()
    const clean = sku.trim().toUpperCase() || null
    const { error } = await supabaseAdmin
      .from('product_variants')
      .update({ sku: clean })
      .eq('id', variantId)
    if (error) return { error: error.message }
    revalidatePath('/casa/inventario')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error' }
  }
}

// ── Historial de movimientos de una variante ─────────────────────────────────
export async function getVariantMovements(
  variantId: string,
  limit = 30,
): Promise<{ data?: Movement[]; error?: string }> {
  try {
    await requireAdminUserId()
    const { data, error } = await supabaseAdmin
      .from('inventory_movements')
      .select('id, type, qty_change, qty_before, qty_after, reason, reference_id, user_id, created_at')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return { error: error.message }
    return { data: data ?? [] }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'error' }
  }
}

// ── Resumen global para el dashboard ─────────────────────────────────────────
export async function getInventorySummary() {
  const { data } = await supabaseAdmin
    .from('product_variants')
    .select('stock, reorder_point, products!inner(is_published)')
    .eq('products.is_published', true)
  const variants = data ?? []
  return {
    total:    variants.length,
    outOf:    variants.filter(v => v.stock === 0).length,
    low:      variants.filter(v => v.stock > 0 && v.stock <= (v.reorder_point || 5)).length,
  }
}
