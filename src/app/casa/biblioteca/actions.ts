'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdminOrThrow, requireAdminUserId } from '@/lib/auth.server'
import { logAction } from '@/lib/audit.server'
import {
  FICHA, isEtapa, isImage, isTipo, safeFileName, slugify, tipoFromName,
  type Archivo, type Etapa, type Proyecto, type TipoArchivo,
} from '@/lib/biblioteca'

const BUCKET = 'biblioteca'
const MAX_BYTES = 50 * 1024 * 1024
const VIEW_SECONDS = 60 * 60

export type ProyectoCard = Proyecto & { portadaUrl: string | null; conteo: Partial<Record<TipoArchivo, number>> }
export type ArchivoView = Archivo & { url: string | null }

async function signMany(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (paths.length === 0) return out
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(paths, VIEW_SECONDS)
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl)
  return out
}

function touch(id: string) {
  return supabaseAdmin.from('biblioteca_proyectos').update({ updated_at: new Date().toISOString() }).eq('id', id)
}

// ── Lectura ──────────────────────────────────────────────────────────────────
export async function listProyectos(): Promise<ProyectoCard[]> {
  await requireAdminOrThrow()
  const [{ data: proyectos }, { data: archivos }] = await Promise.all([
    supabaseAdmin.from('biblioteca_proyectos').select('*').order('updated_at', { ascending: false }),
    supabaseAdmin.from('biblioteca_archivos').select('proyecto_id, tipo'),
  ])

  const conteos = new Map<string, Partial<Record<TipoArchivo, number>>>()
  for (const a of archivos ?? []) {
    const c = conteos.get(a.proyecto_id) ?? {}
    c[a.tipo as TipoArchivo] = (c[a.tipo as TipoArchivo] ?? 0) + 1
    conteos.set(a.proyecto_id, c)
  }

  const list = (proyectos ?? []) as Proyecto[]
  const urls = await signMany(list.map(p => p.portada).filter((p): p is string => !!p))
  return list.map(p => ({ ...p, portadaUrl: p.portada ? urls.get(p.portada) ?? null : null, conteo: conteos.get(p.id) ?? {} }))
}

export async function getProyecto(slug: string): Promise<{ proyecto: Proyecto; archivos: ArchivoView[]; portadaUrl: string | null } | null> {
  await requireAdminOrThrow()
  const { data: proyecto } = await supabaseAdmin.from('biblioteca_proyectos').select('*').eq('slug', slug).maybeSingle()
  if (!proyecto) return null

  const { data: archivos } = await supabaseAdmin
    .from('biblioteca_archivos')
    .select('*')
    .eq('proyecto_id', proyecto.id)
    .order('tipo')
    .order('nombre')

  const list = (archivos ?? []) as Archivo[]
  // Solo las imágenes se firman para verse; lo demás se firma al descargar.
  const urls = await signMany(list.filter(a => isImage(a.nombre)).map(a => a.path))
  const p = proyecto as Proyecto
  return {
    proyecto: p,
    archivos: list.map(a => ({ ...a, url: urls.get(a.path) ?? null })),
    portadaUrl: p.portada ? urls.get(p.portada) ?? null : null,
  }
}

export async function getDownloadUrl(archivoId: string): Promise<string> {
  await requireAdminOrThrow()
  const { data: a } = await supabaseAdmin.from('biblioteca_archivos').select('path, nombre').eq('id', archivoId).single()
  if (!a) throw new Error('ese archivo ya no existe')
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(a.path, 600, { download: a.nombre })
  if (error || !data) throw new Error(error?.message ?? 'no se pudo generar la liga')
  return data.signedUrl
}

