import type { Metadata } from 'next'
import Link from 'next/link'
import PolicyPage, { Mail } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'cambios y devoluciones — compadregallo',
  description: '5 días hábiles para devolver, y si algo llega mal lo arreglamos.',
}

export default function CambiosPage() {
  return (
    <PolicyPage
      title="cambios y devoluciones"
      updated="septiembre 2026"
      intro={
        <p>
          si te arrepientes, tienes <span className="pol-hl">5 días hábiles</span> para
          devolverlo. si llegó mal, lo arreglamos nosotros, sin costo.
        </p>
      }
    >
      <h2>1. si te arrepientes</h2>
      <p>
        tienes 5 días hábiles desde que recibes tu pedido para devolverlo. la pieza tiene que
        regresar sin usar, completa y en su empaque original.
      </p>
      <ul>
        <li>escríbenos a <Mail /> con tu número de pedido antes de mandar nada.</li>
        <li>te decimos a dónde enviarlo. el envío de regreso corre por tu cuenta.</li>
        <li>cuando nos llega y la revisamos, te reembolsamos el precio de la pieza a tu mismo
          método de pago. el envío original no se reembolsa.</li>
      </ul>

      <h2>2. si llegó mal</h2>
      <ul>
        <li>te llegó un producto distinto al que pediste.</li>
        <li>tiene un defecto de fabricación.</li>
        <li>llegó roto o dañado por el envío.</li>
      </ul>
      <p>
        en cualquiera de esos casos te mandamos la pieza correcta y nosotros pagamos todos los
        envíos. si ya no hay piezas de ese producto, te devolvemos tu dinero completo.
      </p>

      <h2>3. cómo reportarlo</h2>
      <p>escríbenos a <Mail /> lo antes posible, de preferencia en las primeras 48 horas, con:</p>
      <ul>
        <li>tu número de pedido (empieza con GALLO-).</li>
        <li>fotos claras del producto y, si llegó dañado, también de la caja.</li>
        <li>una descripción corta de lo que pasó.</li>
      </ul>
      <p>
        guarda la caja y el empaque hasta que resolvamos: la paquetería a veces los pide para
        su reporte. revisamos cada caso y te respondemos por correo.
      </p>

      <h2>4. pedidos que no han salido</h2>
      <p>
        si te equivocaste en algo (dirección, producto, cantidad) y tu pedido todavía no se
        envía, escríbenos lo antes posible y vemos si se puede corregir. puedes ver en qué va
        tu pedido en <Link href="/rastrear">rastrear pedido</Link>.
      </p>

      <h2>5. contacto</h2>
      <p>cualquier duda sobre esta política, escríbenos a <Mail />.</p>
    </PolicyPage>
  )
}
