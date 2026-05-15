import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import type { Block } from '@/lib/blocks'
import AdminShell from '@/app/casa/AdminShell'
import EditorShell from './EditorShell'

export const dynamic = 'force-dynamic'

export default async function EditorPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  const { data } = await supabaseAdmin
    .from('page_blocks')
    .select('*')
    .order('sort_order')

  const blocks = (data ?? []) as Block[]

  return (
    <AdminShell crumb="editor" crumbHref="/casa/editor">
      <EditorShell initialBlocks={blocks} />
    </AdminShell>
  )
}
