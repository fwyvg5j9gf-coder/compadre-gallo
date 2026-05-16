'use client'

import { useState } from 'react'
import AdminShell from '../AdminShell'

type Customer = {
  clerk_user_id: string
  email: string
  name: string | null
  role: string
  created_at: string
  orders_count: number
  tickets_count: number
  subscriptions_count: number
}

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  fan:     { bg: 'rgba(0,58,135,0.08)',  text: '#003a87' },
  artista: { bg: 'rgba(0,196,223,0.1)',  text: '#007a8c' },
  manager: { bg: 'rgba(255,212,154,0.3)', text: '#6b4a10' },
  admin:   { bg: 'rgba(255,1,0,0.07)',   text: '#cc0000' },
}

function StatBadge({ count, label }: { count: number; label: string }) {
  if (count === 0) return <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>—</span>
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>{count}</span>
      <span style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    </span>
  )
}

export default function ClientesAdmin({ users }: { users: Customer[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('todos')

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q)
    const matchRole = roleFilter === 'todos' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const totalOrders = users.reduce((s, u) => s + u.orders_count, 0)
  const totalTickets = users.reduce((s, u) => s + u.tickets_count, 0)
  const totalSubs = users.reduce((s, u) => s + u.subscriptions_count, 0)

  return (
    <AdminShell crumb="clientes" crumbHref="/casa">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'clientes registrados', value: users.length },
            { label: 'pedidos en total',     value: totalOrders },
            { label: 'boletos vendidos',      value: totalTickets },
            { label: 'suscripciones',         value: totalSubs },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 8, border: '1px solid var(--border)',
              padding: '20px 24px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 28, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4, textTransform: 'lowercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="buscar por nombre o correo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 220, padding: '8px 14px', border: '1px solid var(--border)',
              borderRadius: 4, fontSize: 14, background: '#fff', outline: 'none',
            }}
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14, background: '#fff', cursor: 'pointer' }}
          >
            {['todos', 'fan', 'artista', 'manager', 'admin'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 80px 80px 80px 140px',
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-soft)',
          }}>
            {['cliente', 'rol', 'pedidos', 'boletos', 'suscripciones', 'registrado'].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>
                {h}
              </span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontStyle: 'italic' }}>
              no hay clientes que coincidan
            </div>
          ) : (
            filtered.map((u, i) => {
              const rc = ROLE_COLOR[u.role] ?? ROLE_COLOR.fan
              return (
                <div
                  key={u.clerk_user_id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 80px 80px 80px 140px',
                    padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf7')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  {/* Name + email */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'lowercase' }}>
                      {u.name || <span style={{ color: 'var(--fg-muted)', fontStyle: 'italic', fontWeight: 400 }}>sin nombre</span>}
                    </div>
                    {u.email && (
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </div>
                    )}
                    {!u.email && (
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                        {u.clerk_user_id.slice(0, 16)}…
                      </div>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: rc.bg, color: rc.text, textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {u.role}
                    </span>
                  </div>

                  {/* Counts */}
                  <StatBadge count={u.orders_count}       label="ped." />
                  <StatBadge count={u.tickets_count}      label="bol." />
                  <StatBadge count={u.subscriptions_count} label="subs." />

                  {/* Date */}
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {filtered.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--fg-muted)', textAlign: 'right' }}>
            {filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
