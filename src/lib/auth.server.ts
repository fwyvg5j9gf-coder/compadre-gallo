// Server-only auth helpers — never import from 'use client'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'

// Set ADMIN_USER_IDS in Vercel env as a comma-separated list of Clerk user IDs.
const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

async function isAdmin(userId: string): Promise<boolean> {
  if (ADMIN_IDS.includes(userId)) return true
  const { data } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('clerk_user_id', userId)
    .single()
  return data?.role === 'admin'
}

// Returns the artist row linked to this Clerk user, or null.
export async function getLinkedArtist(userId: string) {
  const { data } = await supabaseAdmin
    .from('artists')
    .select('id, name, slug')
    .eq('clerk_user_id', userId)
    .single()
  return data ?? null
}

export async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')
  if (!(await isAdmin(userId))) redirect('/cuenta/login')
}

export async function requireAdminOrThrow() {
  const { userId } = await auth()
  if (!userId) throw new Error('no autorizado')
  if (!(await isAdmin(userId))) throw new Error('no autorizado')
}

export async function requireAdminUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('no autorizado')
  if (!(await isAdmin(userId))) throw new Error('no autorizado')
  return userId
}

// Allows admins OR the artista linked to artistId.
// Returns 'admin' | 'artista' so the page can adapt the UI.
export async function requireAdminOrArtista(artistId: string): Promise<'admin' | 'artista'> {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')
  if (await isAdmin(userId)) return 'admin'
  const linked = await getLinkedArtist(userId)
  if (linked?.id === artistId) return 'artista'
  redirect('/cuenta/login')
}

export { isAdmin }
