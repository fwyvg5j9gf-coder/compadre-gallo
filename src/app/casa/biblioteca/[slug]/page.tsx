import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth.server'
import AdminShell from '@/app/casa/AdminShell'
import ProyectoDetail from './ProyectoDetail'
import { getProyecto } from '../actions'

export const dynamic = 'force-dynamic'

export default async function ProyectoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  await requireAdmin()

  const { slug } = await params
  const data = await getProyecto(slug)
  if (!data) notFound()

  return (
    <AdminShell crumb="biblioteca" crumbHref="/casa/biblioteca">
      <ProyectoDetail {...data} />
    </AdminShell>
  )
}
