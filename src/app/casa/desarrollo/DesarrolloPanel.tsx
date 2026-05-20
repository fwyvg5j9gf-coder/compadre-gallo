'use client'

import { useState } from 'react'
import AdminShell from '../AdminShell'

const B = '#e8e7e1'
const M = '#6b6a64'
const S = '#9a9994'

// ── Data ───────────────────────────────────────────────────────────────────────

const CHANGELOG: {
  date: string
  tag: string
  items: { type: 'feature' | 'fix' | 'security' | 'doc'; text: string }[]
}[] = [
  {
    date: '2026-05-20',
    tag: 'sesión 6',
    items: [
      { type: 'feature', text: 'Skydropx: siempre cotizar antes de generar guía — pre-selecciona paquetería del cliente, advierte si se cambia' },
      { type: 'feature', text: 'Nueva orden: cotizar envío con Skydropx al crear orden manual — selección de paquetería + costo auto-llenado' },
      { type: 'feature', text: 'Nueva orden: dirección de envío visible por defecto (necesaria para Skydropx)' },
      { type: 'feature', text: 'Saldo Skydropx en panel de crear guía (OrderActions) — badge verde/naranja, alerta si < $200 MXN' },
      { type: 'feature', text: 'Badge de saldo Skydropx en barra de /casa/ordenes — visible sin entrar a ninguna orden' },
      { type: 'feature', text: '/cuenta pedidos: tarjeta muestra productos y guía sin expandir; expandida agrega dirección de envío completa' },
      { type: 'feature', text: '/teamovavi — página secreta sin auth: corazones pixel art que ascienden como globos, animación ease-in de entrada' },
      { type: 'fix',     text: '"en camino" solo muestra status=shipped; paid va a sección "confirmados"' },
      { type: 'fix',     text: 'Botón cotizar bloqueado hasta seleccionar producto Y C.P. de destino — con hints claros' },
      { type: 'fix',     text: 'Cotizar envío: Server Action envuelta en useTransition para compatibilidad con App Router' },
      { type: 'fix',     text: 'Lookup de cliente: maybeSingle() evita crash; busca en orders como fallback para clientes sin cuenta' },
      { type: 'fix',     text: 'requireAdmin() → requireAdminOrThrow() en todas las Server Actions con try/catch — redirect() lanza NEXT_REDIRECT (no instanceof Error), silenciaba todos los errores de auth' },
      { type: 'fix',     text: 'lookupUser reescrito con .ilike() secuencial — elimina .or() compuesto que falló con wildcards en producción' },
      { type: 'fix',     text: 'Bug crítico: contador _id module-level en NuevoOrden → useRef por instancia — lambda caliente incrementaba _id entre requests, React 19 lo promovía a hydration error fatal' },
      { type: 'fix',     text: 'Error boundary /casa muestra digest del error — facilita búsqueda en Vercel function logs' },
    ],
  },
  {
    date: '2026-05-19',
    tag: 'sesión 5',
    items: [
      { type: 'fix',      text: 'SAT class codes — parser robusto (5 estructuras) + paginación via total÷per_page' },
      { type: 'doc',      text: 'ARCHITECTURE.md actualizado — estado real de seguridad verificado en código' },
      { type: 'security', text: 'Confirmadas firmas webhook Stripe (constructEvent) y Clerk (svix) — ya estaban implementadas' },
      { type: 'security', text: 'Confirmados security headers HTTP en next.config — CSP, X-Frame-Options, nosniff' },
    ],
  },
  {
    date: '2026-05-18',
    tag: 'sprint 4',
    items: [
      { type: 'feature',  text: 'Landing hero rediseñado — letras staggered, mascot flotante, paneles CTA animados, noise + spotlight' },
      { type: 'feature',  text: 'Asistente IA en /casa/* — chat flotante con 4 herramientas: ventas, inventario, órdenes, productos' },
      { type: 'feature',  text: 'Toggle para activar/desactivar IA desde configuración → asistente IA (apagado por defecto)' },
      { type: 'feature',  text: 'Sistema de SKU auto-generado: CAT3-SEQ4 para productos, CAT-SKU-TALLA para variantes' },
      { type: 'feature',  text: 'Card "inventario" en dashboard de /casa' },
      { type: 'feature',  text: 'Log de movimientos de venta en checkout (fire-and-forget RPC)' },
      { type: 'fix',      text: 'proxy.ts redirigía al admin a /cuenta/login en vez de /casa/login' },
      { type: 'feature',  text: 'Email al cliente cuando se genera guía de rastreo Skydropx' },
    ],
  },
  {
    date: '2026-05-17',
    tag: 'sprint 3',
    items: [
      { type: 'fix',      text: 'shipping_carrier no se guardaba en DB al crear guía Skydropx' },
      { type: 'fix',      text: 'label_url quedaba null — polling ahora espera trackingNumber AND labelUrl' },
      { type: 'fix',      text: 'Consultar estado no guardaba label_url si había quedado null' },
      { type: 'fix',      text: 'Stock de productos sin variante no se verificaba en checkout' },
      { type: 'fix',      text: 'RPC decrement_stock no cubría productos sin variante — nuevo RPC decrement_product_stock' },
      { type: 'feature',  text: '/casa/inventario — lista de productos con stock, SKUs y movimientos' },
      { type: 'feature',  text: '/casa/ordenes/nuevo — crear orden manual con buscador de cliente' },
    ],
  },
  {
    date: '2026-05-16',
    tag: 'sprint 2',
    items: [
      { type: 'feature',  text: 'Skydropx completo: cotización, generar guía, rastreo, cancelar, historial JSONB, PDF/imprimir' },
      { type: 'feature',  text: 'Cuenta del cliente (/cuenta) — tabs: pedidos, boletos, artistas seguidos, perfil' },
      { type: 'feature',  text: 'Page builder CMS (/casa/editor)' },
      { type: 'feature',  text: 'Biblioteca de medios (/casa/media)' },
      { type: 'feature',  text: 'Configuración completa: Stripe test/live, Skydropx, embalajes SAT, tarifas, políticas' },
      { type: 'feature',  text: 'Export CSV de órdenes (/api/export-orders)' },
    ],
  },
  {
    date: '2026-05-15',
    tag: 'sprint 1 — base',
    items: [
      { type: 'feature',  text: 'Proyecto base: Next.js 16 + Clerk + Supabase + Stripe + Resend + Skydropx + Vercel' },
      { type: 'feature',  text: 'Auth admin + fans con roles (admin / artista / fan)' },
      { type: 'feature',  text: 'Artistas CRUD completo — tracks, shows, tasks, calendario, secciones, portal artista' },
      { type: 'feature',  text: 'Tienda: productos con variantes, categorías, tallas, imagen con crop' },
      { type: 'feature',  text: 'Pago con Stripe: Payment Intent + webhook fallback + createOrder' },
      { type: 'feature',  text: 'Emails transaccionales: confirmación cliente + notificación admin (Resend)' },
      { type: 'feature',  text: 'Órdenes admin: lista, detalle, cambiar estado, folios GALLO-NNNNN' },
      { type: 'feature',  text: 'Design system GALLO — 5 colores, tipografía, tokens CSS, sin Tailwind' },
    ],
  },
]

