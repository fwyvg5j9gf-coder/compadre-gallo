'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { subscribe, type SubscribeState } from '@/app/(platform)/correos/actions'
import { WELCOME_PERCENT } from '@/lib/newsletter'

// "10% en tu primera compra a cambio de tu correo" (aprendido de Crème
// Atelier), sin pop-up: una sección tranquila dentro de la tienda.
export default function NewsletterSignup() {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribe, null)

  return (
    <section className="nl" aria-labelledby="nl-title">
      <div className="nl-copy">
        <h2 id="nl-title" className="nl-title">
          {WELCOME_PERCENT}% en<br /><span className="lt-hl">tu primera.</span>
        </h2>
        <p className="nl-sub">
          déjanos tu correo y te mandamos tu código. también te avisamos cuando salga una pieza nueva, antes que a nadie.
        </p>
      </div>

      {state?.ok ? (
        <p className="nl-done" role="status">{state.msg}</p>
      ) : (
        <form action={action} className="nl-form">
          <label htmlFor="nl-email" className="eyebrow">TU CORREO</label>
          <div className="nl-row">
            <input
              id="nl-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              className="nl-input"
            />
            <button type="submit" className="btn btn-lg btn-accent" disabled={pending}>
              {pending ? 'mandando…' : 'mándamelo'}
            </button>
          </div>
          {/* Campo trampa para bots: fuera de la vista y del tabulador. */}
          <input type="text" name="empresa" tabIndex={-1} autoComplete="off" aria-hidden="true" className="nl-trap" />
          {state && !state.ok && <p className="nl-error" role="alert">{state.msg}</p>}
          <p className="nl-fine">
            un código por correo, de un solo uso. te sales cuando quieras. <Link href="/politicas/privacidad">privacidad</Link>.
          </p>
        </form>
      )}
    </section>
  )
}
