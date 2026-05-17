import type { FooterSettings } from '@/lib/blocks'

export default function Footer({ settings }: { settings?: FooterSettings }) {
  const email     = settings?.email     ?? 'info@compadregallo.com'
  const copyright = settings?.copyright ?? '© 2026 gallo records'
  const links     = settings?.links     ?? [{ label: 'prensa', href: '#' }, { label: 'privacidad', href: '#' }]

  return (
    <footer className="footer">
      <div className="footer-sig">compadregallo.com</div>
      <div className="footer-meta">
        <a href={`mailto:${email}`}>contacto</a>
        {links.map(l => <a key={l.label} href={l.href}>{l.label}</a>)}
        <span>{copyright}</span>
      </div>
    </footer>
  );
}