type TaskStatus = 'done' | 'pending' | 'blocked'

const TASKS: {
  section: string
  accent: string
  items: { status: TaskStatus; text: string; note?: string }[]
}[] = [
  {
    section: 'producción',
    accent: '#ff0100',
    items: [
      { status: 'pending', text: 'Cambiar Clerk de pk_test_ a pk_live_', note: 'Vercel + Clerk Dashboard + actualizar env vars' },
      { status: 'pending', text: 'Registrar webhook Stripe en producción', note: 'Stripe Dashboard → /api/stripe/webhook → copiar whsec_...' },
      { status: 'pending', text: 'Verificar RESEND_API_KEY y ADMIN_EMAIL en Vercel', note: 'Sin esto los correos salen silenciosamente vacíos' },
      { status: 'pending', text: 'Agregar ANTHROPIC_API_KEY en Vercel si quieren activar IA', note: 'Activar luego desde /casa/tienda/configuracion → asistente IA' },
      { status: 'pending', text: 'Conectar dominio compadregallo.com en Vercel', note: 'Settings → Domains → agregar dominio → actualizar NEXT_PUBLIC_APP_URL' },
    ],
  },
  {
    section: 'seguridad',
    accent: '#cc5500',
    items: [
      { status: 'done',    text: 'Firmas webhook Stripe — constructEvent(body, sig, secret)' },
      { status: 'done',    text: 'Firmas webhook Clerk — svix SDK con svix-signature' },
      { status: 'done',    text: 'Security headers HTTP — CSP, X-Frame-Options, nosniff en next.config' },
      { status: 'done',    text: 'Precios re-fetcheados server-side antes de crear PI' },
      { status: 'done',    text: 'Mutaciones admin protegidas con requireAdminUserId()' },
      { status: 'pending', text: 'Rate limiting en /api/stripe/create-intent y /api/ai', note: 'Upstash Ratelimit o Vercel Edge Middleware' },
      { status: 'pending', text: 'Validación de schema con Zod en server actions del checkout', note: 'Solo hay .trim() y parseFloat() actualmente' },
      { status: 'pending', text: 'Validar MIME en getUploadUrl() antes de firmar URL', note: 'Actualmente acepta cualquier contentType' },
    ],
  },
  {
    section: 'features',
    accent: '#003a87',
    items: [
      { status: 'pending', text: 'Checkout de boletos/shows', note: 'UI en /preventa existe, tabla tickets existe, falta el flujo de pago' },
      { status: 'pending', text: 'Vista reducida para artistas (portal)', note: 'isAdmin prop ya pasa al componente, falta ocultar trash/publish para no-admin' },
      { status: 'pending', text: 'SEO dinámico — generateMetadata en /artista/[slug] y /tienda/[id]' },
      { status: 'pending', text: 'RLS en Supabase', note: 'Todo va por service role actualmente; sin restricciones por fila' },
      { status: 'pending', text: 'Optimización mobile del panel admin' },
    ],
  },
  {
    section: 'infraestructura',
    accent: '#6b6a64',
    items: [
      { status: 'done', text: 'Next.js 16 App Router en Vercel — auto-deploy desde GitHub main' },
      { status: 'done', text: 'Supabase — base de datos + storage + RPCs' },
      { status: 'done', text: 'Clerk — auth fans + admin, roles por DB' },
      { status: 'done', text: 'Stripe — test/live keys en DB (store_settings)' },
      { status: 'done', text: 'Resend — emails transaccionales' },
      { status: 'done', text: 'Skydropx Pro — cotizar, generar guía, rastrear, cancelar' },
      { status: 'done', text: 'Anthropic SDK — asistente IA con agentic loop (desactivado por defecto)' },
    ],
  },
]

