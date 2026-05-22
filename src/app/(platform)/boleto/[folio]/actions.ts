'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdmin } from '@/lib/auth.server'

export async function markTicketUsed(ticketId: string, folioCode: string) {
  await requireAdmin()
  await supabaseAdmin
    .from('tickets')
    .update({ status: 'used' })
    .eq('id', ticketId)
  revalidatePath(`/boleto/${folioCode}`)
}

export async function markTicketConfirmed(ticketId: string, folioCode: string) {
  await requireAdmin()
  await supabaseAdmin
    .from('tickets')
    .update({ status: 'confirmed' })
    .eq('id', ticketId)
  revalidatePath(`/boleto/${folioCode}`)
}
