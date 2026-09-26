import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase.server'
import { unsubscribe } from '../actions'

export const metadata: Metadata = {
  title: 'correos — compadregallo',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function BajaPage({ searchParams }: { searchParams: Promise<{ t?: string; listo?: string }> }) {
  const { t = '', listo } = await searchParams
  const valid = /^[0-9a-f]{36}$/.test(t)

  const { data: sub } = valid
    ? await supabaseAdmin.from('newsletter_subscribers').select('email, unsubscribed_at').eq('unsubscribe_token', t).maybeSingle()
    : { data: null }

  return (
    <article className="pol">
      <Link href="/tienda" className="pol-back">← volver a la tienda</Link>

      {!sub ? (
        <>
          <h1 className="pol-title">esta liga ya no sirve.</h1>
          <p className="pol-intro">si quieres dejar de recibir correos, escríbenos a <a href="mailto:hola@compadregallo.com">hola@compadregallo.com</a> y te sacamos de la lista.</p>
        </>
      ) : sub.unsubscribed_at || listo ? (
        <>
          <h1 className="pol-title">listo, ya no te escribimos.</h1>
          <p className="pol-intro">sacamos a {sub.email} de la lista. si algún día te arrepientes, te vuelves a apuntar en la tienda.</p>
        </>
      ) : (
        <>
          <h1 className="pol-title">¿ya no quieres correos?</h1>
          <p className="pol-intro">dejaremos de mandarle correos de novedades a {sub.email}. los de tus pedidos te siguen llegando.</p>
          <form action={unsubscribe}>
            <input type="hidden" name="t" value={t} />
            <button type="submit" className="btn btn-lg btn-primary">sí, sácame de la lista</button>
          </form>
        </>
      )}
    </article>
  )
}
