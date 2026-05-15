'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

const links = [
  { href: '/artistas',  label: 'artistas' },
  { href: '/preventa',  label: 'preventa' },
  { href: '/tienda',    label: 'tienda'   },
  { href: '/cuenta',    label: 'cuenta'   },
];

const IconBag = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)

export default function Nav() {
  const pathname = usePathname();
  const { totalItems, openCart } = useCart();

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo" aria-label="gallo — volver al inicio">
        <span className="l1">g</span>
        <span className="l2">a</span>
        <span className="l3">l</span>
        <span className="l4">l</span>
        <span className="l5">o</span>
      </Link>
      <div className="nav-links">
        {links.map(l => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link${active ? ' is-active' : ''}`}
            >
              {l.label}
            </Link>
          );
        })}
        <button onClick={openCart} aria-label="ver carrito" style={{
          position: 'relative', display: 'flex', alignItems: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--fg-muted)', padding: 4,
          transition: 'color 140ms var(--ease-out)',
        }}>
          <IconBag />
          {totalItems > 0 && (
            <span style={{
              position: 'absolute', top: -1, right: -5,
              background: 'var(--gallo-red)', color: '#fff',
              fontSize: 9, fontWeight: 800, lineHeight: 1,
              borderRadius: 999, padding: '2px 4px',
              fontFamily: 'var(--font-sans)',
              minWidth: 16, textAlign: 'center',
            }}>
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
