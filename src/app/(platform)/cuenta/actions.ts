'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export async function saveUsername(username: string): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { error: 'sesión expirada, recarga la página' }

  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (cleaned.length < 3) return { error: 'mínimo 3 caracteres' }
  if (cleaned.length > 20) return { error: 'máximo 20 caracteres' }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ username: cleaned })
    .eq('clerk_user_id', userId)

  if (error?.code === '23505') return { error: 'ese nombre de usuario ya está en uso, elige otro' }
  if (error) return { error: 'no se pudo guardar, intenta de nuevo' }

  revalidatePath('/cuenta')
  return {}
}

export async function saveAddress(address: Record<string, string>): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { error: 'sesión expirada, recarga la página' }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ shipping_address: address })
    .eq('clerk_user_id', userId)

  if (error) return { error: 'no se pudo guardar la dirección, intenta de nuevo' }

  revalidatePath('/cuenta')
  return {}
}

export async function subscribeToArtist(artistId: string, email: string): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { error: 'inicia sesión para seguir artistas' }

  const { error } = await supabaseAdmin.from('artist_subscriptions').upsert(
    { artist_id: artistId, user_id: userId, email },
    { onConflict: 'artist_id,user_id', ignoreDuplicates: true },
  )

  if (error) return { error: 'no se pudo seguir al artista, intenta de nuevo' }

  revalidatePath('/cuenta')
  return {}
}

export async function unsubscribeFromArtist(artistId: string): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { error: 'sesión expirada' }

  const { error } = await supabaseAdmin
    .from('artist_subscriptions')
    .delete()
    .eq('artist_id', artistId)
    .eq('user_id', userId)

  if (error) return { error: 'no se pudo dejar de seguir al artista, intenta de nuevo' }

  revalidatePath('/cuenta')
  return {}
}
