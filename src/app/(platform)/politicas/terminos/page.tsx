import type { Metadata } from 'next'
import Link from 'next/link'
import PolicyPage, { Mail } from '@/components/PolicyPage'

export const metadata: Metadata = {
  title: 'términos y condiciones — compadregallo',
  description: 'las reglas para usar compadregallo.com y comprar en la tienda.',
}

export default function TerminosPage() {
  return (
    <PolicyPage
      title="términos y condiciones"
      updated="septiembre 2026"
      intro={
        <p>
          estos términos aplican al usar compadregallo.com y al comprar en nuestra tienda. si
          navegas o compras en el sitio, los aceptas.
        </p>
      }
    >
      <h2>1. quiénes somos</h2>
      <p>
        GALLO es una productora mexicana. en compadregallo.com vendemos lámparas y otras piezas
        de tiraje limitado.
      </p>

      <h2>2. uso del sitio</h2>
      <p>
        el sitio y su contenido son para tu uso personal. no puedes copiar, reproducir ni
        distribuir diseños, imágenes, textos o logotipos sin nuestro permiso por escrito.
      </p>

      <h2>3. productos y existencias</h2>
      <p>
        las piezas son de tiraje limitado. mostramos las existencias reales, pero una pieza se
        puede agotar mientras llenas tus datos si alguien más compra la última primero. si pasa
        antes de pagar, te avisamos en el checkout y no se te cobra; si pasa justo mientras
        pagas, te reembolsamos el cargo completo en automático. los colores pueden variar un
        poco según tu pantalla.
      </p>

      <h2>4. precios y pago</h2>
      <p>
        los precios están en pesos mexicanos (MXN). los pagos se procesan con Stripe: tarjeta de
        crédito o débito, Apple Pay y Google Pay. nunca guardamos los datos completos de tu
        tarjeta. si hay un error evidente en un precio, nos reservamos el derecho de corregirlo
        antes de confirmar tu pedido.
      </p>

      <h2>5. envíos</h2>
      <p>
        enviamos dentro de méxico. el costo y el tiempo de entrega se calculan en el checkout
        según tu código postal. cuando tu pedido sale, te mandamos la guía por correo y puedes
        seguirlo en <Link href="/rastrear">rastrear pedido</Link>.
      </p>

      <h2>6. cambios y devoluciones</h2>
      <p>
        tienes 5 días hábiles desde que recibes tu pedido para devolverlo sin usar. si llega
        equivocado, con defecto o dañado por el envío, lo arreglamos sin costo. el detalle está
        en <Link href="/politicas/cambios-y-devoluciones">cambios y devoluciones</Link>.
      </p>

      <h2>7. propiedad intelectual</h2>
      <p>
        los diseños, ilustraciones, fotos, logotipos y demás contenido del sitio son de GALLO o
        se usan con licencia de sus autores.
      </p>

      <h2>8. responsabilidad</h2>
      <p>
        no somos responsables por retrasos de la paquetería, por datos de envío incorrectos que
        nos des, ni por causas de fuerza mayor. en cualquier reclamo, nuestra responsabilidad
        máxima es el monto que pagaste por el producto.
      </p>

      <h2>9. cambios a estos términos</h2>
      <p>
        podemos actualizar estos términos. la fecha de arriba indica la versión vigente; los
        cambios no afectan pedidos ya confirmados.
      </p>

      <h2>10. contacto</h2>
      <p>dudas sobre estos términos: <Mail />.</p>
    </PolicyPage>
  )
}
