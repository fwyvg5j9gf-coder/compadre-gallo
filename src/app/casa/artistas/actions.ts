'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
}

function toSlug(name: string) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function createArtist(formData: FormData) {
  await requireAdmin()
  const name = (formData.get('name') as string).trim()
  const slug = ((formData.get('slug') as string) || toSlug(name)).trim()
  const city  = (formData.get('city')  as string | null)?.trim() ?? null
  const genre = (formData.get('genre') as string | null)?.trim() ?? null

  const { data, error } = await supabaseAdmin
    .from('artists').insert({ name, slug, city, genre }).select('id').single()

  if (error) throw new Error(error.message)
  revalidatePath('/casa/artistas')
  redirect(`/casa/artistas/${data.id}`)
}

export async function toggleArtistPublished(id: string, published: boolean) {
  await requireAdmin()
  await supabaseAdmin.from('artists').update({ is_published: published, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/casa/artistas')
  revalidatePath(`/casa/artistas/${id}`)
}

export async function deleteArtist(id: string) {
  await requireAdmin()
  await supabaseAdmin.from('artists').delete().eq('id', id)
  revalidatePath('/casa/artistas')
  redirect('/casa/artistas')
}

export async function getArtistUploadUrl(filename: string, contentType: string) {
  await requireAdmin()
  const ext  = filename.split('.').pop() ?? 'jpg'
  const path = `artists/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabaseAdmin.storage.from('product-images').createSignedUploadUrl(path)
  if (error) throw new Error(error.message)
  const publicUrl = supabaseAdmin.storage.from('product-images').getPublicUrl(path).data.publicUrl
  return { signedUrl: data.signedUrl, publicUrl }
}
