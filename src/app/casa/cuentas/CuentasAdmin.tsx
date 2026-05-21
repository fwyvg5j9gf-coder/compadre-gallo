'use client'

import { useState, useEffect } from 'react'
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

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: 'rgba(107,106,100,0.1)', text: '#6b6a64' },
  paid:      { bg: 'rgba(0,58,135,0.08)',   text: '#003a87' },
  shipped:   { bg: 'rgba(0,196,223,0.1)',   text: '#007a8c' },
  delivered: { bg: 'rgba(26,107,53,0.08)',  text: '#1a6b35' },
  refunded:  { bg: 'rgba(255,212,154,0.3)', text: '#6b4a10' },
  failed:    { bg: 'rgba(255,1,0,0.07)',    text: '#cc0000' },
  confirmed: { bg: 'rgba(26,107,53,0.08)',  text: '#1a6b35' },
  cancelled: { bg: 'rgba(107,106,100,0.1)', text: '#6b6a64' },
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'pendiente', paid: 'pagado', shipped: 'enviado',
  delivered: 'entregado', refunded: 'reembolsado', failed: 'fallido',
  confirmed: 'confirmado', cancelled: 'cancelado',
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

type OrderItem = { product_name: string; quantity: number; unit_price_mxn: number; size: string | null }
type OrderDetail = {
  id: string; folio_number: number; status: string
  total_mxn: number; subtotal_mxn: number; shipping_mxn: number
  created_at: string; order_items: OrderItem[]
}
type TicketDetail = {
  id: string; folio_code: string; status: string
  quantity: number; total_mxn: number; created_at: string
  shows: { venue: string; city: string; date: string; artists: { name: string } | null } | null
}
type SubDetail = {
  id: string; created_at: string
  artists: { name: string; slug: string; genre: string | null; city: string | null } | null
}
type UserDetailData = {
  user: RegisteredUser
  orders: OrderDetail[]
  tickets: TicketDetail[]
  subscriptions: SubDetail[]
}

