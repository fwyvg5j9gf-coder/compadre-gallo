'use client';

import { useState } from 'react';
import Link from 'next/link';

const sections = ['boletos', 'guardados', 'perfil', 'notificaciones'];

const mockTickets = [
  { artist: 'paloma', venue: 'palenque feria', city: 'gdl', date: '12 mayo 2026', qty: 2, total: 700 },
  { artist: 'lúa',   venue: 'el refugio',     city: 'oax', date: '21 junio 2026', qty: 1, total: 250 },
];

const mockSaved = [
  { slug: 'flavio',  name: 'flavio',  city: 'monterrey', date: '19 may', bg: '#001d47', stripe: '#00c4df' },
  { slug: 'tetra',   name: 'tetra',   city: 'cdmx',      date: '02 jun', bg: '#0a0a0a', stripe: '#ffe200' },
  { slug: 'valeria', name: 'valeria', city: 'monterrey', date: '05 jul', bg: '#1f0a2e', stripe: '#ff0100' },
];

export default function CuentaPage() {
  const [active, setActive] = useState('boletos');
  const [loggedIn] = useState(true);

  if (!loggedIn) {
    return (
      <div style={{ padding: 'var(--space-9) var(--outer-px)', maxWidth: 480 }}>
        <h1>tu cuenta</h1>
        <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic', marginTop: 'var(--space-3)' }}>
          entra para ver tus boletos y artistas guardados.
        </p>
        <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="field"><label>correo</label><input type="email" placeholder="tu@correo.com" /></div>
          <div className="field"><label>contraseña</label><input type="password" placeholder="••••••••" /></div>
          <button className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-2)' }}>entrar</button>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-muted)' }}>
            ¿no tienes cuenta? <a style={{ borderBottom: '1px solid currentColor', cursor: 'pointer' }}>regístrate</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-grid">
      {/* Sidebar */}
      <aside className="account-sidebar">
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>compadre</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>diego@compadregallo.com</div>
        </div>
        {sections.map(s => (
          <button
            key={s}
            className={`account-nav-item${active === s ? ' is-active' : ''}`}
            onClick={() => setActive(s)}
          >
            {s}
          </button>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-6)' }}>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--fg-muted)' }}>cerrar sesión</button>
        </div>
      </aside>

      {/* Content */}
      <div>
        {active === 'boletos' && (
          <>
            <h2 style={{ marginBottom: 'var(--space-6)' }}>mis boletos</h2>
            {mockTickets.length === 0 ? (
              <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                sin boletos todavía. <Link href="/preventa" style={{ borderBottom: '1px solid currentColor' }}>ponle</Link>.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {mockTickets.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      padding: 'var(--space-5)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 'var(--space-4)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18, textTransform: 'lowercase' }}>{t.artist}</div>
                      <div style={{ fontSize: 14, color: 'var(--fg-muted)', marginTop: 4 }}>{t.venue} · {t.city}</div>
                      <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t.date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{t.qty} {t.qty === 1 ? 'boleto' : 'boletos'}</div>
                      <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>${t.total} MXN</div>
                      <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }}>
                        ver QR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {active === 'guardados' && (
          <>
            <h2 style={{ marginBottom: 'var(--space-6)' }}>guardados</h2>
            <div className="grid-3">
              {mockSaved.map(a => (
                <Link key={a.slug} href={`/artista/${a.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="artist-tile">
                    <div className="artist-tile-media" style={{ aspectRatio: '1/1', background: a.bg }}>
                      <div className="artist-tile-stripe" style={{ background: a.stripe }} />
                      <div className="artist-tile-name">{a.name}</div>
                    </div>
                    <div className="artist-tile-meta">
                      <span>{a.city}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.date}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {active === 'perfil' && (
          <>
            <h2 style={{ marginBottom: 'var(--space-6)' }}>perfil</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', maxWidth: 560 }}>
              <div className="field"><label>nombre</label><input type="text" defaultValue="diego" /></div>
              <div className="field"><label>ciudad</label><input type="text" defaultValue="guadalajara" /></div>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>correo</label><input type="email" defaultValue="diego@compadregallo.com" /></div>
            </div>
            <button className="btn btn-primary btn-md" style={{ marginTop: 'var(--space-6)' }}>
              guardar cambios
            </button>
          </>
        )}

        {active === 'notificaciones' && (
          <>
            <h2 style={{ marginBottom: 'var(--space-6)' }}>notificaciones</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 480 }}>
              {[
                { label: 'nuevas fechas de artistas guardados', on: true },
                { label: 'preventa disponible', on: true },
                { label: 'recordatorio 24h antes del show', on: false },
                { label: 'novedades del catálogo', on: false },
              ].map((n, i) => (
                <label key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ fontSize: 15 }}>{n.label}</span>
                  <input type="checkbox" defaultChecked={n.on} style={{ width: 18, height: 18 }} />
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