// ── Proyectos ────────────────────────────────────────────────────────────────
export async function createProyecto(nombre: string, etapa: Etapa = 'idea'): Promise<string> {
  const userId = await requireAdminUserId()
  const clean = nombre.trim()
  const slug = slugify(clean)
  if (!clean || !slug) throw new Error('el proyecto necesita nombre')
  if (!isEtapa(etapa)) throw new Error('etapa inválida')

  const { data, error } = await supabaseAdmin
    .from('biblioteca_proyectos')
    .insert({ slug, nombre: clean, etapa })
    .select('id, slug')
    .single()
  if (error) throw new Error(error.code === '23505' ? `ya existe un proyecto "${slug}"` : error.message)

  await logAction({ userId, action: 'create', tableName: 'biblioteca_proyectos', recordId: data.id, summary: `biblioteca: nuevo proyecto ${clean} (${etapa})` })
  revalidatePath('/casa/biblioteca')
  return data.slug
}

const toInt = (v: FormDataEntryValue | null) => {
  const s = (v as string | null)?.trim()
  if (!s) return null
  const n = Math.round(Number(s))
  return Number.isFinite(n) && n >= 0 ? n : null
}

export async function updateProyecto(id: string, formData: FormData): Promise<void> {
  await requireAdminOrThrow()
  const nombre = (formData.get('nombre') as string | null)?.trim()
  if (!nombre) throw new Error('el proyecto necesita nombre')

  const patch: Record<string, unknown> = { nombre, updated_at: new Date().toISOString() }
  for (const f of FICHA) patch[f.key] = (formData.get(f.key) as string | null)?.trim() || null
  patch.notas = (formData.get('notas') as string | null)?.trim() || null
  patch.tiempo_min = toInt(formData.get('tiempo_min'))
  patch.gramos = toInt(formData.get('gramos'))
  patch.costo_pesos = toInt(formData.get('costo_pesos'))
  patch.precio_pesos = toInt(formData.get('precio_pesos'))

  const { error } = await supabaseAdmin.from('biblioteca_proyectos').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/casa/biblioteca', 'layout')
}

