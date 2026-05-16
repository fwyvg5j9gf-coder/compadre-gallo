'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { revalidatePath } from 'next/cache'

export async function saveUsername(username: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('no autenticado')

  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (cleaned.length < 3 || cleaned.length > 20) throw new Error('debe tener entre 3 y 20 caracteres')

  const { error } = await supabaseAdmin
    .from('users')
    .update({ username: cleaned })
    .eq('clerk_user_id', userId)

  if (error?.code === '23505') throw new Error('ese nombre ya está en uso')
  if (error) throw new Error('error al guardar')
  revalidatePath('/cuenta')
}

export async function saveAddress(address: Record<string, string>) {
  const { userId } = await auth()
  if (!userId) throw new Error('no autenticado')

  await supabaseAdmin
    .from('users')
    .update({ shipping_address: address })
    .eq('clerk_user_id', userId)

  revalidatePath('/cuenta')
}

export async function subscribeToArtist(artistId: string, email: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('no autenticado')

  await supabaseAdmin.from('artist_subscriptions').upsert(
    { artist_id: artistId, user_id: userId, email },
    { onConflict: 'artist_id,user_id', ignoreDuplicates: true },
  )
  revalidatePath('/cuenta')
}

export async function unsubscribeFromArtist(artistId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('no autenticado')

  await supabaseAdmin
    .from('artist_subscriptions')
    .delete()
    .eq('artist_id', artistId)
    .eq('user_id', userId)

  revalidatePath('/cuenta')
}
