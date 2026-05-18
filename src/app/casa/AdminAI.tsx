'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  '¿cómo van las ventas esta semana?',
  '¿qué productos están por agotarse?',
  '¿cuántas órdenes pendientes de envío hay?',
  'muéstrame las últimas 5 órdenes',
]

export default function AdminAI() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const next: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      const content = res.status === 503
        ? 'el asistente está desactivado. actívalo en configuración → asistente IA.'
        : (data.reply ?? data.error ?? 'sin respuesta')
      setMessages(prev => [...prev, { role: 'assistant', content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'error al conectar con el asistente.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Botón flotante ───────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="asistente IA"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 46, height: 46, borderRadius: '50%',
          background: open ? '#3a3a38' : '#0a0a0a',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(0,0,0,0.22)',
          transition: 'transform 120ms ease, background 120ms ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {open ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3C7.03 3 3 6.58 3 11c0 2.1.87 4 2.3 5.4L4 21l4.9-1.55A9.54 9.54 0 0 0 12 20c4.97 0 9-3.58 9-8s-4.03-9-9-9Z"/>
          </svg>
        )}
      </button>

      {/* ── Panel de chat ────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 80, right: 24, zIndex: 199,
          width: 370, maxHeight: '68vh',
          background: '#fff', borderRadius: 10,
          border: '1px solid #e0dfd9',
          boxShadow: '0 10px 48px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'aiSlideUp 160ms ease',
        }}>

          {/* Header */}
          <div style={{
            padding: '12px 16px', background: '#0a0a0a',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffe200', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f0efe9', letterSpacing: '0.01em', flex: 1 }}>
              asistente gallo
            </span>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'rgba(255,255,255,0.35)',
                padding: '2px 6px', borderRadius: 4,
                transition: 'color 100ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
              >
                limpiar
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.length === 0 ? (
              <div>
                <p style={{ fontSize: 12, color: '#6b6a64', margin: '0 0 10px', lineHeight: 1.5 }}>
                  pregúntame sobre ventas, inventario u órdenes.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} style={{
                      background: '#f6f5f1', border: '1px solid #e8e7e1',
                      borderRadius: 6, padding: '7px 11px', textAlign: 'left',
                      fontSize: 12, color: '#3a3a38', cursor: 'pointer',
                      transition: 'background 80ms',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#eeede7' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f6f5f1' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '84%', padding: '8px 12px', borderRadius: 8,
                    background: m.role === 'user' ? '#0a0a0a' : '#f6f5f1',
                    color: m.role === 'user' ? '#fff' : '#0a0a0a',
                    fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '9px 14px', borderRadius: 8, background: '#f6f5f1',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: '50%', background: '#9a9994',
                      animation: `aiDot 1.2s ease-in-out ${i * 0.18}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '9px 10px', borderTop: '1px solid #e8e7e1',
            display: 'flex', gap: 7, flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
              }}
              placeholder="pregunta algo..."
              disabled={loading}
              style={{
                flex: 1, padding: '7px 10px',
                border: '1px solid #d4d3cd', borderRadius: 6,
                fontSize: 13, fontFamily: 'var(--font-sans)',
                outline: 'none', background: '#fff',
                color: '#0a0a0a',
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                padding: '0 14px', borderRadius: 6, border: 'none',
                background: loading || !input.trim() ? '#e8e7e1' : '#0a0a0a',
                color: loading || !input.trim() ? '#9a9994' : '#fff',
                cursor: loading || !input.trim() ? 'default' : 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                transition: 'background 100ms',
                flexShrink: 0,
              }}
            >
              →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aiDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes aiSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
