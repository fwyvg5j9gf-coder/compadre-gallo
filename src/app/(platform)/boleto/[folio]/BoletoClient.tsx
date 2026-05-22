'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { markTicketUsed, markTicketConfirmed } from './actions'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

type Show = {
  venue: string; city: string; date: string
  artists: { name: string; slug: string; bg_color: string; stripe_color: string; image_url: string | null } | null
}

type Ticket = {
  id: string
  folio_code: string
  status: string
  quantity: number
  unit_price_mxn: number
  total_mxn: number
  customer_name: string | null
  customer_email: string
  created_at: string
  shows: Show | null
}

export default function BoletoClient({ ticket, isAdmin }: { ticket: Ticket; isAdmin: boolean }) {
  const [status, setStatus] = useState(ticket.status)
  const [isPending, startTransition] = useTransition()

  const show = ticket.shows
  const artist = show?.artists
  const isValid = status === 'confirmed'
  const isUsed = status === 'used'

  function handleMarkUsed() {
    startTransition(async () => {
      await markTicketUsed(ticket.id, ticket.folio_code)
      setStatus('used')
    })
  }

  function handleUndo() {
    startTransition(async () => {
      await markTicketConfirmed(ticket.id, ticket.folio_code)
      setStatus('confirmed')
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f5f1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Status banner */}
        <div style={{
          borderRadius: 8, padding: '20px 24px',
          background: isValid ? '#0a0a0a' : isUsed ? '#cc0000' : '#6b6a64',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: isValid ? '#ffe200' : 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isValid ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>
              {isValid ? 'válido' : isUsed ? 'ya usado' : status}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
              {isValid ? 'boleto disponible para entrada' : isUsed ? 'este boleto ya fue canjeado' : ''}
            </div>
          </div>
        </div>

        {/* Ticket card */}
        <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e7e1' }}>
          {/* Artist header */}
          {artist && (
            <div style={{
              background: artist.bg_color, padding: '20px 24px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: artist.stripe_color }} />
              {artist.image_url && (
                <img src={artist.image_url} alt={artist.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }} />
              )}
              <div style={{ position: 'relative', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, textTransform: 'lowercase', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                {artist.name}
              </div>
            </div>
          )}

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Folio */}
            <div style={{ textAlign: 'center', padding: '16px', background: '#f6f5f1', borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9994', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>folio</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 26, color: '#003a87', letterSpacing: '0.06em' }}>
                {ticket.folio_code}
              </div>
            </div>

            {/* Show details */}
            {show && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['venue', show.venue],
                    ['ciudad', show.city],
                    ['fecha', fmtDate(show.date)],
                    ['boletos', `${ticket.quantity} ${ticket.quantity === 1 ? 'boleto' : 'boletos'}`],
                    ['total', fmt(ticket.total_mxn)],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ padding: '7px 0', fontSize: 13, color: '#9a9994', width: 80, borderBottom: '1px solid #f0efe9' }}>{label}</td>
                      <td style={{ padding: '7px 0', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #f0efe9' }}>{value}</td>
                    </tr>
                  ))}
                  {isAdmin && (
                    <>
                      <tr>
                        <td style={{ padding: '7px 0', fontSize: 13, color: '#9a9994', borderBottom: '1px solid #f0efe9' }}>nombre</td>
                        <td style={{ padding: '7px 0', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #f0efe9' }}>{ticket.customer_name ?? '—'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '7px 0', fontSize: 13, color: '#9a9994' }}>correo</td>
                        <td style={{ padding: '7px 0', fontSize: 13, fontWeight: 600 }}>{ticket.customer_email}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            )}

            {/* Admin action */}
            {isAdmin && (
              <div style={{ borderTop: '1px solid #e8e7e1', paddingTop: 16, display: 'flex', gap: 10 }}>
                {isValid && (
                  <button
                    onClick={handleMarkUsed}
                    disabled={isPending}
                    style={{
                      flex: 1, padding: '14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: '#ff0100', color: '#fff', fontWeight: 900, fontSize: 16,
                      opacity: isPending ? 0.6 : 1, transition: 'opacity 120ms',
                    }}
                  >
                    {isPending ? 'procesando…' : '✓ marcar como usado'}
                  </button>
                )}
                {isUsed && (
                  <button
                    onClick={handleUndo}
                    disabled={isPending}
                    style={{
                      flex: 1, padding: '14px', borderRadius: 6, border: '1px solid #e8e7e1', cursor: 'pointer',
                      background: '#fff', color: '#6b6a64', fontWeight: 700, fontSize: 14,
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    {isPending ? '…' : 'deshacer'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <Link href="/" style={{ fontSize: 12, color: '#9a9994', textDecoration: 'none' }}>
            compadregallo.com
          </Link>
        </div>

      </div>
    </div>
  )
}
