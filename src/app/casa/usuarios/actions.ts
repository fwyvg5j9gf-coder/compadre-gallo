'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase.server'
import { requireAdminOrThrow } from '@/lib/auth.server'

const VALID_ROLES = ['fan', 'artista', 'manager', 'admin'] as const
type Role = typeof VALID_ROLES[number]

export async function updateUserRole(userId: string, role: string) {
  await requireAdminOrThrow()
  if (!VALID_ROLES.includes(role as Role)) throw new Error('rol inválido')
  await supabaseAdmin
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
  revalidatePath('/casa/usuarios')
}
