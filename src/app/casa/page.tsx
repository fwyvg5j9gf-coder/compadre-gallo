import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin, getLinkedArtist } from '@/lib/auth.server'
import CasaDashboard from './CasaDashboard'

export default async function CasaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  // Artistas go directly to their profile — they have no dashboard access
  if (!(await isAdmin(userId))) {
    const linked = await getLinkedArtist(userId)
    if (linked) redirect(`/casa/artistas/${linked.id}`)
    redirect('/casa/login')
  }

  const user = await currentUser()

  return (
    <CasaDashboard
      email={user?.emailAddresses[0]?.emailAddress ?? ''}
      firstName={user?.firstName ?? 'admin'}
    />
  )
}
