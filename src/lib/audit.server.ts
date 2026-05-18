'use server'

import { supabaseAdmin } from './supabase.server'

export async function logAction(opts: {
  userId: string | null
  action: string
  tableName?: string
  recordId?: string
  summary: string
}) {
  await supabaseAdmin.from('audit_log').insert({
    user_id: opts.userId,
    action: opts.action,
    table_name: opts.tableName ?? null,
    record_id: opts.recordId ?? null,
    summary: opts.summary,
  })
}