const CODE_STATE = [
  { file: 'src/proxy.ts',                            desc: 'middleware Clerk — protege /casa y /cuenta' },
  { file: 'src/lib/skydropx.ts',                     desc: 'cliente Skydropx: cotizar, guía, rastrear, cancelar, balance, SAT' },
  { file: 'src/lib/emails.ts',                       desc: 'Resend: confirmación, envío, admin alert' },
  { file: 'src/lib/auth.server.ts',                  desc: 'requireAdmin, isAdmin, getLinkedArtist' },
  { file: 'src/lib/sku.ts',                          desc: 'buildProductSku (CAT3-SEQ4), buildVariantSku' },
  { file: 'src/app/api/stripe/webhook/route.ts',     desc: 'webhook Stripe con constructEvent' },
  { file: 'src/app/api/clerk/webhook/route.ts',      desc: 'webhook Clerk con svix' },
  { file: 'src/app/api/ai/route.ts',                 desc: 'asistente IA — agentic loop, 4 tools, admin-only' },
  { file: 'src/app/(platform)/carrito/checkout/',    desc: 'createOrder, getRates, decrementStock' },
  { file: 'src/app/casa/ordenes/[id]/actions.ts',    desc: 'Skydropx shipment, status, cancel' },
  { file: 'src/app/casa/tienda/actions.ts',          desc: 'CRUD productos + variantes + SKU auto-gen' },
  { file: 'src/components/LandingHero.tsx',          desc: 'landing — animaciones CSS, mascot, paneles CTA' },
  { file: 'src/app/casa/AdminAI.tsx',                desc: 'chat flotante en /casa/*' },
  { file: 'next.config.*',                           desc: 'security headers: CSP, X-Frame-Options, nosniff' },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  feature:  { bg: 'rgba(0,58,135,0.07)',   text: '#003a87', label: 'feature' },
  fix:      { bg: 'rgba(255,1,0,0.06)',    text: '#cc0000', label: 'fix' },
  security: { bg: 'rgba(204,85,0,0.07)',   text: '#993300', label: 'security' },
  doc:      { bg: 'rgba(0,0,0,0.04)',      text: '#6b6a64', label: 'doc' },
}

const STATUS_ICON: Record<TaskStatus, { icon: string; color: string }> = {
  done:    { icon: '✓', color: '#1a6b35' },
  pending: { icon: '○', color: M },
  blocked: { icon: '✗', color: '#cc0000' },
}

function SectionHeader({ title, count, total }: { title: string; count?: number; total?: number }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: S, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {title}
      {count !== undefined && total !== undefined && (
        <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: count === total ? '#1a6b35' : M }}>
          {count}/{total}
        </span>
      )}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

