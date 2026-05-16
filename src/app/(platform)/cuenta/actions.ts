'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase.server'
import { revalidatePath } from 'next/cache'

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
