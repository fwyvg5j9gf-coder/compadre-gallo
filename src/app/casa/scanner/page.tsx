import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth.server'
import ScannerClient from './ScannerClient'

export const dynamic = 'force-dynamic'

export default async function ScannerPage() {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')
  if (!(await isAdmin(userId))) redirect('/cuenta')

  return <ScannerClient />
}
