import { requireAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '../AdminShell'
import UsuariosAdmin from './UsuariosAdmin'

export default async function UsuariosPage() {
  await requireAdmin()

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, clerk_user_id, email, name, role, created_at')
    .order('created_at', { ascending: false })

  return (
    <AdminShell crumb="usuarios">
      <UsuariosAdmin users={users ?? []} />
    </AdminShell>
  )
}
