'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Artist } from '@/lib/data';

export default function CheckoutClient({ artist }: { artist: Artist }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const show = artist.shows.find(s => s.available > 0) ?? artist.shows[0];
  const total = show ? show.price * qty : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 1800);
  };

  if (done) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '70vh', gap: 'var(--space-5)', textAlign: 'center', padding: 'var(--space-8) var(--outer-px)',
      }}>
        <div style={{ fontSize: 64 }}>✓</div>
        <h1>listo, compadre.</h1>
        <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic', margin: 0 }}>
          te llegan al correo. nos vemos en el show.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link href="/cuenta" className="btn btn-primary btn-lg">ver mis boletos</Link>
          <Link href="/" className="btn btn-ghost btn-lg">seguir explorando</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back */}
      <div style={{ padding: 'var(--space-5) var(--outer-px)', borderBottom: '1px solid var(--border)' }}>
        <Link href={`/artista/${artist.slug}`} style={{ fontSize: 14, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← {artist.name}
        </Link>
      </div>

      <div className="checkout-grid">
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>datos del comprador</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="field"><label>nombre</label><input type="text" required placeholder="tu nombre" /></div>
              <div className="field"><label>apellido</label><input type="text" required placeholder="apellido" /></div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>correo</label><input type="email" required placeholder="tu@correo.com" /></div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>teléfono</label><input type="tel" placeholder="55 1234 5678" /></div>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>boletos</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setQty(q => Math.max(1, q - 1))}
              >−</button>
              <span style={{ fontWeight: 700, fontSize: 20, minWidth: 32, textAlign: 'center' }}>{qty}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setQty(q => Math.min(show?.available ?? 4, q + 1))}
              >+</button>
              <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
                máx. {Math.min(show?.available ?? 4, 4)} por persona
              </span>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>pago</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>número de tarjeta</label><input type="text" placeholder="0000 0000 0000 0000" maxLength={19} /></div>
              <div className="field"><label>vencimiento</label><input type="text" placeholder="MM / AA" /></div>
              <div className="field"><label>CVV</label><input type="text" placeholder="123" maxLength={4} /></div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-accent btn-lg"
            disabled={loading}
            style={{ alignSelf: 'flex-start' }}
          >
            {loading ? 'procesando…' : `pagar $${total.toLocaleString('es-MX')} MXN`}
          </button>
        </form>

        {/* Order summary */}
        <div>
          <div className="order-summary">
            <div className="order-summary-head">resumen</div>
            <div className="order-summary-body">
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, textTransform: 'lowercase' }}>{artist.name}</div>
                <div style={{ fontSize: 14, color: 'var(--fg-muted)', marginTop: 4 }}>
                  {show?.venue} · {show?.city}
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{show?.date}</div>
              </div>

              {/* Color block */}
              <div style={{
                width: '100%', aspectRatio: '16/9',
                borderRadius: 'var(--r-sm)',
                background: artist.bg,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: 10, background: artist.stripe,
                }} />
                <div style={{
                  position: 'absolute', bottom: 12, left: 20,
                  color: '#fff', fontFamily: 'var(--font-display)',
                  fontWeight: 800, fontSize: 28, letterSpacing: 'var(--track-snug)',
                  textTransform: 'lowercase',
                }}>
                  {artist.name}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="order-row">
                  <span style={{ color: 'var(--fg-muted)' }}>precio unitario</span>
                  <span>${show?.price} MXN</span>
                </div>
                <div className="order-row">
                  <span style={{ color: 'var(--fg-muted)' }}>cantidad</span>
                  <span>× {qty}</span>
                </div>
                <div className="order-row order-total">
                  <span>total</span>
                  <span>${total.toLocaleString('es-MX')} MXN</span>
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 'var(--space-4)', fontStyle: 'italic' }}>
            tus boletos llegan al correo en minutos. sin cargos ocultos.
          </p>
        </div>
      </div>
    </div>
  );
}
