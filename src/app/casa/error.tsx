'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin error]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh', background: '#f6f5f1',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: 32, textAlign: 'center', fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em' }}>
        error en el panel
      </div>
      <p style={{ color: '#6b6a64', margin: 0, maxWidth: '40ch' }}>
        algo salió mal. intenta de nuevo.
      </p>
      {error.digest && (
        <p style={{ color: '#9a9994', margin: 0, fontSize: 11, fontFamily: 'monospace' }}>
          digest: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        style={{
          padding: '8px 20px', background: '#0a0a0a', color: '#fff',
          border: 'none', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: 14,
        }}
      >
        reintentar
      </button>
    </div>
  )
}
