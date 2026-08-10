'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminOrThrow } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'

// Las tareas viven en site_settings (key → jsonb), que ya existe. No hay forma
// de crear tablas desde aquí, y una llave nueva no estorba: el editor solo
// hace upsert de sus propias llaves ('nav', 'footer').
const KEY = 'dev_tasks'

export type DevTaskStatus = 'done' | 'pending' | 'blocked'

export type DevTask = {
  id: string
  section: string
  text: string
  note: string
  status: DevTaskStatus
  created_at: string
}

async function readTasks(): Promise<DevTask[]> {
  const { data } = await supabaseAdmin
    .from('site_settings')
    .select('value')
    .eq('key', KEY)
    .limit(1)

  const value = data?.[0]?.value as { items?: DevTask[] } | null | undefined
  const items = value?.items
  return Array.isArray(items) ? items : []
}

async function writeTasks(items: DevTask[]): Promise<void> {
  await supabaseAdmin
    .from('site_settings')
    .upsert({ key: KEY, value: { items }, updated_at: new Date().toISOString() })
  revalidatePath('/casa/desarrollo')
}

export async function listDevTasks(): Promise<DevTask[]> {
  await requireAdminOrThrow()
  return readTasks()
}

export async function addDevTask(section: string, text: string, note: string): Promise<void> {
  await requireAdminOrThrow()
  const cleanText = text.trim()
  if (!cleanText) throw new Error('la tarea necesita texto')

  const items = await readTasks()
  items.unshift({
    id: crypto.randomUUID(),
    section: section.trim() || 'general',
    text: cleanText,
    note: note.trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
  })
  await writeTasks(items)
}

export async function setDevTaskStatus(id: string, status: DevTaskStatus): Promise<void> {
  await requireAdminOrThrow()
  const items = await readTasks()
  const next = items.map(t => (t.id === id ? { ...t, status } : t))
  await writeTasks(next)
}

export async function deleteDevTask(id: string): Promise<void> {
  await requireAdminOrThrow()
  const items = await readTasks()
  await writeTasks(items.filter(t => t.id !== id))
}
