import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AdminShell from '@/app/casa/AdminShell'
import MediaLibrary from './MediaLibrary'
import { listAllMedia } from './actions'

export const dynamic = 'force-dynamic'

export default async function MediaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const files = await listAllMedia()

  return (
    <AdminShell crumb="media" crumbHref="/casa/media">
      <MediaLibrary initialFiles={files} />
    </AdminShell>
  )
}
