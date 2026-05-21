'use client'

import { useState } from 'react'
import AdminShell from '../AdminShell'

const B = '#e8e7e1'
const M = '#6b6a64'
const S = '#9a9994'

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  fan:     { bg: 'rgba(0,58,135,0.08)',   text: '#003a87' },
  artista: { bg: 'rgba(0,196,223,0.1)',   text: '#007a8c' },
  manager: { bg: 'rgba(255,212,154,0.3)', text: '#6b4a10' },
  admin:   { bg: 'rgba(255,1,0,0.07)',    text: '#cc0000' },
}

type RegisteredUser = {
  clerk_user_id: string
  email: string
  name: string | null
  username: string | null
  role: string
  created_at: string
  orders_count: number
  tickets_count: number
  subs_count: number
}

type GuestBuyer = {
  email: string
  name: string | null
  phone: string | null
  orders_count: number
  total_mxn: number
  last_order: string
}

function Num({ n, label }: { n: number; label: string }) {
  if (n === 0) return <span style={{ fontSize: 12, color: S }}>—</span>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#0a0a0a' }}>{n}</span>
      <span style={{ fontSize: 10, color: S, letterSpacing: '0.04em' }}>{label}</span>
    </div>
  )
}

function fmt(n: number) {
  return (n / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Tab: Con cuenta ───────────────────────────────────────────────────────────
function ConCuentaTab({ users }: { users: RegisteredUser[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (u.username ?? '').toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.name ?? '').toLowerCase().includes(q)
    const matchRole = roleFilter === 'todos' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="buscar por @username, nombre o correo…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 240, padding: '8px 12px',
            border: `1px solid ${B}`, borderRadius: 4, fontSize: 13,
            background: '#fff', outline: 'none', fontFamily: 'var(--font-sans)',
          }}
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '8px 12px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 13, background: '#fff', cursor: 'pointer' }}
        >
          {['todos', 'fan', 'artista', 'manager', 'admin'].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: `1px solid ${B}`, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 110px 80px 80px 80px 130px',
          padding: '10px 20px', borderBottom: `1px solid ${B}`, background: '#f6f5f1',
        }}>
          {['cuenta', 'rol', 'pedidos', 'boletos', 'artistas', 'desde'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: S }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: S, fontSize: 13 }}>
            ninguna cuenta coincide
          </div>
        ) : filtered.map((u, i) => {
          const rc = ROLE_COLOR[u.role] ?? ROLE_COLOR.fan
          const handle = u.username ? `@${u.username}` : null
          const displayName = u.name || u.email

          return (
            <div
              key={u.clerk_user_id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 110px 80px 80px 80px 130px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? `1px solid ${B}` : 'none',
                transition: 'background 120ms', cursor: 'default',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafaf8')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              {/* Identity — username first */}
              <div style={{ minWidth: 0 }}>
                {handle ? (
                  <div style={{
                    fontFamily: 'monospace', fontWeight: 700, fontSize: 15,
                    color: '#0a0a0a', letterSpacing: '-0.01em',
                  }}>
                    {handle}
                  </div>
                ) : (
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0a0a0a', textTransform: 'lowercase' }}>
                    {displayName}
                  </div>
                )}
                {handle && (
                  <div style={{ fontSize: 12, color: M, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name ? u.name : u.email}
                  </div>
                )}
                {!handle && u.name && (
                  <div style={{ fontSize: 12, color: S, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email}
                  </div>
                )}
              </div>

              {/* Role */}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: rc.bg, color: rc.text, textTransform: 'uppercase',
                letterSpacing: '0.04em', whiteSpace: 'nowrap',
              }}>
                {u.role}
              </span>

              <Num n={u.orders_count}  label="ped." />
              <Num n={u.tickets_count} label="bol." />
              <Num n={u.subs_count}    label="art." />

              <span style={{ fontSize: 12, color: S }}>{fmtDate(u.created_at)}</span>
            </div>
          )
        })}
      </div>

      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: S, textAlign: 'right' }}>
          {filtered.length} {filtered.length === 1 ? 'cuenta' : 'cuentas'}
        </div>
      )}
    </div>
  )
}

