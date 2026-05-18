import AdminAI from './AdminAI'

type AdminShellProps = {
  crumb: string
  crumbHref?: string
  right?: React.ReactNode
  children: React.ReactNode
}

export default function AdminShell({ crumb, crumbHref, right, children }: AdminShellProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#f6f5f1', fontFamily: 'var(--font-sans)' }}>
      <header style={{
        background: '#0a0a0a', padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo + crumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
            <a href={crumbHref} style={{ color: '#9a9994', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
              {crumb}
            </a>
          ) : (
            <span style={{ color: '#f0efe9', fontSize: 13, fontWeight: 500 }}>{crumb}</span>
          )}
        </div>

        {/* Search */}
        <form action="/casa/buscar" method="GET" style={{ flex: 1, maxWidth: 320 }}>
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              name="q"
              type="search"
              placeholder="buscar órdenes, artistas, productos…"
              autoComplete="off"
              style={{
                width: '100%', height: 32, paddingLeft: 32, paddingRight: 12,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: '#fff', fontSize: 12, fontFamily: 'var(--font-sans)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </form>

        {/* Right slot */}
        {right && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {right}
          </div>
        )}
      </header>
      {children}
      <AdminAI />
    </div>
  )
}
