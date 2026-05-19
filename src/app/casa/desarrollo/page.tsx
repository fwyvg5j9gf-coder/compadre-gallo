import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import DesarrolloPanel from './DesarrolloPanel'

export default async function DesarrolloPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  return <DesarrolloPanel />
}
