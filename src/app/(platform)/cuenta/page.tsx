import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import CuentaClient from './CuentaClient'

export default async function CuentaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')

  const [user, ordersResult] = await Promise.all([
    currentUser(),
    supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('folio_number', { ascending: false }),
  ])

  return (
    <CuentaClient
      orders={ordersResult.data ?? []}
      firstName={user?.firstName ?? 'compadre'}
      email={user?.emailAddresses[0]?.emailAddress ?? ''}
    />
  )
}
