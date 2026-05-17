'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import AdminShell from './AdminShell'

const CARDS = [
  { title: 'tienda',         desc: 'productos, stock, precios e imágenes',  href: '/casa/tienda',                accent: '#ff0100' },
  { title: 'órdenes',        desc: 'compras, envíos y estados',             href: '/casa/ordenes',               accent: '#003a87' },
  { title: 'clientes',       desc: 'actividad de fans — pedidos y boletos', href: '/casa/clientes',              accent: '#1a6b35' },
  { title: 'usuarios',       desc: 'roles y permisos del equipo',           href: '/casa/usuarios',              accent: '#9b59b6' },
  { title: 'artistas',       desc: 'catálogo, bios y shows',                href: '/casa/artistas',              accent: '#00c4df' },
  { title: 'correos',        desc: 'historial, pruebas y envíos masivos',   href: '/casa/correos',               accent: '#ffd49a' },
  { title: 'configuración',  desc: 'stripe, skydropx, embalajes y tarifas', href: '/casa/tienda/configuracion',  accent: '#6b6a64' },
  { title: 'editor',         desc: 'contenido y apariencia del sitio',      href: '/casa/editor',                accent: '#ffe200' },
  { title: 'media',          desc: 'imágenes, videos y audio del proyecto', href: '/casa/media',                 accent: '#ffd49a' },
]

// ── Datos de desarrollo ────────────────────────────────────────────────────────

const OBJETIVOS = [
  { label: 'tienda conectada a Supabase',          done: true  },
  { label: 'variantes + control de stock',         done: true  },
  { label: 'carrito drawer + localStorage',        done: true  },
  { label: 'checkout + cotización SkyDropX',       done: true  },
  { label: 'checkout Stripe Elements',             done: true  },
  { label: 'órdenes admin (detalle, estado, guía)',done: true  },
  { label: '/cuenta cliente + historial',          done: true  },
  { label: 'auth cliente (Clerk)',                 done: true  },
  { label: 'correos transaccionales (Resend)',     done: true  },
  { label: 'deployment en Vercel',                 done: true  },
  { label: 'keys reales de Stripe activas',        done: false },
  { label: 'dominio compadregallo.com apuntado',   done: false },
  { label: 'módulo de boletos (DB + dashboard)',    done: true  },
  { label: 'suscripciones a artistas',             done: true  },
  { label: 'admin de clientes (/casa/clientes)',   done: true  },
  { label: 'gestión de roles (/casa/usuarios)',    done: true  },
  { label: 'editor de contenido',                  done: false },
]

const TAREAS: { titulo: string; pasos: string[] }[] = [
  {
    titulo: 'activar stripe',
    pasos: [
      'Crear cuenta en stripe.com',
      'Dashboard → Developers → API keys → copiar sk_test_... y pk_test_...',
      'En Vercel → proyecto → Settings → Environment Variables → reemplazar STRIPE_SECRET_KEY y NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'Stripe → Developers → Webhooks → Add endpoint → URL: compadregallo.vercel.app/api/stripe/webhook → evento: payment_intent.succeeded',
      'Copiar el Signing secret (whsec_...) en Vercel como STRIPE_WEBHOOK_SECRET',
      'Redeploy en Vercel para que tome las nuevas keys',
    ],
  },
  {
    titulo: 'activar correos (resend)',
    pasos: [
      'Crear cuenta en resend.com',
      'Domains → Add Domain → compadregallo.com → agregar los registros DNS que te dará',
      'API Keys → Create API Key → copiar en Vercel como RESEND_API_KEY',
      'Opcional mientras verificas el dominio: usar onboarding@resend.dev como RESEND_FROM_EMAIL en Vercel',
    ],
  },
  {
    titulo: 'clerk — dominios de producción',
    pasos: [
      'Clerk Dashboard → Configure → Domains',
      'Agregar compadregallo.vercel.app',
      'Agregar compadregallo.com cuando el DNS esté apuntando a Vercel',
    ],
  },
  {
    titulo: 'conectar github ↔ vercel (auto-deploy)',
    pasos: [
      'GitHub → Settings → Applications → Vercel → Repository access → agregar repo compadregallo',
      'Vercel → proyecto compadregallo → Settings → Git → Connect Git Repository → seleccionar naitsabxs/compadregallo',
      'Desde ese momento cada git push a main despliega automáticamente',
    ],
  },
  {
    titulo: 'apuntar dominio compadregallo.com',
    pasos: [
      'Vercel → proyecto → Settings → Domains → Add → compadregallo.com',
      'En tu registrador de dominio: agregar registro A → 76.76.21.21',
      'O registro CNAME www → cname.vercel-dns.com',
      'SSL se genera automático. Tarda ~5 min en propagar.',
    ],
  },
]

