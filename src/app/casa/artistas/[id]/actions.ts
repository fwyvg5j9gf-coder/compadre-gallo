'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdmin } from '@/lib/auth.server'

async function reval(id: string) {
  revalidatePath(`/casa/artistas/${id}`)
  revalidatePath('/casa/artistas')
  revalidatePath('/artistas')
  const { data } = await supabaseAdmin.from('artists').select('slug').eq('id', id).single()
  if (data?.slug) revalidatePath(`/artista/${data.slug}`)
}

// ── Secciones ──────────────────────────────────────────────────────────────────
export async function updateArtistSections(id: string, sections: { key: string; visible: boolean }[]) {
  await requireAdmin()
  await supabaseAdmin.from('artists').update({ page_sections: sections, updated_at: new Date().toISOString() }).eq('id', id)
  await reval(id)
}

// ── Perfil ─────────────────────────────────────────────────────────────────────
export async function updateArtistProfile(id: string, formData: FormData) {
  await requireAdmin()
  await supabaseAdmin.from('artists').update({
    name:         (formData.get('name')         as string).trim(),
    slug:         (formData.get('slug')         as string).trim(),
    bio:          (formData.get('bio')          as string | null)?.trim() || null,
    city:         (formData.get('city')         as string | null)?.trim() || null,
    genre:        (formData.get('genre')        as string | null)?.trim() || null,
    image_url:    (formData.get('image_url')    as string | null)?.trim() || null,
    bg_color:     (formData.get('bg_color')     as string) || '#0a0a0a',
    stripe_color: (formData.get('stripe_color') as string) || '#ff0100',
    fg_color:     (formData.get('fg_color')     as string) || '#ffffff',
    instagram:    (formData.get('instagram')    as string | null)?.trim() || null,
    tiktok:       (formData.get('tiktok')       as string | null)?.trim() || null,
    spotify:      (formData.get('spotify')      as string | null)?.trim() || null,
    youtube:      (formData.get('youtube')      as string | null)?.trim() || null,
    is_published: formData.get('is_published') === 'true',
    updated_at:   new Date().toISOString(),
  }).eq('id', id)
  await reval(id)
}

// ── Shows ──────────────────────────────────────────────────────────────────────
export async function createShow(artistId: string, formData: FormData) {
  await requireAdmin()
  await supabaseAdmin.from('shows').insert({
    artist_id:    artistId,
    venue:        (formData.get('venue') as string).trim(),
    city:         (formData.get('city')  as string).trim(),
    date:         formData.get('date')   as string,
    ticket_url:   (formData.get('ticket_url') as string | null)?.trim() || null,
    price_mxn:    formData.get('price_mxn') ? parseInt(formData.get('price_mxn') as string) * 100 : null,
    capacity:     formData.get('capacity')  ? parseInt(formData.get('capacity')  as string) : null,
    is_published: formData.get('is_published') === 'true',
  })
  await reval(artistId)
}

export async function updateShow(id: string, artistId: string, formData: FormData) {
  await requireAdmin()
  await supabaseAdmin.from('shows').update({
    venue:        (formData.get('venue') as string).trim(),
    city:         (formData.get('city')  as string).trim(),
    date:         formData.get('date')   as string,
    ticket_url:   (formData.get('ticket_url') as string | null)?.trim() || null,
    price_mxn:    formData.get('price_mxn') ? parseInt(formData.get('price_mxn') as string) * 100 : null,
    is_published: formData.get('is_published') === 'true',
    updated_at:   new Date().toISOString(),
  }).eq('id', id)
  await reval(artistId)
}

export async function deleteShow(id: string, artistId: string) {
  await requireAdmin()
  await supabaseAdmin.from('shows').delete().eq('id', id)
  await reval(artistId)
}

// ── Tareas ─────────────────────────────────────────────────────────────────────
export async function createTask(artistId: string, formData: FormData) {
  await requireAdmin()
  await supabaseAdmin.from('artist_tasks').insert({
    artist_id:   artistId,
    title:       (formData.get('title')       as string).trim(),
    description: (formData.get('description') as string | null)?.trim() || null,
    due_date:    (formData.get('due_date')    as string | null) || null,
    priority:    (formData.get('priority')    as string) || 'normal',
    status:      'pendiente',
  })
  await reval(artistId)
}

export async function updateTaskStatus(id: string, artistId: string, status: string) {
  await requireAdmin()
  await supabaseAdmin.from('artist_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  await reval(artistId)
}

export async function deleteTask(id: string, artistId: string) {
  await requireAdmin()
  await supabaseAdmin.from('artist_tasks').delete().eq('id', id)
  await reval(artistId)
}

// ── Contenido ─────────────────────────────────────────────────────────────────
export async function createContent(artistId: string, formData: FormData) {
  await requireAdmin()
  await supabaseAdmin.from('content_calendar').insert({
    artist_id:      artistId,
    title:          (formData.get('title')    as string).trim(),
    description:    (formData.get('description') as string | null)?.trim() || null,
    platform:       formData.get('platform')     as string,
    content_type:   formData.get('content_type') as string,
    scheduled_date: (formData.get('scheduled_date') as string | null) || null,
    status:         (formData.get('status') as string) || 'idea',
  })
  await reval(artistId)
}

export async function updateContentStatus(id: string, artistId: string, status: string) {
  await requireAdmin()
  await supabaseAdmin.from('content_calendar').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  await reval(artistId)
}

export async function deleteContent(id: string, artistId: string) {
  await requireAdmin()
  await supabaseAdmin.from('content_calendar').delete().eq('id', id)
  await reval(artistId)
}

// ── Ingresos externos ──────────────────────────────────────────────────────────
export async function createExternalIncome(artistId: string, formData: FormData) {
  await requireAdmin()
  const pesos = parseFloat(formData.get('amount') as string)
  await supabaseAdmin.from('external_income').insert({
    artist_id:   artistId,
    description: (formData.get('description') as string).trim(),
    amount_mxn:  Math.round(pesos * 100),
    date:        (formData.get('date') as string) || new Date().toISOString().slice(0, 10),
    category:    formData.get('category') as string,
    notes:       (formData.get('notes') as string | null)?.trim() || null,
  })
  await reval(artistId)
}

export async function deleteExternalIncome(id: string, artistId: string) {
  await requireAdmin()
  await supabaseAdmin.from('external_income').delete().eq('id', id)
  await reval(artistId)
}
