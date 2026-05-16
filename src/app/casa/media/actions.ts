'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase.server'

const BUCKET = 'product-images'
const BASE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
}

export type MediaFile = {
  id: string
  name: string
  path: string
  url: string
  size: number
  mimeType: string
  createdAt: string
}

export async function listAllMedia(): Promise<MediaFile[]> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .schema('storage')
    .from('objects')
    .select('id, name, metadata, created_at')
    .eq('bucket_id', BUCKET)
    .not('name', 'like', '%/.emptyFolderPlaceholder')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error || !data) return []

  return data
    .filter(o => o.metadata?.mimetype)
    .map(o => ({
      id: o.id,
      name: o.name.split('/').pop() ?? o.name,
      path: o.name,
      url: `${BASE_URL}/${o.name}`,
      size: o.metadata?.size ?? 0,
      mimeType: o.metadata?.mimetype ?? '',
      createdAt: o.created_at ?? '',
    }))
}

export async function getUploadUrl(filename: string, folder: string) {
  await requireAdmin()
  const ext = filename.split('.').pop() ?? 'jpg'
  const slug = filename.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40)
  const path = `${folder}${slug}-${Date.now()}.${ext}`
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) throw new Error(error.message)
  return { signedUrl: data.signedUrl, publicUrl: `${BASE_URL}/${path}`, path }
}

export async function deleteMedia(path: string) {
  await requireAdmin()
  await supabaseAdmin.storage.from(BUCKET).remove([path])
}
