import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import BoletoClient from './BoletoClient'

export const dynamic = 'force-dynamic'

export default async function BoletoPage({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('id, folio_code, status, quantity, unit_price_mxn, total_mxn, customer_name, customer_email, created_at, shows(venue, city, date, artists(name, slug, bg_color, stripe_color, image_url))')
    .eq('folio_code', folio.toUpperCase())
    .single()

  if (!ticket) notFound()

  const { userId } = await auth()
  let isAdmin = false
  if (userId) {
    const { data: user } = await supabaseAdmin
      .from('users').select('role').eq('clerk_user_id', userId).single()
    isAdmin = user?.role === 'admin'
  }

  return <BoletoClient ticket={ticket as unknown as Parameters<typeof BoletoClient>[0]['ticket']} isAdmin={isAdmin} />
}
