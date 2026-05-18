'use server'

import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) throw new Error('no autorizado')
}

export type DiscountCode = {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_order_mxn: number
  max_uses: number | null
  uses_count: number
  active: boolean
  expires_at: string | null
  created_at: string
}

export async function createDiscountCode(fd: FormData) {
  await requireAdmin()
  const code  = (fd.get('code') as string).trim().toUpperCase()
  const type  = fd.get('type') as 'percent' | 'fixed'
  const value = parseInt(fd.get('value') as string)
  const minOrder = parseInt((fd.get('min_order_mxn') as string) || '0')
  const maxUses  = fd.get('max_uses') ? parseInt(fd.get('max_uses') as string) : null
  const expiresAt = fd.get('expires_at') ? new Date(fd.get('expires_at') as string).toISOString() : null

  if (!code || isNaN(value) || value <= 0) throw new Error('datos inválidos')
  if (type === 'percent' && value > 100) throw new Error('descuento máximo 100%')

  const { error } = await supabaseAdmin.from('discount_codes').insert({
    code, type, value, min_order_mxn: minOrder, max_uses: maxUses, expires_at: expiresAt,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/casa/descuentos')
}

export async function toggleDiscountCode(id: string, active: boolean) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('discount_codes').update({ active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/descuentos')
}

export async function deleteDiscountCode(id: string) {
  await requireAdmin()
  const { error } = await supabaseAdmin.from('discount_codes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/descuentos')
}

// Validates a code for a given order total (cents). Returns discount amount in cents or error.
export async function validateDiscountCode(
  code: string,
  orderTotalMxn: number,
): Promise<{ ok: true; discountMxn: number; label: string; codeId: string } | { ok: false; error: string }> {
  const { data } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('active', true)
    .single()

  if (!data) return { ok: false, error: 'código inválido o inactivo' }

  if (data.expires_at && new Date(data.expires_at) < new Date())
    return { ok: false, error: 'código expirado' }

  if (data.max_uses !== null && data.uses_count >= data.max_uses)
    return { ok: false, error: 'código agotado' }

  if (orderTotalMxn < data.min_order_mxn)
    return { ok: false, error: `mínimo de compra: $${(data.min_order_mxn / 100).toFixed(0)}` }

  const discountMxn = data.type === 'percent'
    ? Math.round(orderTotalMxn * data.value / 100)
    : Math.min(data.value, orderTotalMxn)

  const label = data.type === 'percent' ? `${data.value}% off` : `-$${(data.value / 100).toFixed(0)}`

  return { ok: true, discountMxn, label, codeId: data.id }
}