export async function setEtapa(id: string, etapa: Etapa): Promise<void> {
  const userId = await requireAdminUserId()
  if (!isEtapa(etapa)) throw new Error('etapa inválida')
  const { data, error } = await supabaseAdmin
    .from('biblioteca_proyectos')
    .update({ etapa, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('nombre')
    .single()
  if (error) throw new Error(error.message)
  await logAction({ userId, action: 'update', tableName: 'biblioteca_proyectos', recordId: id, summary: `biblioteca: ${data.nombre} → ${etapa}` })
  revalidatePath('/casa/biblioteca', 'layout')
}

export async function setPortada(proyectoId: string, path: string): Promise<void> {
  await requireAdminOrThrow()
  const { data: a } = await supabaseAdmin
    .from('biblioteca_archivos').select('nombre').eq('proyecto_id', proyectoId).eq('path', path).maybeSingle()
  if (!a || !isImage(a.nombre)) throw new Error('la portada tiene que ser una imagen del proyecto')
  await supabaseAdmin.from('biblioteca_proyectos').update({ portada: path, updated_at: new Date().toISOString() }).eq('id', proyectoId)
  revalidatePath('/casa/biblioteca', 'layout')
}

export async function deleteProyecto(id: string): Promise<void> {
  const userId = await requireAdminUserId()
  const [{ data: p }, { data: archivos }] = await Promise.all([
    supabaseAdmin.from('biblioteca_proyectos').select('nombre').eq('id', id).single(),
    supabaseAdmin.from('biblioteca_archivos').select('path').eq('proyecto_id', id),
  ])
  if (!p) return
  const paths = (archivos ?? []).map(a => a.path)
  if (paths.length) await supabaseAdmin.storage.from(BUCKET).remove(paths)
  await supabaseAdmin.from('biblioteca_proyectos').delete().eq('id', id)
  await logAction({ userId, action: 'delete', tableName: 'biblioteca_proyectos', recordId: id, summary: `biblioteca: borró ${p.nombre} y ${paths.length} archivos` })
  revalidatePath('/casa/biblioteca', 'layout')
}

// ── Archivos ─────────────────────────────────────────────────────────────────
export type UploadSlot = { nombre: string; path: string; signedUrl: string; token: string; tipo: TipoArchivo }

// Paso 1: URLs firmadas para que el navegador suba directo al bucket (los STL
// pesan decenas de MB; no pasan por el servidor de Next). Mismo nombre en el
// mismo proyecto = se reemplaza.
export async function prepareUploads(proyectoId: string, files: { name: string; size: number; tipo?: string }[]): Promise<UploadSlot[]> {
  await requireAdminOrThrow()
  const { data: p } = await supabaseAdmin.from('biblioteca_proyectos').select('slug').eq('id', proyectoId).single()
  if (!p) throw new Error('ese proyecto ya no existe')

  const slots: UploadSlot[] = []
  for (const f of files.slice(0, 40)) {
    if (f.size > MAX_BYTES) throw new Error(`${f.name} pesa más de 50 MB`)
    const nombre = safeFileName(f.name)
    const tipo: TipoArchivo = isTipo(f.tipo) ? f.tipo : tipoFromName(nombre)
    const path = `${p.slug}/${tipo}/${nombre}`
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
    if (error || !data) throw new Error(error?.message ?? 'no se pudo preparar la subida')
    slots.push({ nombre, path, signedUrl: data.signedUrl, token: data.token, tipo })
  }
  return slots
}

// Paso 2: ya subidos, se registran. Si el proyecto no tiene portada, la
// primera imagen se vuelve portada.
export async function registerUploads(proyectoId: string, uploaded: { nombre: string; path: string; tipo: TipoArchivo; bytes: number; contentType: string }[]): Promise<void> {
  const userId = await requireAdminUserId()
  const { data: p } = await supabaseAdmin.from('biblioteca_proyectos').select('slug, nombre, portada').eq('id', proyectoId).single()
  if (!p) throw new Error('ese proyecto ya no existe')

  const rows = uploaded
    .filter(u => u.path.startsWith(`${p.slug}/`) && isTipo(u.tipo))
    .map(u => ({ proyecto_id: proyectoId, nombre: u.nombre, tipo: u.tipo, path: u.path, bytes: u.bytes, content_type: u.contentType }))
  if (!rows.length) return

  const { error } = await supabaseAdmin.from('biblioteca_archivos').upsert(rows, { onConflict: 'proyecto_id,nombre' })
  if (error) throw new Error(error.message)

  const firstImage = rows.find(r => isImage(r.nombre))
  await supabaseAdmin.from('biblioteca_proyectos')
    .update({ updated_at: new Date().toISOString(), ...(!p.portada && firstImage ? { portada: firstImage.path } : {}) })
    .eq('id', proyectoId)

  await logAction({ userId, action: 'create', tableName: 'biblioteca_archivos', recordId: proyectoId, summary: `biblioteca: subió ${rows.length} archivo(s) a ${p.nombre}` })
  revalidatePath('/casa/biblioteca', 'layout')
}

export async function deleteArchivo(id: string): Promise<void> {
  await requireAdminOrThrow()
  const { data: a } = await supabaseAdmin.from('biblioteca_archivos').select('path, proyecto_id').eq('id', id).single()
  if (!a) return
  await supabaseAdmin.storage.from(BUCKET).remove([a.path])
  await supabaseAdmin.from('biblioteca_archivos').delete().eq('id', id)
  // Si era la portada, el proyecto se queda sin portada (no con una rota).
  await supabaseAdmin.from('biblioteca_proyectos').update({ portada: null }).eq('id', a.proyecto_id).eq('portada', a.path)
  await touch(a.proyecto_id)
  revalidatePath('/casa/biblioteca', 'layout')
}

export async function setTipoArchivo(id: string, tipo: TipoArchivo): Promise<void> {
  await requireAdminOrThrow()
  if (!isTipo(tipo)) throw new Error('tipo inválido')
  await supabaseAdmin.from('biblioteca_archivos').update({ tipo }).eq('id', id)
  revalidatePath('/casa/biblioteca', 'layout')
}
