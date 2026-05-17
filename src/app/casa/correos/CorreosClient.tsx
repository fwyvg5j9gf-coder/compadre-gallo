'use client'

import { useState, useTransition } from 'react'
import { sendTestEmail, sendMasivo, getMassEmailRecipients } from './actions'

const TEST_TIPOS = [
  { value: 'confirmacion_pedido', label: 'confirmación de pedido' },
  { value: 'notificacion_envio',  label: 'notificación de envío (con rastreo)' },
  { value: 'notificacion_admin',  label: 'nuevo pedido — admin' },
  { value: 'bienvenida',          label: 'bienvenida (cuenta nueva)' },
  { value: 'pedido_cancelado',    label: 'pedido cancelado' },
  { value: 'pedido_reembolsado',  label: 'pedido reembolsado' },
  { value: 'pago_fallido',        label: 'pago fallido' },
]

const TIPO_LABEL: Record<string, string> = {
  confirmacion_pedido: 'confirmación',
  notificacion_admin:  'admin',
  notificacion_envio:  'envío',
  bienvenida:          'bienvenida',
  pedido_cancelado:    'cancelado',
  pedido_reembolsado:  'reembolso',
  pago_fallido:        'pago fallido',
  masivo:              'masivo',
}

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  confirmacion_pedido: { bg: 'rgba(0,58,135,0.07)',  color: '#003a87' },
  notificacion_admin:  { bg: 'rgba(0,58,135,0.07)',  color: '#003a87' },
  notificacion_envio:  { bg: 'rgba(0,196,223,0.1)',  color: '#007a8c' },
  bienvenida:          { bg: 'rgba(26,107,53,0.07)', color: '#1a6b35' },
  pedido_cancelado:    { bg: 'rgba(255,1,0,0.07)',   color: '#cc0000' },
  pedido_reembolsado:  { bg: 'rgba(255,212,154,0.3)',color: '#6b4a10' },
  pago_fallido:        { bg: 'rgba(255,1,0,0.07)',   color: '#cc0000' },
  masivo:              { bg: 'rgba(255,226,0,0.2)',  color: '#7a6600' },
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
  recipient_count: number | null
  created_at: string
}

