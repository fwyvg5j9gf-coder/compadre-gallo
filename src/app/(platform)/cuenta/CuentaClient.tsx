'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { subscribeToArtist, unsubscribeFromArtist } from './actions'

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending: 'pendiente', paid: 'pagado', shipped: 'enviado',
  delivered: 'entregado', refunded: 'reembolsado', failed: 'fallido',
  confirmed: 'confirmado', cancelled: 'cancelado',
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

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function folio(n: number) {
  return `GALLO-${String(n).padStart(5, '0')}`
}

// ── types ────────────────────────────────────────────────────────────────────
type OrderItem = { product_name: string; quantity: number; unit_price_mxn: number; size: string | null }
type Order = {
  id: string; folio_number: number; status: string; total_mxn: number
  subtotal_mxn: number; shipping_mxn: number; created_at: string
  tracking_number: string | null; shipping_carrier: string | null
  shipping_address: Record<string, string> | null; order_items: OrderItem[]
}
type ShowInfo = { id: string; venue: string; city: string; date: string; artists: { name: string; slug: string; image_url: string | null } | null }
type Ticket = {
  id: string; show_id: string | null; quantity: number; unit_price_mxn: number
  total_mxn: number; folio_code: string; status: string; created_at: string
  shows: ShowInfo | null
}
type ArtistInfo = { id: string; name: string; slug: string; image_url: string | null; genre: string | null; city: string | null }
type Subscription = { id: string; artist_id: string; created_at: string; artists: ArtistInfo | null }

// ── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false)
  const items = order.order_items ?? []
  const sc = STATUS_COLOR[order.status] ?? { bg: 'rgba(107,106,100,0.1)', text: '#6b6a64' }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)', background: '#fff', border: 'none',
          cursor: 'pointer', gap: 'var(--space-4)', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#003a87', flexShrink: 0 }}>
            {folio(order.folio_number)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)', flexShrink: 0 }}>
            {new Date(order.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: sc.bg, color: sc.text, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 15 }}>{fmt(order.total_mxn)}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms', color: 'var(--fg-muted)' }}>
            <polyline points="4 6 8 10 12 6"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: 'var(--space-5)', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{item.product_name}</span>
                  {item.size && item.size !== 'única' && (
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)', marginLeft: 6 }}>talla {item.size}</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(item.unit_price_mxn * item.quantity)}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)', marginLeft: 6 }}>×{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fg-muted)' }}>
              <span>subtotal</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(order.subtotal_mxn)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fg-muted)' }}>
              <span>envío</span><span style={{ fontFamily: 'var(--font-mono)' }}>{order.shipping_mxn === 0 ? 'gratis' : fmt(order.shipping_mxn)}</span>
            </div>
          </div>
          {order.tracking_number && (
            <div style={{ background: 'rgba(0,58,135,0.06)', border: '1px solid rgba(0,58,135,0.15)', borderRadius: 6, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#007a8c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                guía de rastreo {order.shipping_carrier ? `· ${order.shipping_carrier}` : ''}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#003a87' }}>
                {order.tracking_number}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── TicketCard ───────────────────────────────────────────────────────────────
function TicketCard({ ticket }: { ticket: Ticket }) {
  const show = ticket.shows
  const sc = STATUS_COLOR[ticket.status] ?? STATUS_COLOR.confirmed
  const showDate = show?.date ? new Date(show.date) : null

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {show ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                {show.artists?.name ?? 'artista'} — {show.venue}
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                {show.city}
                {showDate && ` · ${showDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`}
              </div>
            </>
          ) : (
            <div style={{ fontWeight: 700, fontSize: 15 }}>boleto</div>
          )}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#003a87', fontWeight: 700 }}>
              {ticket.folio_code}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {STATUS_LABEL[ticket.status] ?? ticket.status}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>{fmt(ticket.total_mxn)}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{ticket.quantity} {ticket.quantity === 1 ? 'boleto' : 'boletos'}</div>
        </div>
      </div>
    </div>
  )
}

// ── ArtistSubCard ────────────────────────────────────────────────────────────
function ArtistSubCard({
  artist, isSubscribed, email, onToggle,
}: {
  artist: ArtistInfo; isSubscribed: boolean; email: string; onToggle: (id: string, subscribed: boolean) => void
}) {
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    startTransition(async () => {
      onToggle(artist.id, isSubscribed)
      if (isSubscribed) {
        await unsubscribeFromArtist(artist.id)
      } else {
        await subscribeToArtist(artist.id, email)
      }
    })
  }

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8, padding: 'var(--space-4)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-4)', background: '#fff',
    }}>
      <div style={{ width: 52, height: 52, borderRadius: 999, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-soft)' }}>
        {artist.image_url ? (
          <Image src={artist.image_url} alt={artist.name} width={52} height={52} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)' }}>
            {artist.name[0]}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/artista/${artist.slug}`} style={{ fontWeight: 700, fontSize: 15, textDecoration: 'none', color: 'var(--fg)', display: 'block' }}>
          {artist.name}
        </Link>
        {(artist.genre || artist.city) && (
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 1 }}>
            {[artist.genre, artist.city].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        style={{
          flexShrink: 0,
          padding: '8px 16px',
          borderRadius: 4,
          border: isSubscribed ? '1px solid var(--border)' : '1px solid #0a0a0a',
          background: isSubscribed ? '#fff' : '#0a0a0a',
          color: isSubscribed ? 'var(--fg-muted)' : '#fff',
          fontWeight: 600,
          fontSize: 13,
          cursor: pending ? 'default' : 'pointer',
          opacity: pending ? 0.5 : 1,
          transition: 'opacity 150ms',
        }}
      >
        {isSubscribed ? 'siguiendo' : 'seguir'}
      </button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
type Tab = 'pedidos' | 'boletos' | 'artistas' | 'perfil'

export default function CuentaClient({
  orders, tickets, subscriptions, allArtists, firstName, email, userId: _userId,
}: {
  orders: Order[]
  tickets: Ticket[]
  subscriptions: Subscription[]
  allArtists: ArtistInfo[]
  firstName: string
  email: string
  userId: string
}) {
  const [tab, setTab] = useState<Tab>('pedidos')
  const [localSubs, setLocalSubs] = useState<Set<string>>(
    new Set(subscriptions.map(s => s.artist_id)),
  )
  const { signOut } = useClerk()
  const router = useRouter()

  const activeOrders = orders.filter(o => ['paid', 'shipped'].includes(o.status))
  const historyOrders = orders.filter(o => !['paid', 'shipped'].includes(o.status))
  const upcomingTickets = tickets.filter(t => t.shows?.date && new Date(t.shows.date) >= new Date())
  const pastTickets = tickets.filter(t => !upcomingTickets.includes(t))

  const handleToggleSub = (artistId: string, wasSubscribed: boolean) => {
    setLocalSubs(prev => {
      const next = new Set(prev)
      if (wasSubscribed) next.delete(artistId)
      else next.add(artistId)
      return next
    })
  }

  const NAV: { key: Tab; label: string; count?: number }[] = [
    { key: 'pedidos', label: 'pedidos', count: orders.length || undefined },
    { key: 'boletos', label: 'boletos', count: tickets.length || undefined },
    { key: 'artistas', label: 'artistas' },
    { key: 'perfil', label: 'perfil' },
  ]

  return (
    <div className="account-grid">
      {/* Sidebar */}
      <aside className="account-sidebar">
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontWeight: 700, fontSize: 17, textTransform: 'lowercase' }}>{firstName}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>{email}</div>
        </div>
        {NAV.map(({ key, label, count }) => (
          <button
            key={key}
            className={`account-nav-item${tab === key ? ' is-active' : ''}`}
            onClick={() => setTab(key)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>{label}</span>
            {count !== undefined && (
              <span style={{
                fontSize: 11, fontWeight: 700, minWidth: 20, height: 20,
                borderRadius: 999, background: tab === key ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.07)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 6px',
              }}>
                {count}
              </span>
            )}
          </button>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-6)' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--fg-muted)' }}
            onClick={() => signOut(() => router.push('/'))}
          >
            cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div>
        {/* ── Pedidos ── */}
        {tab === 'pedidos' && (
          <>
            {orders.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <h2>mis pedidos</h2>
                <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                  todavía no has hecho ningún pedido.{' '}
                  <Link href="/tienda" style={{ borderBottom: '1px solid currentColor' }}>ponle</Link>.
                </p>
              </div>
            ) : (
              <>
                {activeOrders.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-7)' }}>
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>en camino</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {activeOrders.map(o => <OrderCard key={o.id} order={o} />)}
                    </div>
                  </div>
                )}
                {historyOrders.length > 0 && (
                  <div>
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>{activeOrders.length > 0 ? 'historial' : 'mis pedidos'}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {historyOrders.map(o => <OrderCard key={o.id} order={o} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Boletos ── */}
        {tab === 'boletos' && (
          <>
            {tickets.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <h2>mis boletos</h2>
                <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                  no tienes boletos todavía.{' '}
                  <Link href="/artistas" style={{ borderBottom: '1px solid currentColor' }}>mira las fechas</Link>.
                </p>
              </div>
            ) : (
              <>
                {upcomingTickets.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-7)' }}>
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>próximos</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {upcomingTickets.map(t => <TicketCard key={t.id} ticket={t} />)}
                    </div>
                  </div>
                )}
                {pastTickets.length > 0 && (
                  <div>
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>{upcomingTickets.length > 0 ? 'pasados' : 'mis boletos'}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {pastTickets.map(t => <TicketCard key={t.id} ticket={t} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Artistas ── */}
        {tab === 'artistas' && (
          <div>
            <h2 style={{ marginBottom: 4 }}>artistas</h2>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 'var(--space-6)' }}>
              sigue a tus artistas para recibir noticias y drops.
            </p>
            {allArtists.length === 0 ? (
              <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>no hay artistas publicados todavía.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {allArtists.map(a => (
                  <ArtistSubCard
                    key={a.id}
                    artist={a}
                    isSubscribed={localSubs.has(a.id)}
                    email={email}
                    onToggle={handleToggleSub}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Perfil ── */}
        {tab === 'perfil' && (
          <>
            <h2 style={{ marginBottom: 'var(--space-6)' }}>perfil</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', maxWidth: 560 }}>
              <div className="field">
                <label>nombre</label>
                <input type="text" defaultValue={firstName} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>correo</label>
                <input type="email" defaultValue={email} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
            <p style={{ marginTop: 'var(--space-4)', fontSize: 13, color: 'var(--fg-muted)' }}>
              para cambiar tu nombre o correo, ve a tu perfil de Clerk.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
