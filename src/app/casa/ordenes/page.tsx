import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '../AdminShell'
import SkydropxBalanceBadge from './SkydropxBalanceBadge'
import OrdenesClient from './OrdenesClient'

export const dynamic = 'force-dynamic'

export default async function OrdenesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, folio_number, customer_name, customer_email, total_mxn, status, created_at, is_test, order_items(product_name, quantity)')
    .order('folio_number', { ascending: false })

  return (
    <AdminShell
      crumb="órdenes"
      crumbHref="/casa"
      right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SkydropxBalanceBadge />
          <a href="/api/export-orders" style={{
            fontSize: 12, fontWeight: 700, color: '#f0efe9',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 4, padding: '5px 12px', textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}>
            exportar CSV
          </a>
          <Link href="/casa/ordenes/nuevo" style={{
            fontSize: 12, fontWeight: 700, color: '#0a0a0a',
            background: '#ffe200', border: '1px solid rgba(255,226,0,0.5)',
            borderRadius: 4, padding: '5px 12px', textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}>
            + nueva orden
          </Link>
        </div>
      }
    >
      <main style={{ maxWidth: 1200, margin: '0 auto' }} className="adm-main-pad">
        <OrdenesClient orders={(orders ?? []) as Parameters<typeof OrdenesClient>[0]['orders']} />
      </main>
    </AdminShell>
  )
}
