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

const IconCart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="22" height="22" fill="none">
    <path d="M8 9 H28 L25 19 H10 Z" fill="#ffd49a"/>
    <path d="M3 5 H7 L10 22 H25" stroke="#0a0a0a" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="26" r="2.2" fill="#003a87"/>
    <circle cx="23" cy="26" r="2.2" fill="#003a87"/>
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
          <IconCart />
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
