import { Webhook } from 'svix'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const svixId        = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'headers svix faltantes' }, { status: 400 })
  }

  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'webhook secret no configurado' }, { status: 500 })

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = new Webhook(secret).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof event
  } catch {
    return NextResponse.json({ error: 'firma inválida' }, { status: 400 })
  }

  if (event.type === 'user.created') {
    const emails = event.data.email_addresses as { email_address: string }[] | undefined
    const email = emails?.[0]?.email_address
    const firstName = event.data.first_name as string | null
    const lastName  = event.data.last_name  as string | null
    const name = firstName ? `${firstName} ${lastName ?? ''}`.trim() : null

    if (email) {
      const { sendWelcomeEmail } = await import('@/lib/emails')
      sendWelcomeEmail(email, name).catch(console.error)
    }
  }

  return NextResponse.json({ received: true })
}
