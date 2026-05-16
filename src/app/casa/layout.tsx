import { supabaseAdmin } from '@/lib/supabase.server'

export default async function CasaLayout({ children }: { children: React.ReactNode }) {
  const { data: s } = await supabaseAdmin
    .from('store_settings')
    .select('stripe_test_mode')
    .single()
  const testMode = s?.stripe_test_mode ?? false

  return (
    <>
      {testMode && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, zIndex: 40,
          background: '#ffe200', color: '#0a0a0a',
          padding: '6px 28px',
          fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 10,
          letterSpacing: '0.03em',
        }}>
          <span>MODO PRUEBA · STRIPE TEST</span>
          <span style={{ fontWeight: 400, opacity: 0.7 }}>
            tarjeta: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>4242 4242 4242 4242</span> · cualquier fecha futura · cualquier CVC
          </span>
        </div>
      )}
      <div style={testMode ? { paddingTop: 32 } : undefined}>
        {children}
      </div>
    </>
  )
}
