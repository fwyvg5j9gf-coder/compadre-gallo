import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase.server'
import AdminShell from '@/app/casa/AdminShell'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: 'pendiente', bg: '#f0efe9',              text: '#6b6a64' },
  paid:      { label: 'pagado',    bg: 'rgba(0,58,135,0.08)',  text: '#003a87' },
  shipped:   { label: 'enviado',   bg: 'rgba(0,196,223,0.1)',  text: '#007a8c' },
  delivered: { label: 'entregado', bg: 'rgba(26,107,53,0.08)', text: '#1a6b35' },
  refunded:  { label: 'reembolso', bg: 'rgba(255,1,0,0.06)',   text: '#cc0000' },
  failed:    { label: 'fallido',   bg: 'rgba(255,1,0,0.06)',   text: '#cc0000' },
}

const B = '#e8e7e1', M = '#6b6a64', S = '#9a9994'

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/cuenta/login')
  if (!(await isAdmin(userId))) redirect('/casa')

  const { q = '' } = await searchParams
  const query = q.trim()

  if (!query) {
    return (
      <AdminShell crumb="buscar">
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '80px 28px', textAlign: 'center' }}>
          <p style={{ color: M, fontSize: 14 }}>escribe algo para buscar.</p>
        </main>
      </AdminShell>
    )
  }

  const like = `%${query}%`

  const [ordersRes, artistsRes, productsRes] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, folio_number, customer_name, customer_email, total_mxn, status, created_at, is_test')
      .or(`customer_name.ilike.${like},customer_email.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('artists')
      .select('id, name, genre, is_published')
      .ilike('name', like)
      .limit(10),
    supabaseAdmin
      .from('products')
      .select('id, name, price_mxn, is_published')
      .ilike('name', like)
      .limit(10),
  ])

  const orders   = ordersRes.data   ?? []
  const artists  = artistsRes.data  ?? []
  const products = productsRes.data ?? []
  const total    = orders.length + artists.length + products.length

  return (
    <AdminShell crumb="buscar">
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 28px 72px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: '#0a0a0a', textTransform: 'lowercase', marginBottom: 6 }}>
            resultados para &ldquo;{query}&rdquo;
          </h1>
          <p style={{ color: M, fontSize: 13, margin: 0 }}>
            {total} resultado{total !== 1 ? 's' : ''} · órdenes {orders.length} · artistas {artists.length} · productos {products.length}
          </p>
        </div>

        {orders.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              órdenes
            </div>
            <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
              {orders.map((o, i) => {
                const meta = STATUS_META[o.status] ?? STATUS_META.pending
                return (
                  <Link key={o.id} href={`/casa/ordenes/${o.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px',
                    borderBottom: i < orders.length - 1 ? `1px solid ${B}` : 'none',
                    textDecoration: 'none', transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fafaf8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0a0a0a' }}>
                      #{o.folio_number}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: '#0a0a0a' }}>
                      {o.customer_name ?? o.customer_email}
                    </span>
                    <span style={{ fontSize: 11, color: M }}>
                      {o.customer_email}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0a0a0a' }}>
                      {fmt(o.total_mxn)}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {artists.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              artistas
            </div>
            <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
              {artists.map((a, i) => (
                <Link key={a.id} href={`/casa/artistas/${a.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px',
                  borderBottom: i < artists.length - 1 ? `1px solid ${B}` : 'none',
                  textDecoration: 'none', transition: 'background 100ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fafaf8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{a.name}</span>
                  {a.genre && <span style={{ fontSize: 12, color: M }}>{a.genre}</span>}
                  <span style={{ fontSize: 11, color: a.is_published ? '#1a6b35' : M, fontWeight: 600 }}>
                    {a.is_published ? 'publicado' : 'borrador'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {products.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              productos
            </div>
            <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
              {products.map((p, i) => (
                <Link key={p.id} href={`/casa/tienda/productos/${p.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px',
                  borderBottom: i < products.length - 1 ? `1px solid ${B}` : 'none',
                  textDecoration: 'none', transition: 'background 100ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fafaf8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0a0a0a' }}>{p.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0a0a0a' }}>{fmt(p.price_mxn)}</span>
                  <span style={{ fontSize: 11, color: p.is_published ? '#1a6b35' : M, fontWeight: 600 }}>
                    {p.is_published ? 'publicado' : 'borrador'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {total === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: M, fontSize: 13, fontStyle: 'italic' }}>
            sin resultados para &ldquo;{query}&rdquo;.
          </div>
        )}

      </main>
    </AdminShell>
  )
}
