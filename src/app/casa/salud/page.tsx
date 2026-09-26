import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth.server'
import AdminShell from '@/app/casa/AdminShell'
import { runHealthChecks, type HealthStatus } from '@/lib/health.server'

export const dynamic = 'force-dynamic'

const COLOR: Record<HealthStatus, { bg: string; fg: string; label: string }> = {
  ok:    { bg: 'rgba(26,107,53,0.1)',  fg: '#1a6b35', label: 'ok' },
  aviso: { bg: 'rgba(255,152,0,0.14)', fg: '#8a5e00', label: 'aviso' },
  falla: { bg: 'rgba(255,1,0,0.1)',    fg: '#cc0000', label: 'falla' },
}

// Salud del sistema: revisa en vivo, desde producción, que cada servicio del
// que depende la tienda esté conectado (ver src/lib/health.server.ts).
export default async function SaludPage() {
  const { userId } = await auth()
  if (!userId) redirect('/casa/login')
  await requireAdmin()

  const checks = await runHealthChecks()
  const fallas = checks.filter(c => c.status === 'falla').length
  const avisos = checks.filter(c => c.status === 'aviso').length
  const areas = [...new Set(checks.map(c => c.area))]

  return (
    <AdminShell crumb="salud" crumbHref="/casa/salud">
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, letterSpacing: '-0.03em', margin: 0 }}>salud del sistema</h1>
        <p style={{ fontSize: 14, color: '#6b6a64', margin: '6px 0 24px' }}>
          {fallas === 0 && avisos === 0
            ? 'todo conectado.'
            : `${fallas} falla${fallas === 1 ? '' : 's'} · ${avisos} aviso${avisos === 1 ? '' : 's'}. se revisa en vivo cada vez que abres esta página.`}
        </p>

        <div style={{ display: 'grid', gap: 20 }}>
          {areas.map(area => (
            <section key={area}>
              <h2 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9994', margin: '0 0 8px' }}>{area}</h2>
              <div style={{ background: '#fff', border: '1px solid #e8e7e1', borderRadius: 8, overflow: 'hidden' }}>
                {checks.filter(c => c.area === area).map((c, i) => (
                  <div key={c.nombre} style={{ display: 'grid', gridTemplateColumns: '64px 200px minmax(0, 1fr) 56px', gap: 12, alignItems: 'start', padding: '12px 16px', borderTop: i ? '1px solid #e8e7e1' : 'none' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', padding: '3px 0', borderRadius: 999, background: COLOR[c.status].bg, color: COLOR[c.status].fg }}>
                      {COLOR[c.status].label}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{c.nombre}</span>
                    <span style={{ fontSize: 13, color: '#6b6a64', lineHeight: 1.45 }}>{c.detalle}</span>
                    <span style={{ fontSize: 11, color: '#9a9994', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{c.ms != null ? `${c.ms} ms` : ''}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </AdminShell>
  )
}