const B = '#e8e7e1'
const M = '#6b6a64'
const S = '#9a9994'

// ── Componente de tarea expandible ────────────────────────────────────────────
function TareaItem({ tarea }: { tarea: typeof TAREAS[0] }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: `1px solid ${B}`, borderRadius: 6, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px', background: '#fff', border: 'none', cursor: 'pointer',
          textAlign: 'left', gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffe200', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.01em' }}>
            {tarea.titulo}
          </span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={S} strokeWidth="1.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }}>
          <polyline points="3 5 7 9 11 5"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding: '4px 16px 16px 34px', background: '#fafaf8', borderTop: `1px solid ${B}` }}>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tarea.pasos.map((p, i) => (
              <li key={i} style={{ fontSize: 13, color: M, lineHeight: 1.55 }}>
                {p}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

// ── Bloque desarrollo ──────────────────────────────────────────────────────────
function DesarrolloBlock() {
  const done  = OBJETIVOS.filter(o => o.done).length
  const total = OBJETIVOS.length
  const pct   = Math.round((done / total) * 100)

  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden', marginTop: 32 }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 3, background: '#ffe200', borderRadius: 2 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            desarrollo
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#ffe200', fontFamily: 'monospace' }}>
          {pct}% completado
        </span>
      </div>

      <div style={{ padding: '24px' }}>

        {/* Barra de progreso */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: S, marginBottom: 8, fontWeight: 600 }}>
            <span>{done} de {total} objetivos</span>
            <span>{total - done} pendientes</span>
          </div>
          <div style={{ height: 6, background: '#f0efe9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #003a87 0%, #00c4df 100%)',
              transition: 'width 600ms ease',
            }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* Objetivos */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
              estado del proyecto
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {OBJETIVOS.map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {o.done ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="7" fill="rgba(26,107,53,0.12)"/>
                      <polyline points="4 7 6.2 9.2 10 5" stroke="#1a6b35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="6" stroke="#e8e7e1" strokeWidth="1.5"/>
                    </svg>
                  )}
                  <span style={{ fontSize: 13, color: o.done ? '#0a0a0a' : M, lineHeight: 1.4 }}>
                    {o.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tareas pendientes */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
              tareas pendientes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TAREAS.map((t, i) => (
                <TareaItem key={i} tarea={t} />
              ))}
            </div>
          </div>

        </div>

        {/* Stack */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${B}`, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            'Next.js 16', 'React 19', 'TypeScript', 'Supabase (PostgreSQL)',
            'Clerk (auth)', 'Stripe (pagos)', 'Resend (correos)', 'SkyDropX (envíos)',
            'Vercel (deploy)',
          ].map(tag => (
            <span key={tag} style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: '#f0efe9', color: M, letterSpacing: '0.02em',
            }}>
              {tag}
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}

// ── Dashboard principal ────────────────────────────────────────────────────────
export default function CasaDashboard({ email, firstName }: { email: string; firstName: string }) {
  return (
    <AdminShell
      crumb="casa"
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#6b6a64' }}>{email}</span>
          <UserButton />
        </div>
      }
    >
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '52px 32px 72px' }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 900,
            letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 6, textTransform: 'lowercase',
          }}>
            hola, {firstName}.
          </h1>
          <p style={{ color: '#6b6a64', fontSize: 14, margin: 0 }}>
            desde aquí controlas todo lo que aparece en compadregallo.com
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {CARDS.map(card => (
            <a
              key={card.title}
              href={card.href}
              style={{
                display: 'block', background: '#fff',
                border: '1px solid #e8e7e1', borderRadius: 8,
                padding: '22px 24px', textDecoration: 'none',
                cursor: 'pointer', transition: 'box-shadow 150ms, border-color 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 20px -8px rgba(10,10,10,0.12)'
                e.currentTarget.style.borderColor = '#d4d3cd'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = '#e8e7e1'
              }}
            >
              <div style={{ width: 32, height: 3, background: card.accent, borderRadius: 2, marginBottom: 18 }} />
              <div style={{ fontWeight: 700, fontSize: 17, color: '#0a0a0a', marginBottom: 5, letterSpacing: '-0.01em' }}>
                {card.title}
              </div>
              <div style={{ fontSize: 13, color: '#6b6a64', lineHeight: 1.5 }}>{card.desc}</div>
            </a>
          ))}
        </div>

        <DesarrolloBlock />
      </main>
    </AdminShell>
  )
}
