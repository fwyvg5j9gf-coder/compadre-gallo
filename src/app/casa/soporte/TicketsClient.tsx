'use client'

import { useState, useTransition } from 'react'
import { replyToTicket, setTicketStatus, type Ticket, type TicketStatus } from './ticketActions'

const STATUS_CHIP: Record<TicketStatus, { bg: string; text: string; label: string }> = {
  open:     { bg: 'rgba(0,58,135,0.10)',   text: '#003a87', label: 'abierto' },
  pending:  { bg: 'rgba(184,121,10,0.12)', text: '#8a5a00', label: 'esperando' },
  resolved: { bg: 'rgba(26,107,53,0.09)',  text: '#1a6b35', label: 'resuelto' },
  closed:   { bg: '#f0efe9',               text: '#6b6a64', label: 'cerrado' },
}

const FILTROS: { key: 'todos' | TicketStatus; label: string }[] = [
  { key: 'todos', label: 'todos' },
  { key: 'open', label: 'abiertos' },
  { key: 'pending', label: 'esperando' },
  { key: 'resolved', label: 'resueltos' },
  { key: 'closed', label: 'cerrados' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function Burbuja({ m }: { m: Ticket['messages'][number] }) {
  const esNuestro = m.direction === 'outbound'
  return (
    <div style={{ display: 'flex', justifyContent: esNuestro ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
      <div style={{ maxWidth: '82%', minWidth: 0 }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4,
          justifyContent: esNuestro ? 'flex-end' : 'flex-start',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: esNuestro ? '#003a87' : '#0a0a0a' }}>
            {esNuestro ? 'gallo' : (m.sender_name ?? m.sender_email)}
          </span>
          <span style={{ fontSize: 11, color: '#9a9994' }}>{fmtDate(m.created_at)}</span>
        </div>
        <div style={{
          background: esNuestro ? 'rgba(0,58,135,0.06)' : '#f7f5f0',
          borderRadius: 8, padding: '12px 14px', overflowX: 'auto',
        }}>
          {m.body_html ? (
            <iframe
              srcDoc={m.body_html}
              style={{ width: '100%', minHeight: 120, border: 'none' }}
              // sandbox vacío: ni scripts ni acceso al origen. El HTML ya viene
              // sanitizado, esto es la segunda capa.
              sandbox=""
              title="cuerpo del mensaje"
            />
          ) : (
            <pre style={{
              margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6,
              fontFamily: 'var(--font-sans)', color: '#0a0a0a',
            }}>{m.body_text ?? 'sin contenido'}</pre>
          )}
        </div>
      </div>
    </div>
  )
}

function Hilo({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const [replyText, setReplyText] = useState('')
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function enviar() {
    if (!replyText.trim()) return
    startTransition(async () => {
      await replyToTicket(ticket.id, replyText)
      setSent(true)
      setReplyText('')
    })
  }

  function cambiarEstado(status: TicketStatus) {
    startTransition(async () => { await setTicketStatus(ticket.id, status) })
  }

  const chip = STATUS_CHIP[ticket.status]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, zIndex: 50,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 10, width: '100%', maxWidth: 680,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e8e7e1', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                background: chip.bg, color: chip.text, padding: '2px 8px', borderRadius: 3,
              }}>{chip.label}</span>
              <span style={{ fontSize: 12, color: '#9a9994' }}>{ticket.messages.length} mensaje{ticket.messages.length === 1 ? '' : 's'}</span>
            </div>
            <h3 style={{ margin: '0 0 2px', fontSize: 16 }}>{ticket.subject}</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#6b6a64' }}>
              {ticket.customer_name ? `${ticket.customer_name} · ` : ''}{ticket.customer_email}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a9994', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ padding: '18px 24px', overflowY: 'auto', flex: 1 }}>
          {ticket.messages.map(m => <Burbuja key={m.id} m={m} />)}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e8e7e1' }}>
          {sent ? (
            <div style={{ padding: '12px 16px', background: 'rgba(26,107,53,0.08)', borderRadius: 6, color: '#1a6b35', fontSize: 13, fontWeight: 700 }}>
              ✓ respuesta enviada a {ticket.customer_email}
            </div>
          ) : (
            <>
              <textarea
                id={`reply-${ticket.id}`}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`responder a ${ticket.customer_name ?? ticket.customer_email}…`}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 6,
                  border: '1px solid #e8e7e1', fontSize: 13, resize: 'vertical',
                  fontFamily: 'var(--font-sans)', outline: 'none',
                  boxSizing: 'border-box', marginBottom: 10,
                }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={enviar}
                  disabled={!replyText.trim() || isPending}
                  style={{
                    padding: '8px 20px', borderRadius: 6, border: 'none',
                    background: replyText.trim() ? '#0a0a0a' : '#e8e7e1',
                    color: replyText.trim() ? '#fff' : '#9a9994',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? 'enviando…' : 'enviar respuesta'}
                </button>
                {ticket.status !== 'resolved' && (
                  <button onClick={() => cambiarEstado('resolved')} disabled={isPending}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e8e7e1', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
                    marcar resuelto
                  </button>
                )}
                {ticket.status !== 'closed' && (
                  <button onClick={() => cambiarEstado('closed')} disabled={isPending}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e8e7e1', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#6b6a64' }}>
                    cerrar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TicketsClient({ tickets }: { tickets: Ticket[] }) {
  const [filtro, setFiltro] = useState<'todos' | TicketStatus>('todos')
  const [abierto, setAbierto] = useState<Ticket | null>(null)

  const visibles = filtro === 'todos' ? tickets : tickets.filter(t => t.status === filtro)

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {FILTROS.map(f => {
          const n = f.key === 'todos' ? tickets.length : tickets.filter(t => t.status === f.key).length
          const activo = filtro === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              style={{
                padding: '5px 13px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${activo ? '#0a0a0a' : '#e8e7e1'}`,
                background: activo ? '#0a0a0a' : '#fff',
                color: activo ? '#fff' : '#6b6a64',
              }}
            >
              {f.label} {n > 0 && <span style={{ opacity: 0.65 }}>{n}</span>}
            </button>
          )
        })}
      </div>

      {visibles.length === 0 ? (
        <p style={{ color: '#9a9994', fontSize: 14 }}>no hay conversaciones aquí.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {visibles.map(t => {
            const chip = STATUS_CHIP[t.status]
            const ultimo = t.messages[t.messages.length - 1]
            return (
              <button
                key={t.id}
                onClick={() => setAbierto(t)}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left',
                  padding: '14px 4px', borderBottom: '1px solid #e8e7e1',
                  background: 'none', border: 'none', borderBottomStyle: 'solid', cursor: 'pointer', width: '100%',
                }}
              >
                <span style={{
                  fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: chip.bg, color: chip.text, padding: '2px 7px', borderRadius: 3,
                  flex: 'none', marginTop: 2,
                }}>{chip.label}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0a0a0a', marginBottom: 2 }}>
                    {t.subject}
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: '#6b6a64', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.customer_name ?? t.customer_email}
                    {ultimo?.direction === 'outbound' && ' · respondido'}
                  </span>
                </span>
                <span style={{ fontSize: 11.5, color: '#9a9994', flex: 'none', marginTop: 2 }}>
                  {fmtDate(t.last_activity_at)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {abierto && <Hilo ticket={abierto} onClose={() => setAbierto(null)} />}
    </div>
  )
}
