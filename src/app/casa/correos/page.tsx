import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '../AdminShell'
import CorreosClient from './CorreosClient'

export default async function CorreosPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const { data: logs } = await supabaseAdmin
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <AdminShell crumb="correos" crumbHref="/casa">
      <CorreosClient logs={logs ?? []} />
    </AdminShell>
  )
}
