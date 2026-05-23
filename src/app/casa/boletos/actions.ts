'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdmin } from '@/lib/auth.server'
import { sendTicketConfirmation } from '@/lib/emails'

export async function markTicketUsed(ticketId: string, folioCode: string) {
  await requireAdmin()
  await supabaseAdmin.from('tickets').update({ status: 'used' }).eq('id', ticketId)
  revalidatePath('/casa/boletos')
  revalidatePath(`/boleto/${folioCode}`)
}

export async function markTicketConfirmed(ticketId: string, folioCode: string) {
  await requireAdmin()
  await supabaseAdmin.from('tickets').update({ status: 'confirmed' }).eq('id', ticketId)
  revalidatePath('/casa/boletos')
  revalidatePath(`/boleto/${folioCode}`)
}

export async function resendTicketEmail(ticketId: string) {
  await requireAdmin()

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('folio_code, quantity, unit_price_mxn, total_mxn, customer_name, customer_email, shows(venue, city, date, artist_id)')
    .eq('id', ticketId)
    .single()

  if (!ticket) throw new Error('Ticket not found')

  const show = Array.isArray(ticket.shows) ? ticket.shows[0] : ticket.shows as {
    venue: string; city: string; date: string; artist_id: string
  } | null

  if (!show) throw new Error('Show not found')

  await sendTicketConfirmation({
    customerName: ticket.customer_name ?? 'compadre',
    customerEmail: ticket.customer_email,
    folioCode: ticket.folio_code,
    quantity: ticket.quantity,
    unitPriceMxn: ticket.unit_price_mxn,
    totalMxn: ticket.total_mxn,
    artistId: show.artist_id,
    venue: show.venue,
    city: show.city,
    date: show.date,
  })
}
