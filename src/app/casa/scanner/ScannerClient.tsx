'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ScannerClient() {
  const [folio, setFolio] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = folio.trim().toUpperCase()
    if (!code) return
    router.push(`/boleto/${code}`)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.05em' }}>
            <span style={{ color: '#003a87' }}>g</span>
            <span style={{ color: '#00c4df' }}>a</span>
            <span style={{ color: '#ffd49a' }}>l</span>
            <span style={{ color: '#ff0100' }}>l</span>
            <span style={{ color: '#ffe200' }}>o</span>
          </span>
          <div style={{ color: '#6b6a64', fontSize: 13, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
            validar boleto
          </div>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            ref={inputRef}
            type="text"
            value={folio}
            onChange={e => setFolio(e.target.value.toUpperCase())}
            placeholder="folio — ej. T-A1B2C3D4"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            style={{
              width: '100%', padding: '16px', borderRadius: 6,
              border: '1px solid #2a2a2a', background: '#1a1a1a',
              color: '#fff', fontFamily: 'monospace', fontSize: 18,
              fontWeight: 700, letterSpacing: '0.06em',
              outline: 'none', boxSizing: 'border-box',
              textAlign: 'center',
            }}
          />
          <button
            type="submit"
            disabled={!folio.trim()}
            style={{
              padding: '16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: folio.trim() ? '#ffe200' : '#2a2a2a',
              color: folio.trim() ? '#0a0a0a' : '#6b6a64',
              fontWeight: 900, fontSize: 16,
              transition: 'background 120ms, color 120ms',
            }}
          >
            buscar boleto →
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#4a4a44', margin: 0 }}>
          o escanea el QR con la cámara para abrir directo
        </p>
      </div>
    </div>
  )
}
