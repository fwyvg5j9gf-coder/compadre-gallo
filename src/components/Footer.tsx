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
        {/* Fijo, no configurable: si alguien lo quita del panel, el cliente se
            queda sin forma de ver su pedido y acaba escribiendo a soporte. */}
        <a href="/rastrear">rastrear pedido</a>
        {/* Las políticas también son fijas: una tienda no puede quedarse sin ellas. */}
        <a href="/politicas/cambios-y-devoluciones">cambios y devoluciones</a>
        <a href="/politicas/terminos">términos</a>
        <a href="/politicas/privacidad">privacidad</a>
        {/* Los links del panel que no llevan a ningún lado ('#') o que repiten
            una política fija se omiten. */}
        {links
          .filter(l => l.href !== '#' && !['privacidad', 'términos', 'terminos'].includes(l.label.toLowerCase()))
          .map(l => <a key={l.label} href={l.href}>{l.label}</a>)}
        <span>{copyright}</span>
      </div>
    </footer>
  );
}
