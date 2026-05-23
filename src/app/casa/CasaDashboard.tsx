'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import AdminShell from './AdminShell'

const CARDS = [
  { title: 'tienda',        desc: 'productos, stock y precios',            href: '/casa/tienda',                accent: '#ff0100' },
  { title: 'inventario',    desc: 'SKUs, stock y movimientos',             href: '/casa/inventario',            accent: '#003a87' },
  { title: 'órdenes',       desc: 'compras, envíos y estados',             href: '/casa/ordenes',               accent: '#003a87' },
  { title: 'boletos',       desc: 'boletos vendidos, validación y scanner', href: '/casa/boletos',              accent: '#ff0100' },
  { title: 'descuentos',    desc: 'códigos de descuento y promociones',    href: '/casa/descuentos',            accent: '#1a6b35' },
  { title: 'cuentas',       desc: 'fans con cuenta + compradores invitados', href: '/casa/cuentas',               accent: '#00c4df' },
  { title: 'artistas',      desc: 'catálogo, bios y shows',                href: '/casa/artistas',              accent: '#ffd49a' },
  { title: 'correos',       desc: 'historial y envíos masivos',            href: '/casa/correos',               accent: '#ffd49a' },
  { title: 'configuración', desc: 'stripe, skydropx y tarifas',            href: '/casa/tienda/configuracion',  accent: '#6b6a64' },
  { title: 'editor',        desc: 'contenido y apariencia del sitio',      href: '/casa/editor',                accent: '#ffe200' },
  { title: 'media',         desc: 'imágenes y archivos',                   href: '/casa/media',                 accent: '#9a9994' },
  { title: 'bitácora',     desc: 'historial de acciones admin',            href: '/casa/bitacora',              accent: '#6b6a64' },
  { title: 'desarrollo',   desc: 'progreso, changelog y tareas',           href: '/casa/desarrollo',            accent: '#ffe200' },
]

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: 'pendiente', bg: '#f0efe9',              text: '#6b6a64' },
  paid:      { label: 'pagado',    bg: 'rgba(0,58,135,0.08)',  text: '#003a87' },
  shipped:   { label: 'enviado',   bg: 'rgba(0,196,223,0.1)',  text: '#007a8c' },
  delivered: { label: 'entregado', bg: 'rgba(26,107,53,0.08)', text: '#1a6b35' },
  refunded:  { label: 'reembolso', bg: 'rgba(255,1,0,0.06)',   text: '#cc0000' },
  failed:    { label: 'fallido',   bg: 'rgba(255,1,0,0.06)',   text: '#cc0000' },
}

const B = '#e8e7e1', M = '#6b6a64', S = '#9a9994'

// ── Types ──────────────────────────────────────────────────────────────────────
type ArtistSnap = {
  id: string; name: string; city: string | null; image_url: string | null
  bg_color: string; stripe_color: string; is_published: boolean
  shows_count: number; tasks_pending: number
}
type PendingOrder = {
  id: string; folio_number: number; customer_name: string | null
  customer_email: string; total_mxn: number; created_at: string
}
type RecentOrder = {
  id: string; folio_number: number; customer_name: string | null
  customer_email: string; total_mxn: number; status: string
  created_at: string; is_test: boolean
}
type LowStockProduct = { id: string; name: string; total_stock: number }

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, href, accent, warn }: {
  label: string; value: string | number; sub?: string
  href: string; accent: string; warn?: boolean
}) {
  return (
    <Link href={href} style={{
      display: 'block', background: '#fff', border: `1px solid ${warn ? 'rgba(204,119,0,0.25)' : B}`,
      borderRadius: 8, padding: '20px 22px', textDecoration: 'none',
      transition: 'box-shadow 140ms, border-color 140ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 14px -4px rgba(10,10,10,0.1)'; e.currentTarget.style.borderColor = '#0a0a0a' }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = warn ? 'rgba(204,119,0,0.25)' : B }}
    >
      <div style={{ width: 28, height: 3, background: accent, borderRadius: 2, marginBottom: 14 }} />
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0a0a0a', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: M, marginTop: 6, letterSpacing: '0.02em' }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: S, marginTop: 3 }}>{sub}</div>}
    </Link>
  )
}

