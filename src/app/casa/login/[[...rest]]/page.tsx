'use client'

import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 48,
        fontWeight: 900,
        letterSpacing: '-0.05em',
        lineHeight: 1,
      }}>
        <span style={{ color: '#003a87' }}>g</span>
        <span style={{ color: '#00c4df' }}>a</span>
        <span style={{ color: '#ffd49a' }}>l</span>
        <span style={{ color: '#ff0100' }}>l</span>
        <span style={{ color: '#ffe200' }}>o</span>
      </div>
      <SignIn fallbackRedirectUrl="/casa" />
    </div>
  )
}
