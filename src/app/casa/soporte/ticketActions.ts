'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdminOrThrow } from '@/lib/auth.server'
import { sanitizeEmailHtml } from '@/lib/sanitizeHtml'

// Buzón con hilo. Convive con actions.ts (la tabla plana) hasta que el hilo
// lleve un tiempo en pie; ver supabase/migrations/20260922_support_tickets.sql.

const getResend = () => new Resend(process.env.RESEND_API_KEY)
// ayuda@ es el canal de contacto con clientes; ventas@ solo manda
// notificaciones automáticas. Una respuesta de soporte sale de hola@.
const FROM = process.env.RESEND_FROM_EMAIL ?? 'hola@compadregallo.com'

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed'

export type TicketMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  sender_email: string
  sender_name: string | null
  body_html: string | null
  body_text: string | null
  created_at: string
}

export type Ticket = {
  id: string
  customer_email: string
  customer_name: string | null
  subject: string
  status: TicketStatus
  inbox: string
  last_activity_at: string
  messages: TicketMessage[]
}

export async function listTickets(): Promise<Ticket[]> {
  await requireAdminOrThrow()

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('id, customer_email, customer_name, subject, status, inbox, last_activity_at, support_ticket_messages(id, direction, sender_email, sender_name, body_html, body_text, created_at)')
    .order('last_activity_at', { ascending: false })
    .limit(200)

  // supabase-js no lanza cuando la tabla no existe: devuelve el error aquí.
  // Hay que propagarlo para que la página pueda caer al buzón plano en lugar
  // de mostrar una bandeja vacía y hacer creer que no hay correos.
  if (error) throw new Error(`support_tickets no disponible: ${error.message}`)

  return (data ?? []).map(t => {
    const raw = (t.support_ticket_messages ?? []) as TicketMessage[]
    return {
      ...t,
      // También al leer: los mensajes que entraron antes de sanitizeHtml.ts
      // se guardaron con el HTML crudo.
      messages: raw
        .map(m => ({ ...m, body_html: sanitizeEmailHtml(m.body_html) }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }
  }) as Ticket[]
}

export async function replyToTicket(ticketId: string, replyText: string) {
  await requireAdminOrThrow()

  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('id, customer_email, subject')
    .eq('id', ticketId)
    .single()

  if (!ticket) throw new Error('ticket no encontrado')

  // Se responde al último mensaje del cliente para que el hilo quede bien
  // encadenado en su cliente de correo.
  const { data: lastInbound } = await supabaseAdmin
    .from('support_ticket_messages')
    .select('message_id')
    .eq('ticket_id', ticketId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const subject = ticket.subject?.startsWith('Re:') ? ticket.subject : `Re: ${ticket.subject ?? '(sin asunto)'}`

  const headers: Record<string, string> = {}
  if (lastInbound?.message_id) {
    headers['In-Reply-To'] = lastInbound.message_id
    headers['References'] = lastInbound.message_id
  }

  const { data: sent, error } = await getResend().emails.send({
    from: FROM,
    to: ticket.customer_email,
    subject,
    text: replyText,
    headers,
  })

  if (error) throw new Error(error.message ?? 'no se pudo enviar la respuesta')

  const now = new Date().toISOString()

  await supabaseAdmin.from('support_ticket_messages').insert({
    ticket_id: ticketId,
    direction: 'outbound',
    sender_email: FROM,
    sender_name: 'gallo',
    subject,
    body_text: replyText,
    resend_email_id: sent?.id ?? null,
  })

  // Responder deja el ticket 'pending': ya contestamos, falta ver si el
  // cliente vuelve. Cerrarlo es una decisión aparte y explícita.
  await supabaseAdmin
    .from('support_tickets')
    .update({ status: 'pending', last_activity_at: now, updated_at: now })
    .eq('id', ticketId)

  revalidatePath('/casa/soporte')
}

export async function setTicketStatus(ticketId: string, status: TicketStatus) {
  await requireAdminOrThrow()
  await supabaseAdmin
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
  revalidatePath('/casa/soporte')
}
