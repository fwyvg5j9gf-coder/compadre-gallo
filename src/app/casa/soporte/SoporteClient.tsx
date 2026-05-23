'use client'

import { useState, useTransition } from 'react'
import { replyToMessage, markMessageStatus } from './actions'

type Message = {
  id: string
  from_email: string
  from_name: string | null
  to_email: string | null
  subject: string | null
  body_text: string | null
  body_html: string | null
  status: string
  created_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  unread:   { bg: 'rgba(0,58,135,0.10)',   text: '#003a87', label: 'nuevo' },
  read:     { bg: '#f0efe9',               text: '#6b6a64', label: 'leído' },
  replied:  { bg: 'rgba(26,107,53,0.09)',  text: '#1a6b35', label: 'respondido' },
  resolved: { bg: 'rgba(107,106,100,0.1)', text: '#6b6a64', label: 'resuelto' },
}

function MessagePane({ msg, onClose }: { msg: Message; onClose: () => void }) {
  const [replyText, setReplyText] = useState('')
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleReply() {
    if (!replyText.trim()) return
    startTransition(async () => {
      await replyToMessage(msg.id, replyText)
      setSent(true)
      setReplyText('')
    })
  }

  function handleMark(status: 'read' | 'resolved') {
    startTransition(async () => {
      await markMessageStatus(msg.id, status)
      onClose()
    })
  }

  const chip = STATUS_CHIP[msg.status] ?? STATUS_CHIP.read

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,10,10,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '32px 16px', overflowY: 'auto',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 8, width: '100%', maxWidth: 640,
        border: '1px solid #e8e7e1', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e8e7e1',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', marginBottom: 4 }}>
              {msg.subject ?? '(sin asunto)'}
            </div>
            <div style={{ fontSize: 13, color: '#6b6a64' }}>
              {msg.from_name ? <><strong>{msg.from_name}</strong> &lt;{msg.from_email}&gt;</> : msg.from_email}
            </div>
            <div style={{ fontSize: 11, color: '#9a9994', marginTop: 4 }}>
              {fmtDate(msg.created_at)}
              {' · '}
              <span style={{
                padding: '2px 7px', borderRadius: 4,
                background: chip.bg, color: chip.text,
                fontWeight: 700,
              }}>
                {chip.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a9994', fontSize: 20, lineHeight: 1, padding: 4 }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8e7e1', maxHeight: 360, overflowY: 'auto' }}>
          {msg.body_html ? (
            <iframe
              srcDoc={msg.body_html}
              style={{ width: '100%', minHeight: 200, border: 'none' }}
              sandbox="allow-same-origin"
              title="email body"
            />
          ) : msg.body_text ? (
            <pre style={{ margin: 0, fontSize: 13, color: '#0a0a0a', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'var(--font-sans)' }}>
              {msg.body_text}
            </pre>
          ) : (
            <p style={{ margin: 0, color: '#9a9994', fontSize: 13 }}>sin contenido</p>
          )}
        </div>

        {/* Reply */}
        <div style={{ padding: '20px 24px' }}>
          {sent ? (
            <div style={{ padding: '12px 16px', background: 'rgba(26,107,53,0.08)', borderRadius: 6, color: '#1a6b35', fontSize: 13, fontWeight: 700 }}>
              ✓ respuesta enviada a {msg.from_email}
            </div>
          ) : (
            <>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`responder a ${msg.from_name ?? msg.from_email}…`}
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 6,
                  border: '1px solid #e8e7e1', fontSize: 13, resize: 'vertical',
                  fontFamily: 'var(--font-sans)', outline: 'none',
                  boxSizing: 'border-box', marginBottom: 10,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || isPending}
                  style={{
                    padding: '8px 20px', borderRadius: 6, border: 'none',
                    background: replyText.trim() ? '#0a0a0a' : '#e8e7e1',
                    color: replyText.trim() ? '#fff' : '#9a9994',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? 'enviando…' : 'enviar respuesta'}
                </button>
                {msg.status !== 'resolved' && (
                  <button
                    onClick={() => handleMark('resolved')}
                    disabled={isPending}
                    style={{
                      padding: '8px 14px', borderRadius: 6,
                      border: '1px solid #e8e7e1', background: '#fff',
                      color: '#6b6a64', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    marcar resuelto
                  </button>
                )}
                {msg.status === 'unread' && (
                  <button
                    onClick={() => handleMark('read')}
                    disabled={isPending}
                    style={{
                      padding: '8px 14px', borderRadius: 6,
                      border: '1px solid #e8e7e1', background: '#fff',
                      color: '#6b6a64', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    marcar leído
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

export default function SoporteClient({ messages, unreadCount }: { messages: Message[]; unreadCount: number }) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'replied' | 'resolved'>('all')
  const [selected, setSelected] = useState<Message | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = messages.filter(m => {
    if (filter === 'unread')   return m.status === 'unread'
    if (filter === 'replied')  return m.status === 'replied'
    if (filter === 'resolved') return m.status === 'resolved'
    return true
  })

  function handleOpen(msg: Message) {
    setSelected(msg)
    if (msg.status === 'unread') {
      startTransition(async () => {
        await markMessageStatus(msg.id, 'read')
      })
    }
  }

  const FILTERS = [
    { key: 'all' as const,      label: 'todos',        count: messages.length },
    { key: 'unread' as const,   label: 'nuevos',       count: unreadCount },
    { key: 'replied' as const,  label: 'respondidos',  count: messages.filter(m => m.status === 'replied').length },
    { key: 'resolved' as const, label: 'resueltos',    count: messages.filter(m => m.status === 'resolved').length },
  ]

  return (
    <main style={{ maxWidth: 900, margin: '0 auto' }} className="adm-main-pad">

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
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

      {/* List */}
      <div style={{ background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#9a9994', fontSize: 14 }}>
            {filter === 'unread' ? 'ningún mensaje nuevo' : 'sin mensajes'}
          </div>
        ) : filtered.map((msg, i) => {
          const chip = STATUS_CHIP[msg.status] ?? STATUS_CHIP.read
          const isUnread = msg.status === 'unread'
          return (
            <div
              key={msg.id}
              onClick={() => handleOpen(msg)}
              style={{
                display: 'grid',
                gridTemplateColumns: '4px 1fr auto',
                borderBottom: i < filtered.length - 1 ? '1px solid #f0efe9' : 'none',
                cursor: 'pointer',
                background: isUnread ? 'rgba(0,58,135,0.02)' : '#fff',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fafaf8' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isUnread ? 'rgba(0,58,135,0.02)' : '#fff' }}
            >
              {/* Unread indicator */}
              <div style={{ background: isUnread ? '#003a87' : 'transparent' }} />

              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: isUnread ? 700 : 500, color: '#0a0a0a' }}>
                    {msg.from_name ?? msg.from_email}
                  </span>
                  <span style={{
                    padding: '1px 6px', borderRadius: 4,
                    background: chip.bg, color: chip.text,
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {chip.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: isUnread ? '#0a0a0a' : '#6b6a64', fontWeight: isUnread ? 600 : 400 }}>
                  {msg.subject ?? '(sin asunto)'}
                </div>
                <div style={{ fontSize: 11, color: '#9a9994', marginTop: 3 }}>
                  {msg.body_text?.slice(0, 100).replace(/\s+/g, ' ') ?? '…'}
                </div>
              </div>

              <div style={{ padding: '14px 16px', fontSize: 11, color: '#9a9994', whiteSpace: 'nowrap', alignSelf: 'flex-start', paddingTop: 16 }}>
                {fmtDate(msg.created_at)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Message pane */}
      {selected && <MessagePane msg={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}
