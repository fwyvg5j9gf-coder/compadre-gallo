'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { markTicketUsed, markTicketConfirmed, resendTicketEmail } from './actions'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

type TicketRow = {
  id: string
  folio_code: string
  status: string
  quantity: number
  unit_price_mxn: number
  total_mxn: number
  customer_name: string | null
  customer_email: string
  created_at: string
  shows: {
    venue: string
    city: string
    date: string
    artist_id: string
    artists: { name: string; bg_color: string; stripe_color: string } | null
  } | null
}

type Props = {
  tickets: TicketRow[]
  stats: { total: number; confirmed: number; used: number; revenue: number }
}

const STATUS_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: 'rgba(0,58,135,0.08)', text: '#003a87', label: 'válido' },
  used:      { bg: 'rgba(255,1,0,0.08)',  text: '#cc0000', label: 'usado' },
  pending:   { bg: '#f0efe9',             text: '#6b6a64', label: 'pendiente' },
}

function TicketRow({ ticket }: { ticket: TicketRow }) {
  const [status, setStatus] = useState(ticket.status)
  const [emailSent, setEmailSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  const chip = STATUS_CHIP[status] ?? STATUS_CHIP.pending
  const artist = ticket.shows?.artists

  function handleToggle() {
    const next = status === 'confirmed' ? 'used' : 'confirmed'
    setStatus(next)
    startTransition(async () => {
      if (next === 'used') await markTicketUsed(ticket.id, ticket.folio_code)
      else await markTicketConfirmed(ticket.id, ticket.folio_code)
    })
  }

  function handleResend() {
    startTransition(async () => {
      await resendTicketEmail(ticket.id)
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 3000)
    })
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '6px 1fr auto',
      background: '#fff',
      borderBottom: '1px solid #f0efe9',
      minHeight: 56,
      opacity: isPending ? 0.6 : 1,
      transition: 'opacity 150ms',
    }}>
      {/* Color stripe */}
      <div style={{ background: artist?.stripe_color ?? '#e8e7e1' }} />

      {/* Main content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr 1fr 90px 80px',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
      }} className="adm-boletos-row-inner">
        {/* Folio */}
        <a
          href={`/boleto/${ticket.folio_code}`}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
            color: '#003a87', textDecoration: 'none', letterSpacing: '0.04em',
          }}
        >
          {ticket.folio_code}
        </a>

        {/* Show info */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.3 }}>
            {artist?.name ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: '#9a9994', marginTop: 2 }}>
            {ticket.shows?.venue} · {ticket.shows?.city}
            {ticket.shows?.date ? ` · ${fmtDate(ticket.shows.date)}` : ''}
          </div>
        </div>

        {/* Customer */}
        <div>
          <div style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.3 }}>
            {ticket.customer_name ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: '#9a9994', marginTop: 2 }}>
            {ticket.customer_email}
          </div>
        </div>

        {/* Status */}
        <div>
          <span style={{
            display: 'inline-block',
            padding: '3px 8px', borderRadius: 4,
            background: chip.bg, color: chip.text,
            fontSize: 11, fontWeight: 700,
          }}>
            {chip.label}
          </span>
          <div style={{ fontSize: 10, color: '#9a9994', marginTop: 3 }}>
            {ticket.quantity} {ticket.quantity === 1 ? 'boleto' : 'boletos'}
          </div>
        </div>

        {/* Total */}
        <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>
          {fmt(ticket.total_mxn)}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 16px 0 0',
      }}>
        {/* Resend */}
        <button
          onClick={handleResend}
          disabled={isPending}
          title="reenviar correo de confirmación"
          style={{
            padding: '5px 10px', borderRadius: 4,
            border: '1px solid #e8e7e1', background: emailSent ? 'rgba(26,107,53,0.08)' : '#fff',
            color: emailSent ? '#1a6b35' : '#6b6a64',
            cursor: 'pointer', fontSize: 11, fontWeight: 700,
            transition: 'all 120ms',
            whiteSpace: 'nowrap',
          }}
        >
          {emailSent ? '✓ enviado' : 'reenviar'}
        </button>

        {/* Toggle used */}
        {(status === 'confirmed' || status === 'used') && (
          <button
            onClick={handleToggle}
            disabled={isPending}
            title={status === 'confirmed' ? 'marcar como usado' : 'marcar como válido'}
            style={{
              padding: '5px 10px', borderRadius: 4,
              border: '1px solid #e8e7e1',
              background: status === 'confirmed' ? 'rgba(255,1,0,0.06)' : 'rgba(0,58,135,0.06)',
              color: status === 'confirmed' ? '#cc0000' : '#003a87',
              cursor: 'pointer', fontSize: 11, fontWeight: 700,
              transition: 'all 120ms',
              whiteSpace: 'nowrap',
            }}
          >
            {status === 'confirmed' ? 'usar' : 'restaurar'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function BoletosClient({ tickets, stats }: Props) {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'used'>('all')
  const [search, setSearch] = useState('')

  const filtered = tickets.filter(t => {
    if (filter === 'confirmed' && t.status !== 'confirmed') return false
    if (filter === 'used' && t.status !== 'used') return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.folio_code.toLowerCase().includes(q) ||
        (t.customer_name?.toLowerCase().includes(q) ?? false) ||
        t.customer_email.toLowerCase().includes(q) ||
        (t.shows?.artists?.name.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const FILTERS: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all',       label: 'todos',     count: stats.total },
    { key: 'confirmed', label: 'válidos',   count: stats.confirmed },
    { key: 'used',      label: 'usados',    count: stats.used },
  ]

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto' }} className="adm-main-pad">

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24,
      }} className="adm-boletos-stats">
        {[
          { label: 'total boletos', value: stats.total, accent: '#003a87' },
          { label: 'válidos',       value: stats.confirmed, accent: '#003a87' },
          { label: 'usados',        value: stats.used, accent: '#cc0000' },
          { label: 'recaudado',     value: fmt(stats.revenue), accent: '#1a6b35' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 8, padding: '16px 20px',
            border: '1px solid #e8e7e1',
          }}>
            <div style={{ fontSize: 11, color: '#9a9994', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.accent, marginTop: 4, lineHeight: 1, fontFamily: 'monospace' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 6,
                border: filter === f.key ? '1px solid #0a0a0a' : '1px solid #e8e7e1',
                background: filter === f.key ? '#0a0a0a' : '#fff',
                color: filter === f.key ? '#fff' : '#6b6a64',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {f.label} <span style={{ opacity: 0.6 }}>({f.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="buscar por folio, nombre, correo o artista…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 220, padding: '7px 12px', borderRadius: 6,
            border: '1px solid #e8e7e1', fontSize: 13,
            outline: 'none', background: '#fff',
          }}
        />
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '6px 1fr auto',
        background: 'transparent',
        marginBottom: 4,
      }}>
        <div />
        <div style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 1fr 90px 80px',
          gap: 12, padding: '0 16px',
        }} className="adm-boletos-row-inner">
          {['folio', 'show', 'cliente', 'estado', 'total'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#9a9994', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </div>
          ))}
        </div>
        <div style={{ width: 120 }} />
      </div>

      {/* Rows */}
      <div style={{ background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9a9994', fontSize: 14 }}>
            {search ? `sin resultados para "${search}"` : 'sin boletos'}
          </div>
        ) : (
          filtered.map(t => <TicketRow key={t.id} ticket={t} />)
        )}
      </div>

      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#9a9994', textAlign: 'right' }}>
          {filtered.length} {filtered.length === 1 ? 'boleto' : 'boletos'}
        </div>
      )}
    </main>
  )
}
