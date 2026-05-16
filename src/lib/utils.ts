// Shared formatting and display utilities

export const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

export function folio(n: number) {
  return `GALLO-${String(n).padStart(5, '0')}`
}

export const STATUS_LABEL: Record<string, string> = {
  pending:   'pendiente',
  paid:      'pagado',
  shipped:   'enviado',
  delivered: 'entregado',
  refunded:  'reembolsado',
  failed:    'fallido',
  confirmed: 'confirmado',
  cancelled: 'cancelado',
}

export const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: 'rgba(107,106,100,0.1)', text: '#6b6a64' },
  paid:      { bg: 'rgba(0,58,135,0.08)',   text: '#003a87' },
  shipped:   { bg: 'rgba(0,196,223,0.1)',   text: '#007a8c' },
  delivered: { bg: 'rgba(26,107,53,0.08)',  text: '#1a6b35' },
  refunded:  { bg: 'rgba(255,212,154,0.3)', text: '#6b4a10' },
  failed:    { bg: 'rgba(255,1,0,0.07)',    text: '#cc0000' },
  confirmed: { bg: 'rgba(26,107,53,0.08)',  text: '#1a6b35' },
  cancelled: { bg: 'rgba(107,106,100,0.1)', text: '#6b6a64' },
}

/** Escapa valor para CSV. Prefija con ' para bloquear inyección de fórmulas en Excel. */
export function csvCell(val: string): string {
  const s = String(val)
  const needsQuote = s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
  // Bloquear formula injection
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  if (needsQuote || safe !== s) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

/** Sanitiza texto antes de insertarlo en HTML de correos */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
