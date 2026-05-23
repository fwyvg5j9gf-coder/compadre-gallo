'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdmin } from '@/lib/auth.server'

const getResend = () => new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'hola@compadregallo.com'

export async function replyToMessage(messageId: string, replyText: string) {
  await requireAdmin()

  const { data: msg } = await supabaseAdmin
    .from('support_messages')
    .select('from_email, from_name, subject, message_id')
    .eq('id', messageId)
    .single()

  if (!msg) throw new Error('Message not found')

  const subject = msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject ?? '(sin asunto)'}`

  const headers: Record<string, string> = {}
  if (msg.message_id) {
    headers['In-Reply-To'] = msg.message_id
    headers['References']  = msg.message_id
  }

  const { data } = await getResend().emails.send({
    from: FROM,
    to: msg.from_email,
    subject,
    text: replyText,
    headers,
  })

  await supabaseAdmin.from('support_messages').update({
    status: 'replied',
    replied_at: new Date().toISOString(),
    reply_resend_id: data?.id ?? null,
  }).eq('id', messageId)

  revalidatePath('/casa/soporte')
}

export async function markMessageStatus(messageId: string, status: 'read' | 'resolved') {
  await requireAdmin()
  await supabaseAdmin.from('support_messages').update({ status }).eq('id', messageId)
  revalidatePath('/casa/soporte')
}
