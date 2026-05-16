'use client'

import { SignIn } from '@clerk/nextjs'

export default function CuentaLoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      background: '#fafafa',
      padding: '24px 16px',
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
        <p style={{ fontSize: 13, color: '#6b6a64', margin: 0 }}>
          entra para ver tus pedidos
        </p>
      </div>
      <SignIn fallbackRedirectUrl="/cuenta" signUpUrl="/cuenta/registro" />
    </div>
  )
}
