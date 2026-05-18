import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '@/app/casa/AdminShell'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  create:           { bg: 'rgba(26,107,53,0.08)',   text: '#1a6b35' },
  update:           { bg: 'rgba(0,58,135,0.07)',    text: '#003a87' },
  update_status:    { bg: 'rgba(0,58,135,0.07)',    text: '#003a87' },
  publish:          { bg: 'rgba(26,107,53,0.08)',   text: '#1a6b35' },
  unpublish:        { bg: 'rgba(107,106,100,0.08)', text: '#6b6a64' },
  bulk_publish:     { bg: 'rgba(26,107,53,0.08)',   text: '#1a6b35' },
  bulk_unpublish:   { bg: 'rgba(107,106,100,0.08)', text: '#6b6a64' },
  delete:           { bg: 'rgba(255,1,0,0.07)',     text: '#cc0000' },
  bulk_delete:      { bg: 'rgba(255,1,0,0.07)',     text: '#cc0000' },
}

const B = '#e8e7e1', M = '#6b6a64', S = '#9a9994'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; table?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')
  if (!(await isAdmin(userId))) redirect('/casa')

  const { page: pageStr = '1', action = '', table = '' } = await searchParams
  const page = Math.max(1, parseInt(pageStr) || 1)
  const perPage = 50
  const offset = (page - 1) * perPage

  let query = supabaseAdmin
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (action) query = query.eq('action', action)
  if (table)  query = query.eq('table_name', table)

  const { data: entries, count } = await query
  const total = count ?? 0
  const totalPages = Math.ceil(total / perPage)
  const rows = entries ?? []

  // Get distinct actions for filter dropdown
  const { data: actionRows } = await supabaseAdmin
    .from('audit_log')
    .select('action')
    .order('action')

  const distinctActions = [...new Set((actionRows ?? []).map(r => r.action))]

  return (
    <AdminShell crumb="bitácora" crumbHref="/casa/bitacora">
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 28px 72px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: '#0a0a0a', textTransform: 'lowercase', marginBottom: 4 }}>
              bitácora
            </h1>
            <p style={{ fontSize: 13, color: M, margin: 0 }}>
              {total} registro{total !== 1 ? 's' : ''} de actividad
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <form method="GET" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select name="action" defaultValue={action} onChange={undefined}
                style={{ height: 34, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 13, background: '#fff', color: '#0a0a0a', cursor: 'pointer' }}
              >
                <option value="">todas las acciones</option>
                {distinctActions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <input type="hidden" name="table" value={table} />
              <button type="submit" style={{ height: 34, padding: '0 14px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 13, background: '#fff', cursor: 'pointer', color: M }}>
                filtrar
              </button>
              {(action || table) && (
                <Link href="/casa/bitacora" style={{ fontSize: 13, color: M, textDecoration: 'none' }}>limpiar</Link>
              )}
            </form>
          </div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '160px 100px 100px 1fr 120px',
            gap: 12, padding: '10px 20px', background: '#f6f5f1', borderBottom: `1px solid ${B}`,
            fontSize: 10, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span>fecha</span><span>acción</span><span>tabla</span><span>detalle</span><span>usuario</span>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: M, fontSize: 13, fontStyle: 'italic' }}>
              sin registros todavía. las acciones de admin aparecerán aquí.
            </div>
          ) : (
            rows.map((row, i) => {
              const colors = ACTION_COLORS[row.action] ?? { bg: '#f0efe9', text: '#6b6a64' }
              return (
                <div key={row.id} style={{
                  display: 'grid', gridTemplateColumns: '160px 100px 100px 1fr 120px',
                  gap: 12, padding: '11px 20px', alignItems: 'center',
                  borderBottom: i < rows.length - 1 ? `1px solid ${B}` : 'none',
                  background: '#fff',
                }}>
                  <span style={{ fontSize: 12, color: M, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtDate(row.created_at)}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: colors.bg, color: colors.text,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    display: 'inline-block',
                  }}>
                    {row.action}
                  </span>
                  <span style={{ fontSize: 12, color: M }}>
                    {row.table_name ?? '—'}
                  </span>
                  <span style={{ fontSize: 13, color: '#0a0a0a' }}>
                    {row.summary}
                    {row.record_id && (
                      <span style={{ fontSize: 11, color: S, marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
                        {row.record_id.slice(0, 8)}…
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: S, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.user_id ? row.user_id.slice(-8) : '—'}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
            {page > 1 && (
              <Link href={`/casa/bitacora?page=${page - 1}${action ? `&action=${action}` : ''}${table ? `&table=${table}` : ''}`}
                style={{ padding: '6px 14px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 13, textDecoration: 'none', color: M }}>
                ← anterior
              </Link>
            )}
            <span style={{ padding: '6px 14px', fontSize: 13, color: M }}>
              página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <Link href={`/casa/bitacora?page=${page + 1}${action ? `&action=${action}` : ''}${table ? `&table=${table}` : ''}`}
                style={{ padding: '6px 14px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 13, textDecoration: 'none', color: M }}>
                siguiente →
              </Link>
            )}
          </div>
        )}

      </main>
    </AdminShell>
  )
}
