'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import type { BlockType } from '@/lib/blocks'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
}

const PAGE_PATHS: Record<string, string> = {
  home:     '/',
  artistas: '/artistas',
  tienda:   '/tienda',
}

function reval(pageKey: string) {
  revalidatePath(PAGE_PATHS[pageKey] ?? '/')
  revalidatePath('/casa/editor')
}

export async function updateBlock(id: string, pageKey: string, content: Record<string, string>) {
  await requireAdmin()
  await supabaseAdmin.from('page_blocks')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
  reval(pageKey)
}

export async function toggleBlockVisible(id: string, pageKey: string, visible: boolean) {
  await requireAdmin()
  await supabaseAdmin.from('page_blocks').update({ visible, updated_at: new Date().toISOString() }).eq('id', id)
  reval(pageKey)
}

export async function moveBlock(id: string, pageKey: string, dir: -1 | 1) {
  await requireAdmin()
  const { data: blocks } = await supabaseAdmin
    .from('page_blocks').select('id, sort_order').eq('page_key', pageKey).order('sort_order')
  if (!blocks) return
  const idx = blocks.findIndex(b => b.id === id)
  const swapIdx = idx + dir
  if (swapIdx < 0 || swapIdx >= blocks.length) return
  await Promise.all([
    supabaseAdmin.from('page_blocks').update({ sort_order: blocks[swapIdx].sort_order }).eq('id', blocks[idx].id),
    supabaseAdmin.from('page_blocks').update({ sort_order: blocks[idx].sort_order     }).eq('id', blocks[swapIdx].id),
  ])
  reval(pageKey)
}

export async function deleteBlock(id: string, pageKey: string) {
  await requireAdmin()
  await supabaseAdmin.from('page_blocks').delete().eq('id', id)
  reval(pageKey)
}

export async function addBlock(pageKey: string, type: BlockType) {
  await requireAdmin()
  const { data: last } = await supabaseAdmin
    .from('page_blocks').select('sort_order').eq('page_key', pageKey).order('sort_order', { ascending: false }).limit(1).single()
  await supabaseAdmin.from('page_blocks').insert({
    page_key:   pageKey,
    type,
    content:    {},
    visible:    true,
    sort_order: (last?.sort_order ?? 0) + 1,
  })
  reval(pageKey)
}

export async function getBlockUploadUrl(filename: string) {
  await requireAdmin()
  const ext  = filename.split('.').pop() ?? 'jpg'
  const path = `pages/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabaseAdmin.storage.from('product-images').createSignedUploadUrl(path)
  if (error) throw new Error(error.message)
  const publicUrl = supabaseAdmin.storage.from('product-images').getPublicUrl(path).data.publicUrl
  return { signedUrl: data.signedUrl, publicUrl }
}
