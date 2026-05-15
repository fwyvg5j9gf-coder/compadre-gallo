import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import CasaDashboard from './CasaDashboard'

export default async function CasaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const user = await currentUser()

  return (
    <CasaDashboard
      email={user?.emailAddresses[0]?.emailAddress ?? ''}
      firstName={user?.firstName ?? 'diego'}
    />
  )
}
