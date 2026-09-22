import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import { sanitizeEmailHtml } from '@/lib/sanitizeHtml'
import { isAdmin } from '@/lib/auth.server'
import AdminShell from '../AdminShell'
import SoporteClient from './SoporteClient'
import TicketsClient from './TicketsClient'
import { listTickets, type Ticket } from './ticketActions'

export const dynamic = 'force-dynamic'

export default async function SoportePage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  if (!(await isAdmin(userId))) redirect('/cuenta')

  // Buzón con hilo. Si las tablas todavía no existen (la migración
  // 20260922_support_tickets.sql no se ha corrido), cae al buzón plano de
  // siempre en lugar de dejar al equipo sin bandeja.
  let tickets: Ticket[] | null = null
  try {
    tickets = await listTickets()
  } catch (e) {
    console.warn('[soporte] buzón con hilo no disponible, usando el plano:', e)
  }

  if (tickets) {
    const abiertos = tickets.filter(t => t.status === 'open').length
    return (
      <AdminShell
        crumb="soporte"
        crumbHref="/casa"
        right={
          abiertos > 0 ? (
            <span style={{
              background: '#003a87', color: '#fff',
              fontSize: 12, fontWeight: 700,
              padding: '3px 10px', borderRadius: 999,
            }}>
              {abiertos} abierto{abiertos !== 1 ? 's' : ''}
            </span>
          ) : undefined
        }
      >
        <TicketsClient tickets={tickets} />
      </AdminShell>
    )
  }

  const { data: messages } = await supabaseAdmin
    .from('support_messages')
    .select('id, from_email, from_name, to_email, subject, body_text, body_html, status, created_at')
    .order('created_at', { ascending: false })

  // También al leer: los correos que entraron antes de que existiera
  // sanitizeHtml.ts se guardaron con el HTML crudo.
  const msgs = (messages ?? []).map(m => ({
    ...m,
    body_html: sanitizeEmailHtml(m.body_html),
  })) as Parameters<typeof SoporteClient>[0]['messages']
  const unreadCount = msgs.filter(m => m.status === 'unread').length

  return (
    <AdminShell
      crumb="soporte"
      crumbHref="/casa"
      right={
        unreadCount > 0 ? (
          <span style={{
            background: '#003a87', color: '#fff',
            fontSize: 12, fontWeight: 700,
            padding: '3px 10px', borderRadius: 999,
          }}>
            {unreadCount} nuevo{unreadCount !== 1 ? 's' : ''}
          </span>
        ) : undefined
      }
    >
      <SoporteClient messages={msgs} unreadCount={unreadCount} />
    </AdminShell>
  )
}
