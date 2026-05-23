import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { supabaseAdmin } from '@/lib/supabase.server'

export async function POST(req: NextRequest) {
  const body = await req.text()

  // Verify Svix signature
  const svixId        = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'missing svix headers' }, { status: 400 })
  }

  let event: { type: string; data: { email_id: string } }
  try {
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SIGNING_SECRET!)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof event
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true })
  }

  const emailId = event.data.email_id

  // Idempotency — skip if already processed
  const { data: existing } = await supabaseAdmin
    .from('support_messages')
    .select('id')
    .eq('resend_email_id', emailId)
    .single()

  if (existing) return NextResponse.json({ ok: true })

  // Fetch full email content from Resend
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  })

  if (!res.ok) {
    console.error('Failed to fetch received email:', res.status, await res.text())
    return NextResponse.json({ error: 'could not fetch email' }, { status: 500 })
  }

  type ReceivedEmail = {
    id: string
    message_id: string | null
    from: string
    to: string[]
    subject: string | null
    html: string | null
    text: string | null
  }
  const email: ReceivedEmail = await res.json()

  // Parse display name from "Name <email>" format
  const fromMatch = email.from.match(/^(.*?)\s*<(.+)>$/)
  const fromName  = fromMatch ? fromMatch[1].trim() || null : null
  const fromEmail = fromMatch ? fromMatch[2] : email.from

  await supabaseAdmin.from('support_messages').insert({
    resend_email_id: email.id,
    message_id:  email.message_id,
    from_email:  fromEmail,
    from_name:   fromName,
    to_email:    email.to?.[0] ?? null,
    subject:     email.subject,
    body_html:   email.html,
    body_text:   email.text,
    status:      'unread',
  })

  return NextResponse.json({ ok: true })
}
