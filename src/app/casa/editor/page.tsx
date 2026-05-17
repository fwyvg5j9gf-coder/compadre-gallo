import { auth } from '@clerk/nextjs/server'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'
import type { Block, NavSettings, FooterSettings } from '@/lib/blocks'
import { DEFAULT_NAV_LINKS, DEFAULT_FOOTER } from '@/lib/blocks'
import AdminShell from '@/app/casa/AdminShell'
import EditorShell from './EditorShell'

export const dynamic = 'force-dynamic'

export default async function EditorPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')

  await (await draftMode()).enable()

  const [blocksRes, settingsRes] = await Promise.all([
    supabaseAdmin.from('page_blocks').select('*').order('sort_order'),
    supabaseAdmin.from('site_settings').select('key, value'),
  ])

  const blocks = (blocksRes.data ?? []) as Block[]

  const rawSettings = Object.fromEntries(
    (settingsRes.data ?? []).map(s => [s.key, s.value])
  )
  const navSettings:    NavSettings    = (rawSettings.nav    as NavSettings)    ?? { links: DEFAULT_NAV_LINKS }
  const footerSettings: FooterSettings = (rawSettings.footer as FooterSettings) ?? DEFAULT_FOOTER

  return (
    <AdminShell crumb="editor" crumbHref="/casa/editor">
      <EditorShell
        initialBlocks={blocks}
        navSettings={navSettings}
        footerSettings={footerSettings}
      />
    </AdminShell>
  )
}