// ── Alert bar ─────────────────────────────────────────────────────────────────
function AlertBar({ staleOrders, outOfStockCount, lowStockCount }: {
  staleOrders: PendingOrder[]
  outOfStockCount: number
  lowStockCount: number
}) {
  const alerts: { text: string; href: string }[] = []
  if (staleOrders.length > 0)
    alerts.push({ text: `${staleOrders.length} orden${staleOrders.length > 1 ? 'es' : ''} pagada${staleOrders.length > 1 ? 's' : ''} sin enviar +48h`, href: '/casa/ordenes' })
  if (outOfStockCount > 0)
    alerts.push({ text: `${outOfStockCount} producto${outOfStockCount > 1 ? 's' : ''} publicado${outOfStockCount > 1 ? 's' : ''} agotado${outOfStockCount > 1 ? 's' : ''}`, href: '/casa/tienda' })
  if (lowStockCount > 0)
    alerts.push({ text: `${lowStockCount} producto${lowStockCount > 1 ? 's' : ''} con stock ≤ 5`, href: '/casa/tienda' })

  if (alerts.length === 0) return null

  return (
    <div style={{
      background: 'rgba(255,100,0,0.06)', border: '1px solid rgba(255,100,0,0.2)',
      borderRadius: 8, padding: '12px 18px', marginBottom: 24,
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc5500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#cc5500' }}>atención:</span>
      {alerts.map((a, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link href={a.href} style={{ fontSize: 12, color: '#993300', fontWeight: 600, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
            {a.text}
          </Link>
          {i < alerts.length - 1 && <span style={{ color: '#cc5500', fontSize: 12 }}>·</span>}
        </span>
      ))}
    </div>
  )
}

// ── Activity feed ─────────────────────────────────────────────────────────────
function ActivityFeed({ orders }: { orders: RecentOrder[] }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? orders : orders.slice(0, 6)

  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${B}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          actividad reciente
        </span>
        <Link href="/casa/ordenes" style={{ fontSize: 12, color: M, textDecoration: 'none' }}>ver todas →</Link>
      </div>

      {orders.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: M, fontSize: 13, fontStyle: 'italic' }}>
          sin órdenes todavía.
        </div>
      ) : (
        <>
          {visible.map(o => {
            const meta = STATUS_META[o.status] ?? STATUS_META.pending
            const date = new Date(o.created_at)
            const dateStr = date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
            const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            return (
              <Link key={o.id} href={`/casa/ordenes/${o.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 20px', borderBottom: `1px solid ${B}`,
                textDecoration: 'none', transition: 'background 100ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fafaf8' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', fontFamily: 'var(--font-mono)' }}>
                      #{o.folio_number}
                    </span>
                    {o.is_test && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#6b6a64', background: '#f0efe9', padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        prueba
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: M, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.customer_name ?? o.customer_email}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.text, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                  {meta.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0a0a0a', flexShrink: 0 }}>
                  {fmt(o.total_mxn)}
                </span>
                <span style={{ fontSize: 11, color: S, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {dateStr} {timeStr}
                </span>
              </Link>
            )
          })}
          {orders.length > 6 && (
            <button onClick={() => setShowAll(s => !s)} style={{
              width: '100%', padding: '10px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 12, color: M, transition: 'background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fafaf8' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              {showAll ? 'ver menos ↑' : `ver ${orders.length - 6} más ↓`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Pending to ship ────────────────────────────────────────────────────────────
function PendingShipPanel({ orders }: { orders: PendingOrder[] }) {
  if (orders.length === 0) return null
  const now = Date.now()
  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${B}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          por enviar · {orders.length}
        </span>
        <Link href="/casa/ordenes" style={{ fontSize: 12, color: M, textDecoration: 'none' }}>gestionar →</Link>
      </div>
      {orders.map(o => {
        const hoursAgo = Math.floor((now - new Date(o.created_at).getTime()) / 3600000)
        const isStale  = hoursAgo >= 48
        return (
          <Link key={o.id} href={`/casa/ordenes/${o.id}`} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 20px', borderBottom: `1px solid ${B}`,
            textDecoration: 'none', transition: 'background 100ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fafaf8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', fontFamily: 'var(--font-mono)' }}>
                #{o.folio_number}
              </div>
              <div style={{ fontSize: 11, color: M, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {o.customer_name ?? o.customer_email}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0a0a0a' }}>
                {fmt(o.total_mxn)}
              </div>
              <div style={{ fontSize: 11, color: isStale ? '#cc5500' : M, fontWeight: isStale ? 700 : 400, marginTop: 2 }}>
                {hoursAgo < 1 ? 'hace menos de 1h' : `hace ${hoursAgo}h`}
                {isStale && ' ⚠'}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── Artistas section ───────────────────────────────────────────────────────────
function ArtistasSection({ artists }: { artists: ArtistSnap[] }) {
  if (artists.length === 0) return null
  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${B}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          artistas
        </span>
        <Link href="/casa/artistas" style={{ fontSize: 12, color: M, textDecoration: 'none' }}>ver todos →</Link>
      </div>
      {artists.map(a => (
        <Link key={a.id} href={`/casa/artistas/${a.id}`} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 20px', borderBottom: `1px solid ${B}`,
          textDecoration: 'none', transition: 'background 100ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fafaf8' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: a.bg_color, overflow: 'hidden', position: 'relative' }}>
            {a.image_url
              ? <img src={a.image_url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ position: 'absolute', bottom: 5, left: 5, width: 12, height: 2.5, background: a.stripe_color, borderRadius: 2 }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.name}
            </div>
            <div style={{ fontSize: 11, color: M, marginTop: 2, display: 'flex', gap: 8 }}>
              {!a.is_published && <span style={{ color: S, fontStyle: 'italic' }}>borrador</span>}
              {a.shows_count > 0 && <span>{a.shows_count} show{a.shows_count !== 1 ? 's' : ''}</span>}
              {a.tasks_pending > 0 && <span style={{ color: '#cc0000', fontWeight: 600 }}>{a.tasks_pending} tarea{a.tasks_pending !== 1 ? 's' : ''}</span>}
              {a.tasks_pending === 0 && a.shows_count === 0 && <span style={{ fontStyle: 'italic' }}>sin actividad</span>}
            </div>
          </div>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke={S} strokeWidth="1.5" style={{ flexShrink: 0 }}><path d="M3 7h8M7 3l4 4-4 4"/></svg>
        </Link>
      ))}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function CasaDashboard({
  email, firstName, artists = [],
  revenue30d, pendingOrders, staleOrders,
  recentOrders, lowStockProducts, outOfStockCount, activeArtists,
}: {
  email: string
  firstName: string
  artists: ArtistSnap[]
  revenue30d: number
  pendingOrders: PendingOrder[]
  staleOrders: PendingOrder[]
  recentOrders: RecentOrder[]
  lowStockProducts: LowStockProduct[]
  outOfStockCount: number
  activeArtists: number
}) {
  return (
    <AdminShell
      crumb="casa"
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="adm-header-email">{email}</span>
          <UserButton />
        </div>
      }
    >
      <main style={{ maxWidth: 1080, margin: '0 auto' }} className="adm-main-pad">

        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 900,
            letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 4, textTransform: 'lowercase',
          }}>
            hola, {firstName}.
          </h1>
          <p style={{ color: M, fontSize: 13, margin: 0 }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* KPI row */}
        <div className="adm-kpi-grid">
          <KpiCard
            label="ingresos 30d"
            value={fmt(revenue30d)}
            sub="pagados + enviados"
            href="/casa/ordenes"
            accent="#1a6b35"
          />
          <KpiCard
            label="por enviar"
            value={pendingOrders.length}
            sub={pendingOrders.length === 1 ? '1 orden pagada' : `${pendingOrders.length} órdenes pagadas`}
            href="/casa/ordenes"
            accent={pendingOrders.length > 0 ? '#003a87' : '#0a0a0a'}
            warn={staleOrders.length > 0}
          />
          <KpiCard
            label="stock bajo"
            value={lowStockProducts.length + outOfStockCount}
            sub={outOfStockCount > 0 ? `${outOfStockCount} agotado${outOfStockCount > 1 ? 's' : ''}` : 'todos disponibles'}
            href="/casa/tienda"
            accent={lowStockProducts.length + outOfStockCount > 0 ? '#cc7700' : '#0a0a0a'}
            warn={outOfStockCount > 0}
          />
          <KpiCard
            label="artistas activos"
            value={activeArtists}
            sub={`de ${artists.length} en total`}
            href="/casa/artistas"
            accent="#00c4df"
          />
        </div>

        {/* Alert bar */}
        <AlertBar staleOrders={staleOrders} outOfStockCount={outOfStockCount} lowStockCount={lowStockProducts.length} />

        {/* Main grid */}
        <div className="adm-dash-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ActivityFeed orders={recentOrders} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PendingShipPanel orders={pendingOrders} />
            <ArtistasSection artists={artists} />
          </div>
        </div>

        {/* Nav cards */}
        <div style={{ borderTop: `1px solid ${B}`, paddingTop: 32, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
            secciones
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
            {CARDS.map(card => (
              <Link key={card.title} href={card.href} style={{
                display: 'block', background: '#fff', border: `1px solid ${B}`,
                borderRadius: 6, padding: '18px 20px', textDecoration: 'none',
                transition: 'box-shadow 140ms, border-color 140ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 14px -6px rgba(10,10,10,0.1)'; e.currentTarget.style.borderColor = '#d4d3cd' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = B }}
              >
                <div style={{ width: 28, height: 3, background: card.accent, borderRadius: 2, marginBottom: 14 }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0a0a0a', marginBottom: 4, letterSpacing: '-0.01em' }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 12, color: M, lineHeight: 1.5 }}>{card.desc}</div>
              </Link>
            ))}
          </div>
        </div>

      </main>
    </AdminShell>
  )
}