function fmt(n: number) {
  return (n / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

function folio(n: number) {
  return `GALLO-${String(n).padStart(5, '0')}`
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

function StatusBadge({ status }: { status: string }) {
  const sc = STATUS_COLOR[status] ?? STATUS_COLOR.pending
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
      background: sc.bg, color: sc.text, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ── Drawer de detalle ─────────────────────────────────────────────────────────
function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<UserDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setDetail(null)
    fetch(`/api/admin/user-detail?id=${encodeURIComponent(userId)}`)
      .then(r => r.json())
      .then((data: UserDetailData & { error?: string }) => {
        if (data.error) { setError(data.error); return }
        setDetail(data)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'error'))
      .finally(() => setLoading(false))
  }, [userId])

  const u = detail?.user
  const rc = u ? (ROLE_COLOR[u.role] ?? ROLE_COLOR.fan) : null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.25)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: 500, maxWidth: '95vw',
        background: '#fff', borderLeft: `1px solid ${B}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: `1px solid ${B}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            {u ? (
              <>
                {u.username ? (
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 20, color: '#0a0a0a', letterSpacing: '-0.01em' }}>
                    @{u.username}
                  </div>
                ) : (
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#0a0a0a' }}>
                    {u.name ?? u.email}
                  </div>
                )}
                {u.username && (
                  <div style={{ fontSize: 13, color: M, marginTop: 2 }}>{u.name ?? u.email}</div>
                )}
                <div style={{ fontSize: 12, color: S, marginTop: 1 }}>{u.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  {rc && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: rc.bg, color: rc.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {u.role}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: S }}>desde {fmtDate(u.created_at)}</span>
                </div>
              </>
            ) : loading ? (
              <div style={{ height: 20, width: 180, background: '#f0efe9', borderRadius: 4 }} />
            ) : (
              <div style={{ fontSize: 14, color: '#cc0000' }}>{error ?? 'no encontrado'}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 6,
              border: `1px solid ${B}`, background: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: M,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 60, background: '#f6f5f1', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          )}

          {!loading && detail && (
            <>
              {/* ── Pedidos ── */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: S, marginBottom: 10 }}>
                  pedidos ({detail.orders.length})
                </div>
                {detail.orders.length === 0 ? (
                  <div style={{ fontSize: 13, color: S, fontStyle: 'italic' }}>sin pedidos</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.orders.map(o => (
                      <div key={o.id} style={{ border: `1px solid ${B}`, borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{
                          padding: '10px 14px', background: '#f9f8f4',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#003a87', flexShrink: 0 }}>
                              {folio(o.folio_number)}
                            </span>
                            <StatusBadge status={o.status} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#0a0a0a' }}>
                              {fmt(o.total_mxn)}
                            </span>
                            <span style={{ fontSize: 11, color: S }}>{fmtDate(o.created_at)}</span>
                          </div>
                        </div>
                        {o.order_items?.length > 0 && (
                          <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {o.order_items.map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: M }}>
                                <span>
                                  {item.product_name}
                                  {item.size && item.size !== 'única' ? ` (${item.size})` : ''}
                                  {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                                </span>
                                <span style={{ fontFamily: 'monospace', color: '#0a0a0a' }}>
                                  {fmt(item.unit_price_mxn * item.quantity)}
                                </span>
                              </div>
                            ))}
                            {o.shipping_mxn > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: S }}>
                                <span>envío</span>
                                <span style={{ fontFamily: 'monospace' }}>{fmt(o.shipping_mxn)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Boletos ── */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: S, marginBottom: 10 }}>
                  boletos ({detail.tickets.length})
                </div>
                {detail.tickets.length === 0 ? (
                  <div style={{ fontSize: 13, color: S, fontStyle: 'italic' }}>sin boletos</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.tickets.map(t => {
                      const show = t.shows
                      return (
                        <div key={t.id} style={{
                          border: `1px solid ${B}`, borderRadius: 6, padding: '10px 14px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
                        }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', marginBottom: 2 }}>
                              {show ? `${show.artists?.name ?? 'artista'} — ${show.venue}` : 'boleto'}
                            </div>
                            {show && (
                              <div style={{ fontSize: 11, color: M }}>
                                {show.city}
                                {show.date ? ` · ${fmtDate(show.date)}` : ''}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#003a87', fontWeight: 700 }}>
                                {t.folio_code}
                              </span>
                              <StatusBadge status={t.status} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{fmt(t.total_mxn)}</div>
                            <div style={{ fontSize: 11, color: S, marginTop: 1 }}>{t.quantity} {t.quantity === 1 ? 'bol.' : 'bols.'}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Artistas seguidos ── */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: S, marginBottom: 10 }}>
                  artistas seguidos ({detail.subscriptions.length})
                </div>
                {detail.subscriptions.length === 0 ? (
                  <div style={{ fontSize: 13, color: S, fontStyle: 'italic' }}>no sigue a nadie</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.subscriptions.map(sub => {
                      const a = sub.artists
                      return (
                        <div key={sub.id} style={{
                          border: `1px solid ${B}`, borderRadius: 6, padding: '10px 14px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                        }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{a?.name ?? '—'}</div>
                            {(a?.genre || a?.city) && (
                              <div style={{ fontSize: 11, color: M, marginTop: 1 }}>
                                {[a.genre, a.city].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: S, flexShrink: 0 }}>desde {fmtDate(sub.created_at)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Tab: Con cuenta ───────────────────────────────────────────────────────────
function ConCuentaTab({ users }: { users: RegisteredUser[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
          const isSelected = selectedId === u.clerk_user_id

          return (
            <div
              key={u.clerk_user_id}
              onClick={() => setSelectedId(u.clerk_user_id)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 110px 80px 80px 80px 130px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? `1px solid ${B}` : 'none',
                transition: 'background 120ms', cursor: 'pointer',
                background: isSelected ? '#f0f4ff' : '#fff',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafaf8' }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
            >
              {/* Identity */}
              <div style={{ minWidth: 0 }}>
                {handle ? (
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#0a0a0a', letterSpacing: '-0.01em' }}>
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
          {filtered.length} {filtered.length === 1 ? 'cuenta' : 'cuentas'} · clic en una fila para ver detalle
        </div>
      )}

      {/* Drawer */}
      {selectedId && (
        <UserDrawer userId={selectedId} onClose={() => setSelectedId(null)} />
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
