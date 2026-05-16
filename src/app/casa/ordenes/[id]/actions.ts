'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdmin } from '@/lib/auth.server'

const VALID_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'refunded', 'failed'] as const

export async function updateOrderStatus(orderId: string, status: string) {
  await requireAdmin()
  if (!(VALID_STATUSES as readonly string[]).includes(status)) throw new Error('estado inválido')

  await supabaseAdmin.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId)
  revalidatePath(`/casa/ordenes/${orderId}`)
  revalidatePath('/casa/ordenes')
}

export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
  await requireAdmin()

  await supabaseAdmin
    .from('orders')
    .update({ tracking_number: trackingNumber.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  revalidatePath(`/casa/ordenes/${orderId}`)
}