// ── Tab: Invitados ────────────────────────────────────────────────────────────
function InvitadosTab({ guests }: { guests: GuestBuyer[] }) {
  const [search, setSearch] = useState('')

  const filtered = guests.filter(g => {
    const q = search.toLowerCase()
    return !q || g.email.includes(q) || (g.name ?? '').toLowerCase().includes(q)
  })

  const totalSpent = guests.reduce((s, g) => s + g.total_mxn, 0)

  return (
    <div>
      {/* Summary */}
      <div style={{
        background: 'rgba(0,58,135,0.04)', border: `1px solid rgba(0,58,135,0.12)`,
        borderRadius: 6, padding: '12px 18px', marginBottom: 18,
        display: 'flex', gap: 32, fontSize: 13, color: M,
      }}>
        <span><strong style={{ color: '#0a0a0a' }}>{guests.length}</strong> compradores sin cuenta</span>
        <span><strong style={{ color: '#0a0a0a' }}>{guests.reduce((s, g) => s + g.orders_count, 0)}</strong> pedidos en total</span>
        <span><strong style={{ color: '#0a0a0a' }}>{fmt(totalSpent)}</strong> gastados</span>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="buscar por correo o nombre…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', marginBottom: 18,
          border: `1px solid ${B}`, borderRadius: 4, fontSize: 13,
          background: '#fff', outline: 'none', fontFamily: 'var(--font-sans)',
          boxSizing: 'border-box',
        }}
      />

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: `1px solid ${B}`, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 160px 80px 140px 130px',
          padding: '10px 20px', borderBottom: `1px solid ${B}`, background: '#f6f5f1',
        }}>
          {['correo', 'nombre', 'pedidos', 'total gastado', 'último pedido'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: S }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: S, fontSize: 13 }}>
            {guests.length === 0 ? 'aún no hay compradores invitados' : 'ninguno coincide'}
          </div>
        ) : filtered.map((g, i) => (
          <div
            key={g.email}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 160px 80px 140px 130px',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? `1px solid ${B}` : 'none',
              transition: 'background 120ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafaf8')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {g.email}
              </div>
              <div style={{ fontSize: 11, color: S, marginTop: 1 }}>invitado</div>
            </div>

            <span style={{ fontSize: 13, color: M }}>
              {g.name || <span style={{ color: S, fontStyle: 'italic' }}>sin nombre</span>}
            </span>

            <Num n={g.orders_count} label="ped." />

            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>
              {fmt(g.total_mxn)}
            </span>

            <span style={{ fontSize: 12, color: S }}>{fmtDate(g.last_order)}</span>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: S, textAlign: 'right' }}>
          {filtered.length} {filtered.length === 1 ? 'comprador' : 'compradores'}
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CuentasAdmin({
  registeredUsers,
  guestBuyers,
}: {
  registeredUsers: RegisteredUser[]
  guestBuyers: GuestBuyer[]
}) {
  const [tab, setTab] = useState<'cuentas' | 'invitados'>('cuentas')

  return (
    <AdminShell crumb="cuentas" crumbHref="/casa">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* Header */}
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900,
          letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 28,
        }}>
          cuentas
        </h1>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'fans registrados',      value: registeredUsers.filter(u => u.role === 'fan').length },
            { label: 'con username',           value: registeredUsers.filter(u => u.username).length },
            { label: 'compradores invitados',  value: guestBuyers.length },
            { label: 'artistas seguidos',      value: registeredUsers.reduce((s, u) => s + u.subs_count, 0) },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 8, border: `1px solid ${B}`, padding: '18px 22px',
            }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 26, lineHeight: 1, color: '#0a0a0a' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: M, marginTop: 6, letterSpacing: '0.02em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#eeede8', borderRadius: 6, padding: 3, width: 'fit-content' }}>
          {([
            { id: 'cuentas',   label: `con cuenta (${registeredUsers.length})` },
            { id: 'invitados', label: `invitados (${guestBuyers.length})` },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 18px', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                background: tab === t.id ? '#fff' : 'transparent',
                color: tab === t.id ? '#0a0a0a' : M,
                boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'background 100ms, color 100ms',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'cuentas'   && <ConCuentaTab users={registeredUsers} />}
        {tab === 'invitados' && <InvitadosTab guests={guestBuyers} />}
      </div>
    </AdminShell>
  )
}
