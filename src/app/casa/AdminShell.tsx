import AdminAI from './AdminAI'

type AdminShellProps = {
  crumb: string
  crumbHref?: string
  right?: React.ReactNode
  children: React.ReactNode
}

// Todas las secciones del panel, agrupadas. Sirve de índice único: si una
// sección no está aquí, no hay forma de llegar a ella salvo escribiendo la URL.
const SECTIONS: { group: string; items: { label: string; href: string }[] }[] = [
  {
    group: 'tienda',
    items: [
      { label: 'tienda',        href: '/casa/tienda' },
      { label: 'inventario',    href: '/casa/inventario' },
      { label: 'órdenes',       href: '/casa/ordenes' },
      { label: 'descuentos',    href: '/casa/descuentos' },
      { label: 'configuración', href: '/casa/tienda/configuracion' },
    ],
  },
  {
    group: 'gente',
    items: [
      { label: 'cuentas',  href: '/casa/cuentas' },
      { label: 'usuarios', href: '/casa/usuarios' },
      { label: 'soporte',  href: '/casa/soporte' },
      { label: 'correos',  href: '/casa/correos' },
    ],
  },
  {
    group: 'contenido',
    items: [
      { label: 'artistas', href: '/casa/artistas' },
      { label: 'editor',   href: '/casa/editor' },
      { label: 'media',    href: '/casa/media' },
    ],
  },
  {
    group: 'eventos',
    items: [
      { label: 'boletos', href: '/casa/boletos' },
      { label: 'scanner', href: '/casa/scanner' },
    ],
  },
  {
    group: 'sistema',
    items: [
      { label: 'bitácora',   href: '/casa/bitacora' },
      { label: 'desarrollo', href: '/casa/desarrollo' },
    ],
  },
]

export default function AdminShell({ crumb, right, children }: AdminShellProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#f6f5f1', fontFamily: 'var(--font-sans)' }}>
      <header style={{
        background: '#0a0a0a', padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo + selector de sección */}
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

          <details className="adm-secmenu">
            <summary className="adm-secmenu-btn">
              <span>{crumb}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <nav className="adm-secmenu-panel">
              <a href="/casa" className={`adm-secmenu-item${crumb === 'casa' ? ' active' : ''}`}>
                inicio
              </a>
              {SECTIONS.map(section => (
                <div key={section.group}>
                  <div className="adm-secmenu-group">{section.group}</div>
                  {section.items.map(item => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`adm-secmenu-item${crumb === item.label ? ' active' : ''}`}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              ))}
            </nav>
          </details>
        </div>

        {/* Search */}
        <form action="/casa/buscar" method="GET" className="adm-header-search">
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
