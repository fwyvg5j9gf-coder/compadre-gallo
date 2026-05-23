import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase.server'
import { isAdmin } from '@/lib/auth.server'
import AdminShell from '../AdminShell'
import BoletosClient from './BoletosClient'

export const dynamic = 'force-dynamic'

export default async function BoletosPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  if (!(await isAdmin(userId))) redirect('/cuenta')

  const { data: raw } = await supabaseAdmin
    .from('tickets')
    .select('id, folio_code, status, quantity, unit_price_mxn, total_mxn, customer_name, customer_email, created_at, shows(venue, city, date, artist_id, artists(name, bg_color, stripe_color))')
    .order('created_at', { ascending: false })

  type RawTicket = {
    id: string; folio_code: string; status: string; quantity: number
    unit_price_mxn: number; total_mxn: number; customer_name: string | null
    customer_email: string; created_at: string
    shows: {
      venue: string; city: string; date: string; artist_id: string
      artists: { name: string; bg_color: string; stripe_color: string }[] | { name: string; bg_color: string; stripe_color: string } | null
    }[] | {
      venue: string; city: string; date: string; artist_id: string
      artists: { name: string; bg_color: string; stripe_color: string }[] | { name: string; bg_color: string; stripe_color: string } | null
    } | null
  }

  const tickets = ((raw ?? []) as unknown as RawTicket[]).map(t => {
    const show = Array.isArray(t.shows) ? t.shows[0] : t.shows
    const artist = show ? (Array.isArray(show.artists) ? show.artists[0] : show.artists) : null
    return {
      ...t,
      shows: show ? { ...show, artists: artist ?? null } : null,
    }
  })

  const confirmed = tickets.filter(t => t.status === 'confirmed').length
  const used = tickets.filter(t => t.status === 'used').length
  const revenue = tickets
    .filter(t => t.status === 'confirmed' || t.status === 'used')
    .reduce((s, t) => s + t.total_mxn, 0)

  return (
    <AdminShell
      crumb="boletos"
      crumbHref="/casa"
      right={
        <Link
          href="/casa/scanner"
          style={{
            fontSize: 12, fontWeight: 700, color: '#0a0a0a',
            background: '#ffe200', border: '1px solid rgba(255,226,0,0.5)',
            borderRadius: 4, padding: '5px 12px', textDecoration: 'none',
          }}
        >
          escanear →
        </Link>
      }
    >
      <BoletosClient
        tickets={tickets}
        stats={{ total: tickets.length, confirmed, used, revenue }}
      />
    </AdminShell>
  )
}
