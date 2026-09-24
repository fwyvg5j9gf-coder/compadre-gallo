import Link from 'next/link'

export const CONTACT_EMAIL = 'hola@compadregallo.com'

// Molde de las páginas legales de la tienda (cambios, términos, privacidad).
// Texto fijo en código, igual que en gangstafairy: cambia poco y conviene que
// cada cambio quede registrado en git.
export default function PolicyPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <article className="pol">
      <Link href="/tienda" className="pol-back">← volver a la tienda</Link>
      <h1 className="pol-title">{title}</h1>
      <p className="pol-updated">última actualización: {updated}</p>
      {intro && <div className="pol-intro">{intro}</div>}
      <div className="pol-body">{children}</div>
    </article>
  )
}

export function Mail() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
}
