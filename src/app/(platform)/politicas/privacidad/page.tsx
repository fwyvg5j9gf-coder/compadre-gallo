import type { Metadata } from 'next'
import PolicyPage, { Mail } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'aviso de privacidad — compadregallo',
  description: 'qué datos pedimos, para qué y cómo ejercer tus derechos.',
}

export default function PrivacidadPage() {
  return (
    <PolicyPage
      title="aviso de privacidad"
      updated="septiembre 2026"
      intro={
        <p>
          pedimos solo lo necesario para mandarte tu pedido. no vendemos ni rentamos tus datos a
          nadie.
        </p>
      }
    >
      <h2>1. responsable</h2>
      <p>
        GALLO, operador de compadregallo.com, es responsable del tratamiento de tus datos
        personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de
        los Particulares. contacto: <Mail />.
      </p>

      <h2>2. qué datos recopilamos</h2>
      <ul>
        <li>nombre completo.</li>
        <li>correo electrónico.</li>
        <li>teléfono (opcional).</li>
        <li>dirección de envío.</li>
        <li>historial de pedidos.</li>
        <li>correos que nos escribas a soporte.</li>
      </ul>
      <p>
        los datos de tu tarjeta los captura y procesa Stripe directamente; nosotros nunca los
        vemos ni los guardamos.
      </p>

      <h2>3. para qué los usamos</h2>
      <ul>
        <li>procesar, cobrar y enviar tu pedido.</li>
        <li>mandarte la confirmación y la guía de rastreo.</li>
        <li>responder tus dudas de soporte.</li>
        <li>cumplir obligaciones fiscales y legales.</li>
        <li>si te suscribes en la tienda: mandarte tu código de descuento y avisarte de piezas
          nuevas. cada correo trae una liga para salirte de la lista cuando quieras.</li>
      </ul>
      <p>no usamos tus datos para publicidad de terceros.</p>

      <h2>4. con quién los compartimos</h2>
      <p>solo con los proveedores que necesitamos para operar la tienda:</p>
      <ul>
        <li>Stripe: procesamiento de pagos.</li>
        <li>Skydropx y la paquetería que elijas en el checkout: envío y rastreo.</li>
        <li>Resend: envío de correos de tu pedido.</li>
        <li>Supabase y Vercel: almacenamiento de datos y operación del sitio.</li>
      </ul>
      <p>cada uno solo recibe lo indispensable para su función.</p>

      <h2>5. cookies y almacenamiento local</h2>
      <p>
        el sitio guarda tu carrito en tu navegador para que no se pierda al cerrar la página.
        puedes borrarlo desde la configuración de tu navegador; si lo haces, se vacía tu carrito.
      </p>

      <h2>6. cuánto tiempo los guardamos</h2>
      <p>
        mientras hagan falta para los fines de este aviso o lo que exija la ley (por ejemplo,
        registros fiscales).
      </p>

      <h2>7. tus derechos (ARCO)</h2>
      <p>
        puedes pedir acceso a tus datos, corregirlos, cancelarlos u oponerte a su uso. escríbenos
        a <Mail /> con tu nombre, el correo con el que compraste y lo que necesitas. te respondemos
        en un máximo de 20 días hábiles.
      </p>

      <h2>8. cambios a este aviso</h2>
      <p>si cambia, lo publicamos aquí con la nueva fecha.</p>
    </PolicyPage>
  )
}
