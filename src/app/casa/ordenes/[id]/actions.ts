'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'

const VALID_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'refunded', 'failed'] as const

export async function updateOrderStatus(orderId: string, status: string) {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  if (!(VALID_STATUSES as readonly string[]).includes(status)) throw new Error('estado inválido')

  await supabaseAdmin.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId)
  revalidatePath(`/casa/ordenes/${orderId}`)
  revalidatePath('/casa/ordenes')
}

export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  await supabaseAdmin
    .from('orders')
    .update({ tracking_number: trackingNumber.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  revalidatePath(`/casa/ordenes/${orderId}`)
}