export default function CorreosClient({ logs: initialLogs }: { logs: Log[] }) {
  const [logs, setLogs] = useState(initialLogs)

  // Test form
  const [testTipo, setTestTipo] = useState('confirmacion_pedido')
  const [testEmail, setTestEmail] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [isTestPending, startTest] = useTransition()

  // Mass email form
  const [audience, setAudience] = useState('compradores')
  const [masSubject, setMasSubject] = useState('')
  const [masBody, setMasBody] = useState('')
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [masResult, setMasResult] = useState<{ ok: boolean; sent?: number; failed?: number; error?: string } | null>(null)
  const [isMasPending, startMas] = useTransition()
  const [isCountPending, startCount] = useTransition()

  function handleTest(e: React.FormEvent) {
    e.preventDefault()
    setTestResult(null)
    startTest(async () => {
      const res = await sendTestEmail(testTipo, testEmail)
      setTestResult(res)
    })
  }

  function handleCountRecipients() {
    startCount(async () => {
      const recipients = await getMassEmailRecipients(audience)
      setRecipientCount(recipients.length)
    })
  }

  function handleMasivo(e: React.FormEvent) {
    e.preventDefault()
    if (!masSubject.trim() || !masBody.trim()) return
    setMasResult(null)
    startMas(async () => {
      const res = await sendMasivo(masSubject, masBody, audience)
      setMasResult(res)
    })
  }

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8,
    padding: '24px 28px', marginBottom: 24,
  }
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: '#9a9994', display: 'block', marginBottom: 6,
  }
  const input: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 12px', borderRadius: 4,
    border: '1px solid #e8e7e1', fontSize: 13, color: '#0a0a0a',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 960, margin: '0 auto' }}>

      {/* ── Test form ─────────────────────────────────── */}
      <div style={card}>
        <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.01em' }}>
          enviar correo de prueba
        </h2>
        <form onSubmit={handleTest} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 240 }}>
            <label style={label}>tipo</label>
            <select value={testTipo} onChange={e => setTestTipo(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
              {TEST_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 200 }}>
            <label style={label}>destinatario</label>
            <input type="email" required placeholder="correo@ejemplo.com" value={testEmail}
              onChange={e => setTestEmail(e.target.value)} style={input} />
          </div>
          <button type="submit" disabled={isTestPending} style={{
            height: 38, padding: '0 20px', borderRadius: 4, border: 'none',
            background: isTestPending ? '#e8e7e1' : '#0a0a0a', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: isTestPending ? 'not-allowed' : 'pointer',
          }}>
            {isTestPending ? 'enviando...' : 'enviar prueba'}
          </button>
        </form>
        {testResult && (
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 4, fontSize: 13,
            background: testResult.ok ? 'rgba(26,107,53,0.06)' : 'rgba(255,1,0,0.06)',
            color: testResult.ok ? '#1a6b35' : '#cc0000',
            border: `1px solid ${testResult.ok ? 'rgba(26,107,53,0.15)' : 'rgba(255,1,0,0.15)'}`,
          }}>
            {testResult.ok ? 'correo enviado correctamente.' : `error: ${testResult.error}`}
          </div>
        )}
      </div>

      {/* ── Mass email form ───────────────────────────── */}
      <div style={card}>
        <h2 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.01em' }}>
          correo masivo
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b6a64' }}>
          usa <code style={{ background: '#f6f5f1', padding: '1px 5px', borderRadius: 3 }}>{'{{nombre}}'}</code> en el cuerpo para personalizar el saludo por destinatario.
        </p>
        <form onSubmit={handleMasivo} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 200 }}>
              <label style={label}>audiencia</label>
              <select value={audience} onChange={e => { setAudience(e.target.value); setRecipientCount(null) }}
                style={{ ...input, cursor: 'pointer' }}>
                <option value="compradores">compradores (con pedidos pagados)</option>
                <option value="todos">todos (compradores + fans registrados)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleCountRecipients} disabled={isCountPending} style={{
                height: 38, padding: '0 16px', borderRadius: 4,
                border: '1px solid #e8e7e1', background: '#f6f5f1', color: '#3a3a38',
                fontSize: 12, fontWeight: 700, cursor: isCountPending ? 'not-allowed' : 'pointer',
              }}>
                {isCountPending ? 'contando...' : 'contar destinatarios'}
              </button>
            </div>
            {recipientCount !== null && (
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#1a6b35', fontWeight: 700 }}>
                  {recipientCount} destinatarios
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={label}>asunto</label>
            <input type="text" required placeholder="novedad: nueva colección disponible"
              value={masSubject} onChange={e => setMasSubject(e.target.value)} style={input} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={label}>cuerpo (HTML)</label>
            <textarea required rows={8} placeholder={`<h2>hola {{nombre}}.</h2>\n<p>tenemos algo nuevo para ti...</p>\n<a href="https://compadregallo.com/tienda">ver tienda →</a>`}
              value={masBody} onChange={e => setMasBody(e.target.value)}
              style={{ ...input, height: 'auto', padding: '10px 12px', resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
          </div>

          <div>
            <button type="submit" disabled={isMasPending || !masSubject.trim() || !masBody.trim()} style={{
              height: 40, padding: '0 24px', borderRadius: 4, border: 'none',
              background: isMasPending ? '#e8e7e1' : '#ff0100', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: isMasPending ? 'not-allowed' : 'pointer',
            }}>
              {isMasPending ? 'enviando...' : 'enviar a todos'}
            </button>
            <span style={{ marginLeft: 12, fontSize: 12, color: '#9a9994' }}>acción irreversible — revisa bien antes de enviar</span>
          </div>
        </form>
        {masResult && (
          <div style={{
            marginTop: 14, padding: '12px 16px', borderRadius: 4, fontSize: 13,
            background: masResult.ok ? 'rgba(26,107,53,0.06)' : 'rgba(255,1,0,0.06)',
            color: masResult.ok ? '#1a6b35' : '#cc0000',
            border: `1px solid ${masResult.ok ? 'rgba(26,107,53,0.15)' : 'rgba(255,1,0,0.15)'}`,
          }}>
            {masResult.ok
              ? `enviados ${masResult.sent} correos${masResult.failed ? ` · ${masResult.failed} fallidos` : ''}.`
              : `error: ${masResult.error}`}
          </div>
        )}
      </div>

      {/* ── History table ─────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0efe9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.01em' }}>historial</h2>
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
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9a9994' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const tc = TIPO_COLOR[log.tipo] ?? { bg: 'rgba(0,0,0,0.05)', color: '#6b6a64' }
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f0efe9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: tc.bg, color: tc.color }}>
                          {TIPO_LABEL[log.tipo] ?? log.tipo}
                        </span>
                        {log.is_test && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,226,0,0.2)', color: '#7a6600' }}>
                            PRUEBA
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#3a3a38' }}>
                      {log.tipo === 'masivo'
                        ? <span style={{ color: '#6b6a64', fontStyle: 'italic' }}>{log.recipient_count ?? '?'} destinatarios</span>
                        : log.to_email}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b6a64', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.subject}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', color: '#6b6a64' }}>
                      {log.folio_number != null ? `GALLO-${String(log.folio_number).padStart(5, '0')}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {log.error
                        ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,1,0,0.07)', color: '#cc0000' }}>error</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(26,107,53,0.07)', color: '#1a6b35' }}>enviado</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#9a9994', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
