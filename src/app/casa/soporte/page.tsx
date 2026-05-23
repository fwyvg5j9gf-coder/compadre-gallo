import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import { isAdmin } from '@/lib/auth.server'
import AdminShell from '../AdminShell'
import SoporteClient from './SoporteClient'

export const dynamic = 'force-dynamic'

export default async function SoportePage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  if (!(await isAdmin(userId))) redirect('/cuenta')

  const { data: messages } = await supabaseAdmin
    .from('support_messages')
    .select('id, from_email, from_name, to_email, subject, body_text, body_html, status, created_at')
    .order('created_at', { ascending: false })

  const msgs = (messages ?? []) as Parameters<typeof SoporteClient>[0]['messages']
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
