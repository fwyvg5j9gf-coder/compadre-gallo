// Shared layout shell for all /casa admin pages.
// No 'use client' — safe to import from both server and client components.

type AdminShellProps = {
  crumb: string             // e.g. "tienda" or "órdenes"
  crumbHref?: string        // makes crumb a back-link
  right?: React.ReactNode   // right side of header (buttons, user)
  children: React.ReactNode
}

const TEST_MODE = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '').startsWith('pk_test_')

export default function AdminShell({ crumb, crumbHref, right, children }: AdminShellProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#f6f5f1', fontFamily: 'var(--font-sans)' }}>
      <header style={{
        background: '#0a0a0a', padding: '0 28px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/casa" style={{ textDecoration: 'none', lineHeight: 0 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.05em', fontSize: 22, lineHeight: 1 }}>
              <span style={{ color: '#003a87' }}>g</span>
              <span style={{ color: '#00c4df' }}>a</span>
              <span style={{ color: '#ffd49a' }}>l</span>
              <span style={{ color: '#ff0100' }}>l</span>
              <span style={{ color: '#ffe200' }}>o</span>
            </span>
          </a>
          <span style={{ color: '#3a3a38', fontSize: 15, lineHeight: 1, userSelect: 'none' }}>/</span>
          {crumbHref ? (
            <a href={crumbHref} style={{ color: '#9a9994', fontSize: 13, textDecoration: 'none', fontWeight: 500, transition: 'color 120ms' }}>
              {crumb}
            </a>
          ) : (
            <span style={{ color: '#f0efe9', fontSize: 13, fontWeight: 500 }}>{crumb}</span>
          )}
        </div>
        {right && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {right}
          </div>
        )}
      </header>
      {TEST_MODE && (
        <div style={{
          background: '#ffe200', color: '#0a0a0a',
          padding: '7px 28px',
          fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 10,
          letterSpacing: '0.03em',
        }}>
          <span>MODO PRUEBA · STRIPE TEST</span>
          <span style={{ fontWeight: 400, opacity: 0.7 }}>
            usa tarjeta <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>4242 4242 4242 4242</span> · cualquier fecha futura · cualquier CVC
          </span>
        </div>
      )}
      {children}
    </div>
  )
}