// ── Changelog tab ─────────────────────────────────────────────────────────────
function ChangelogTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {CHANGELOG.map(session => (
        <Card key={session.date}>
          <div style={{
            padding: '12px 18px', borderBottom: `1px solid ${B}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0a0a0a' }}>
              {session.date}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '2px 8px', borderRadius: 999, background: '#f0efe9', color: M,
            }}>
              {session.tag}
            </span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {session.items.map((item, i) => {
              const meta = TYPE_COLORS[item.type]
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '7px 18px',
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '2px 7px', borderRadius: 999, background: meta.bg, color: meta.text,
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 13, color: '#0a0a0a', lineHeight: 1.5 }}>
                    {item.text}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── Tasks tab ─────────────────────────────────────────────────────────────────
function TareasTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {TASKS.map(section => {
        const doneCount = section.items.filter(i => i.status === 'done').length
        return (
          <div key={section.section}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 24, height: 3, background: section.accent, borderRadius: 2 }} />
              <SectionHeader
                title={section.section}
                count={doneCount}
                total={section.items.length}
              />
            </div>
            <Card>
              {section.items.map((item, i) => {
                const meta = STATUS_ICON[item.status]
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '11px 18px',
                    borderBottom: i < section.items.length - 1 ? `1px solid ${B}` : 'none',
                    opacity: item.status === 'done' ? 0.6 : 1,
                  }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700, color: meta.color,
                      flexShrink: 0, lineHeight: 1.4, width: 16, textAlign: 'center',
                    }}>
                      {meta.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13, color: '#0a0a0a', lineHeight: 1.5,
                        textDecoration: item.status === 'done' ? 'line-through' : 'none',
                      }}>
                        {item.text}
                      </div>
                      {item.note && item.status !== 'done' && (
                        <div style={{ fontSize: 11, color: S, marginTop: 2, lineHeight: 1.4 }}>
                          {item.note}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        )
      })}
    </div>
  )
}

// ── Code tab ──────────────────────────────────────────────────────────────────
function CodigoTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Rutas clave */}
      <div>
        <div style={{ marginBottom: 10 }}>
          <SectionHeader title="archivos clave" />
        </div>
        <Card>
          {CODE_STATE.map((row, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 18px', borderBottom: i < CODE_STATE.length - 1 ? `1px solid ${B}` : 'none',
            }}>
              <code style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', color: '#003a87',
                background: 'rgba(0,58,135,0.05)', padding: '2px 7px', borderRadius: 4,
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {row.file}
              </code>
              <span style={{ fontSize: 12, color: M, lineHeight: 1.5 }}>{row.desc}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Variables de entorno */}
      <div>
        <div style={{ marginBottom: 10 }}>
          <SectionHeader title="variables de entorno requeridas" />
        </div>
        <Card>
          {[
            { key: 'NEXT_PUBLIC_SUPABASE_URL',         status: 'ok',      note: 'URL del proyecto Supabase' },
            { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',    status: 'ok',      note: 'clave pública de Supabase' },
            { key: 'SUPABASE_SERVICE_ROLE_KEY',        status: 'ok',      note: 'clave privada de Supabase (solo servidor)' },
            { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', status: 'warn',   note: 'actualmente pk_test_ — cambiar a pk_live_ para producción' },
            { key: 'CLERK_SECRET_KEY',                 status: 'ok',      note: 'clave privada de Clerk' },
            { key: 'STRIPE_SECRET_KEY',                status: 'ok',      note: 'sk_test_ o sk_live_ desde store_settings' },
            { key: 'STRIPE_WEBHOOK_SECRET',            status: 'pending', note: 'registrar endpoint en Stripe Dashboard primero' },
            { key: 'RESEND_API_KEY',                   status: 'ok',      note: 'para emails transaccionales' },
            { key: 'RESEND_FROM_EMAIL',                status: 'ok',      note: 'pedidos@compadregallo.com' },
            { key: 'ADMIN_EMAIL',                      status: 'ok',      note: 'para notificaciones de pedidos al admin' },
            { key: 'NEXT_PUBLIC_APP_URL',              status: 'pending', note: 'cambiar a https://compadregallo.com al conectar dominio' },
            { key: 'ADMIN_USER_IDS',                   status: 'ok',      note: 'IDs de Clerk con rol admin (separados por coma)' },
            { key: 'ANTHROPIC_API_KEY',                status: 'pending', note: 'opcional — solo si activan asistente IA' },
          ].map((row, i, arr) => {
            const color = row.status === 'ok' ? '#1a6b35' : row.status === 'warn' ? '#cc7700' : M
            const bg    = row.status === 'ok' ? 'rgba(26,107,53,0.06)' : row.status === 'warn' ? 'rgba(204,119,0,0.07)' : '#f6f5f1'
            const icon  = row.status === 'ok' ? '✓' : row.status === 'warn' ? '!' : '○'
            return (
              <div key={row.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 18px', borderBottom: i < arr.length - 1 ? `1px solid ${B}` : 'none',
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color, width: 14, textAlign: 'center', flexShrink: 0 }}>
                  {icon}
                </span>
                <code style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  background: bg, padding: '2px 7px', borderRadius: 4,
                  color, flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  {row.key}
                </code>
                <span style={{ fontSize: 12, color: M }}>{row.note}</span>
              </div>
            )
          })}
        </Card>
      </div>

      {/* Stack */}
      <div>
        <div style={{ marginBottom: 10 }}>
          <SectionHeader title="stack" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { name: 'Next.js 16',      sub: 'App Router + Server Actions',  color: '#0a0a0a' },
            { name: 'Supabase',        sub: 'PostgreSQL + Storage + RPCs',   color: '#1a6b35' },
            { name: 'Clerk v7',        sub: 'auth admin + fans + roles',     color: '#6c47ff' },
            { name: 'Stripe v22',      sub: 'PI + webhook + test/live',      color: '#635bff' },
            { name: 'Resend',          sub: 'emails transaccionales',        color: '#0a0a0a' },
            { name: 'Skydropx Pro',    sub: 'envíos + carta porte',          color: '#003a87' },
            { name: 'Anthropic SDK',   sub: 'asistente IA con tools',        color: '#cc5500' },
            { name: 'Vercel',          sub: 'deploy desde GitHub main',      color: '#0a0a0a' },
          ].map(tech => (
            <div key={tech.name} style={{
              background: '#fff', border: `1px solid ${B}`, borderRadius: 6,
              padding: '14px 16px',
            }}>
              <div style={{ width: 20, height: 2.5, background: tech.color, borderRadius: 2, marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', marginBottom: 2 }}>{tech.name}</div>
              <div style={{ fontSize: 11, color: M }}>{tech.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = ['changelog', 'tareas', 'código'] as const
type Tab = typeof TABS[number]

export default function DesarrolloPanel() {
  const [tab, setTab] = useState<Tab>('tareas')

  const doneTotal  = TASKS.flatMap(s => s.items).filter(i => i.status === 'done').length
  const totalTasks = TASKS.flatMap(s => s.items).length
  const pendingProd = TASKS.find(s => s.section === 'producción')?.items.filter(i => i.status !== 'done').length ?? 0

  return (
    <AdminShell crumb="desarrollo" crumbHref="/casa">
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 28px 72px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900,
            letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 6, textTransform: 'lowercase',
          }}>
            panel de desarrollo
          </h1>
          <p style={{ color: M, fontSize: 13, margin: 0 }}>
            estado del proyecto, changelog y lista de tareas pendientes.
          </p>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            {
              label: 'tareas completadas',
              value: `${doneTotal}/${totalTasks}`,
              sub: `${totalTasks - doneTotal} pendientes`,
              color: doneTotal === totalTasks ? '#1a6b35' : '#003a87',
            },
            {
              label: 'sesiones de trabajo',
              value: CHANGELOG.length,
              sub: `última: ${CHANGELOG[0].date}`,
              color: '#0a0a0a',
            },
            {
              label: 'para producción',
              value: pendingProd,
              sub: pendingProd === 0 ? 'listo para deploy' : `paso${pendingProd !== 1 ? 's' : ''} manuales faltantes`,
              color: pendingProd > 0 ? '#cc5500' : '#1a6b35',
            },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 22px',
            }}>
              <div style={{ width: 28, height: 3, background: kpi.color, borderRadius: 2, marginBottom: 14 }} />
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0a0a0a', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: M, marginTop: 6 }}>{kpi.label}</div>
              <div style={{ fontSize: 11, color: S, marginTop: 3 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: '#f0efe9', borderRadius: 6, padding: 3, width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '7px 18px', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#0a0a0a' : M,
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'background 100ms, color 100ms',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'changelog' && <ChangelogTab />}
        {tab === 'tareas'    && <TareasTab />}
        {tab === 'código'    && <CodigoTab />}

      </main>
    </AdminShell>
  )
}
