'use client'

import { SignUp } from '@clerk/nextjs'

export default function CuentaRegistroPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      background: 'var(--bg)',
      padding: 'var(--outer-px)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 40,
          fontWeight: 900,
          letterSpacing: '-0.05em',
          lineHeight: 1,
          marginBottom: 8,
        }}>
          <span style={{ color: '#003a87' }}>g</span>
          <span style={{ color: '#00c4df' }}>a</span>
          <span style={{ color: '#ffd49a' }}>l</span>
          <span style={{ color: '#ff0100' }}>l</span>
          <span style={{ color: '#ffe200' }}>o</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
          crea tu cuenta
        </p>
      </div>
      <SignUp fallbackRedirectUrl="/cuenta" />
    </div>
  )
}
