import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import PlayBar from '@/components/PlayBar';
import CartDrawer from '@/components/CartDrawer';
import { CartProvider } from '@/context/CartContext';
import { supabaseAdmin } from '@/lib/supabase.server';
import { DEFAULT_NAV_LINKS, DEFAULT_FOOTER, type NavLink, type FooterSettings } from '@/lib/blocks';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [navRes, footerRes] = await Promise.all([
    supabaseAdmin.from('site_settings').select('value').eq('key', 'nav').single(),
    supabaseAdmin.from('site_settings').select('value').eq('key', 'footer').single(),
  ])

  const navLinks: NavLink[]         = (navRes.data?.value as { links: NavLink[] } | null)?.links ?? DEFAULT_NAV_LINKS
  const footerSettings: FooterSettings = (footerRes.data?.value as FooterSettings | null) ?? DEFAULT_FOOTER

  return (
    <CartProvider>
      <Nav links={navLinks} />
      <main style={{ minHeight: '100vh' }}>
        {children}
      </main>
      <Footer settings={footerSettings} />
      <PlayBar />
      <CartDrawer />
    </CartProvider>
  );
}
