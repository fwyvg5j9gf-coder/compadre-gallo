'use client'

import { useEffect } from 'react'

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[platform error]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 'var(--space-5)', padding: 'var(--space-8) var(--outer-px)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.04em' }}>
        algo salió mal
      </div>
      <p style={{ color: 'var(--fg-muted)', maxWidth: '40ch', margin: 0 }}>
        hubo un error cargando esta página. intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="btn btn-primary"
      >
        reintentar
      </button>
    </div>
  )
}
