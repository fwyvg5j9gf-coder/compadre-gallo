import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth.server'
import AdminShell from '@/app/casa/AdminShell'
import BibliotecaBoard from './BibliotecaBoard'
import { listProyectos } from './actions'

export const dynamic = 'force-dynamic'

export default async function BibliotecaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  await requireAdmin()

  const proyectos = await listProyectos()

  return (
    <AdminShell crumb="biblioteca" crumbHref="/casa/biblioteca">
      <BibliotecaBoard proyectos={proyectos} />
    </AdminShell>
  )
}
