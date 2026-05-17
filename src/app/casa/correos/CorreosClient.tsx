'use client'

import { useState, useTransition } from 'react'
import { sendTestEmail } from './actions'

const TIPOS = [
  { value: 'confirmacion_pedido', label: 'confirmación de pedido' },
  { value: 'notificacion_envio',  label: 'notificación de envío' },
  { value: 'notificacion_admin',  label: 'nuevo pedido (admin)' },
]

const TIPO_LABEL: Record<string, string> = {
  confirmacion_pedido: 'confirmación',
  notificacion_admin:  'admin',
  notificacion_envio:  'envío',
}

type Log = {
  id: string
  tipo: string
  to_email: string
  subject: string
  folio_number: number | null
  resend_id: string | null
  error: string | null
  is_test: boolean
  created_at: string
}

export default function CorreosClient({ logs }: { logs: Log[] }) {
  const [tipo, setTipo] = useState('confirmacion_pedido')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const res = await sendTestEmail(tipo, email)
      setResult(res)
    })
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 960, margin: '0 auto' }}>

      {/* Test form */}
      <div style={{
        background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8,
        padding: '24px 28px', marginBottom: 32,
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.01em' }}>
          enviar correo de prueba
        </h2>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a9994' }}>
              tipo
            </label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              style={{
                height: 38, padding: '0 12px', borderRadius: 4, border: '1px solid #e8e7e1',
                fontSize: 13, background: '#fff', color: '#0a0a0a', cursor: 'pointer',
              }}
            >
              {TIPOS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a9994' }}>
              destinatario
            </label>
            <input
              type="email"
              required
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                height: 38, padding: '0 12px', borderRadius: 4, border: '1px solid #e8e7e1',
                fontSize: 13, color: '#0a0a0a', width: '100%',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            style={{
              height: 38, padding: '0 20px', borderRadius: 4, border: 'none',
              background: isPending ? '#e8e7e1' : '#0a0a0a', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em', transition: 'background 140ms',
            }}
          >
            {isPending ? 'enviando...' : 'enviar prueba'}
          </button>
        </form>

        {result && (
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 4, fontSize: 13,
            background: result.ok ? 'rgba(26,107,53,0.06)' : 'rgba(255,1,0,0.06)',
            color: result.ok ? '#1a6b35' : '#cc0000',
            border: `1px solid ${result.ok ? 'rgba(26,107,53,0.15)' : 'rgba(255,1,0,0.15)'}`,
          }}>
            {result.ok ? 'correo enviado correctamente.' : `error: ${result.error}`}
          </div>
        )}
      </div>

      {/* History table */}
      <div style={{ background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0efe9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.01em' }}>
            historial
          </h2>
          <span style={{ fontSize: 12, color: '#9a9994' }}>{logs.length} correos</span>
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9a9994', fontSize: 13 }}>
            sin correos registrados todavía.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0efe9' }}>
                {['tipo', 'para', 'asunto', 'folio', 'estado', 'fecha'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9a9994',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f0efe9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                        background: 'rgba(0,58,135,0.07)', color: '#003a87',
                      }}>
                        {TIPO_LABEL[log.tipo] ?? log.tipo}
                      </span>
                      {log.is_test && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                          background: 'rgba(255,226,0,0.2)', color: '#7a6600',
                        }}>PRUEBA</span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#3a3a38' }}>{log.to_email}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b6a64', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.subject}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', color: '#6b6a64' }}>
                    {log.folio_number != null ? `GALLO-${String(log.folio_number).padStart(5, '0')}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {log.error ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                        background: 'rgba(255,1,0,0.07)', color: '#cc0000',
                      }}>error</span>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                        background: 'rgba(26,107,53,0.07)', color: '#1a6b35',
                      }}>enviado</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#9a9994', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString('es-MX', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
