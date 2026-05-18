import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '@/app/casa/AdminShell'
import DescuentosClient from './DescuentosClient'
import type { DiscountCode } from './actions'

export const dynamic = 'force-dynamic'

export default async function DescuentosPage() {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')
  if (!(await isAdmin(userId))) redirect('/casa')

  const { data } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <AdminShell crumb="descuentos" crumbHref="/casa/descuentos">
      <DescuentosClient codes={(data ?? []) as DiscountCode[]} />
    </AdminShell>
  )
}
