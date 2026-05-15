import { supabaseAdmin } from '@/lib/supabase.server'
import type { Block } from '@/lib/blocks'
import BlockRenderer from '@/components/BlockRenderer'

export const revalidate = 60

export default async function HomePage() {
  const { data } = await supabaseAdmin
    .from('page_blocks')
    .select('*')
    .eq('page_key', 'home')
    .eq('visible', true)
    .order('sort_order')

  const blocks = (data ?? []) as Block[]

  return (
    <>
      {blocks.map(b => <BlockRenderer key={b.id} block={b} />)}
    </>
  )
}
