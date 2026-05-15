import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import PlayBar from '@/components/PlayBar';
import CartDrawer from '@/components/CartDrawer';
import { CartProvider } from '@/context/CartContext';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Nav />
      <main style={{ minHeight: '100vh' }}>
        {children}
      </main>
      <Footer />
      <PlayBar />
      <CartDrawer />
    </CartProvider>
  );
}
