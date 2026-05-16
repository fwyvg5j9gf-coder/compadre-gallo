'use client'

import { useState, useTransition } from 'react'
import { updateUserRole } from './actions'

type User = {
  id: string
  clerk_user_id: string
  email: string
  name: string | null
  role: string
  created_at: string
}

const ROLES = ['fan', 'artista', 'manager', 'admin'] as const

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  fan:      { bg: 'rgba(107,106,100,0.1)',  text: '#6b6a64' },
  artista:  { bg: 'rgba(0,196,223,0.1)',    text: '#007a8c' },
  manager:  { bg: 'rgba(255,212,154,0.25)', text: '#6b4a10' },
  admin:    { bg: 'rgba(255,1,0,0.07)',     text: '#cc0000' },
}

function RoleSelect({ user }: { user: User }) {
  const [pending, startTransition] = useTransition()
  const [role, setRole] = useState(user.role)

  const change = (next: string) => {
    setRole(next)
    startTransition(async () => {
      try {
        await updateUserRole(user.id, next)
      } catch {
        setRole(user.role)
      }
    })
  }

  const rc = ROLE_COLOR[role] ?? ROLE_COLOR.fan

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 999,
        background: rc.bg, color: rc.text, textTransform: 'uppercase', letterSpacing: '0.05em',
        minWidth: 62, textAlign: 'center',
      }}>
        {role}
      </span>
      <select
        value={role}
        onChange={e => change(e.target.value)}
        disabled={pending}
        style={{
          fontSize: 12, padding: '4px 8px', borderRadius: 4,
          border: '1px solid var(--border)', background: '#fff',
          color: 'var(--fg)', cursor: 'pointer', opacity: pending ? 0.5 : 1,
        }}
      >
        {ROLES.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
    </div>
  )
}

export default function UsuariosAdmin({ users }: { users: User[] }) {
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')

  const filtered = users.filter(u => {
    const matchQ = !q || u.email.toLowerCase().includes(q.toLowerCase()) || (u.name ?? '').toLowerCase().includes(q.toLowerCase())
    const matchRole = roleFilter === 'todos' || u.role === roleFilter
    return matchQ && matchRole
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 32px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900,
          letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 6,
        }}>
          usuarios
        </h1>
        <p style={{ color: '#6b6a64', fontSize: 14, margin: 0 }}>
          {users.length} {users.length === 1 ? 'usuario registrado' : 'usuarios registrados'}
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="buscar por nombre o correo..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            flex: 1, minWidth: 220, padding: '8px 12px', borderRadius: 6,
            border: '1px solid var(--border)', fontSize: 13, background: '#fff',
          }}
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
            fontSize: 13, background: '#fff', color: 'var(--fg)',
          }}
        >
          <option value="todos">todos los roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: 14 }}>
          ningún usuario coincide con la búsqueda.
        </p>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {/* Encabezado */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: 16,
            padding: '10px 20px', background: '#f6f5f1',
            fontSize: 11, fontWeight: 700, color: '#6b6a64',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            borderBottom: '1px solid var(--border)',
          }}>
            <span>usuario</span>
            <span>correo</span>
            <span>rol</span>
          </div>

          {/* Filas */}
          {filtered.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 200px',
                gap: 16, padding: '14px 20px', alignItems: 'center',
                background: i % 2 === 0 ? '#fff' : '#fafaf8',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0a0a0a' }}>
                  {u.name ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: '#9a9994', marginTop: 2, fontFamily: 'monospace' }}>
                  {u.clerk_user_id}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#6b6a64', wordBreak: 'break-all' }}>
                {u.email}
              </div>
              <RoleSelect user={u} />
            </div>
          ))}
        </div>
      )}

      {/* Leyenda */}
      <div style={{ marginTop: 32, padding: 20, background: '#f6f5f1', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6a64', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          roles y permisos
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {[
            { role: 'fan',     desc: 'cliente normal — solo /cuenta' },
            { role: 'artista', desc: 'accede a su perfil en /casa' },
            { role: 'manager', desc: 'órdenes y tienda, sin configuración' },
            { role: 'admin',   desc: 'acceso completo a /casa' },
          ].map(({ role, desc }) => {
            const rc = ROLE_COLOR[role]
            return (
              <div key={role} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: rc.bg, color: rc.text, textTransform: 'uppercase',
                  letterSpacing: '0.05em', flexShrink: 0, marginTop: 2,
                }}>
                  {role}
                </span>
                <span style={{ fontSize: 12, color: '#6b6a64', lineHeight: 1.5 }}>{desc}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
