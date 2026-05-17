import { draftMode } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase.server'
import type { Block } from '@/lib/blocks'
import BlockRenderer from '@/components/BlockRenderer'
import LandingHero from '@/components/LandingHero'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { isEnabled: isDraft } = await draftMode()

  const { data } = await supabaseAdmin
    .from('page_blocks')
    .select('*')
    .eq('page_key', 'home')
    .eq('visible', true)
    .order('sort_order')

  const blocks = (data ?? []).map((b: Block) => ({
    ...b,
    content: isDraft && b.draft_content ? b.draft_content : b.content,
  })) as Block[]

  // Unified full-screen landing when the page starts with hero-mascot + cta-split
  const heroIdx = blocks.findIndex(b => b.type === 'hero-mascot')
  const ctaIdx  = blocks.findIndex(b => b.type === 'cta-split')

  if (heroIdx !== -1 && ctaIdx !== -1) {
    const h = blocks[heroIdx].content
    const c = blocks[ctaIdx].content
    const rest = blocks.filter(b => b.type !== 'hero-mascot' && b.type !== 'cta-split')

    return (
      <>
        <LandingHero
          tagline={h.tagline}
          leftTitle={c.left_title}   leftSubtitle={c.left_subtitle}
          leftCta={c.left_cta}       leftLink={c.left_link}   leftBg={c.left_bg}
          rightTitle={c.right_title} rightSubtitle={c.right_subtitle}
          rightCta={c.right_cta}     rightLink={c.right_link} rightBg={c.right_bg}
        />
        {rest.map(b => <BlockRenderer key={b.id} block={b} />)}
      </>
    )
  }

  return <>{blocks.map(b => <BlockRenderer key={b.id} block={b} />)}</>
}
