# Auditoría — 2026-08-10

Revisión de código, base de datos e infraestructura. Este documento vale más que
`ARCHITECTURE.md`, que quedó congelado el 2026-05-18 y ya no describe el sistema
(ver §4).

---

## 1. Arreglado en esta pasada

### 1.1 Se podía pagar $1 por cualquier pedido — CRÍTICO

`validateDiscountCode()` valida bien en el servidor, pero devolvía el monto al
navegador y **nadie lo volvía a verificar**:

- `/api/stripe/create-intent` leía `shippingMxn` y `discountMxn` crudos del body
  y calculaba `total = Math.max(100, subtotal + shippingMxn − discountMxn)`.
- `createOrder()` confirmaba `pi.status === 'succeeded'` pero **nunca comparaba
  `pi.amount`** contra el total que él mismo calculaba.

Mandando `discountMxn` igual al subtotal (o un `shippingMxn` negativo) el
PaymentIntent salía por el mínimo de 100 centavos. El código se cuidaba de los
precios de producto (`// never trust client-submitted prices`) y el descuento se
coló por la puerta de al lado.

**Arreglo:** `src/lib/checkout.server.ts` → `quoteOrder()` es ahora la única
fuente de verdad. Re-lee precios, re-deriva el descuento desde el *código* (nunca
del monto), y no deja que el envío sea negativo. Los dos endpoints la usan, así
que no pueden divergir. `createOrder` además compara contra `pi.amount`.

### 1.2 Fuga potencial de datos personales en `/api/export-orders` — ALTO

El guardia era `if (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(userId))`. Con
`ADMIN_USER_IDS` vacía o mal formada, **cualquier usuario con sesión** bajaba
hasta 10,000 órdenes con nombre, correo, teléfono y dirección. Era además la
única ruta que ignoraba `users.role = 'admin'`. Ahora usa `isAdmin()`.

### 1.3 Rama muerta de `products.stock` — MEDIO

`products` no tiene columna `stock` (el inventario vive en `product_variants`).
La rama de `createOrder` que la consultaba recibía un 42703 de PostgREST, dejaba
`prod` en null y respondía "sin stock". Hoy los 3 productos tienen variantes, así
que la rama era inalcanzable — pero el primer producto creado sin tallas habría
sido imposible de comprar. Eliminada, junto con el RPC `decrement_product_stock`.

### 1.4 Órdenes duplicadas por PaymentIntent

`createOrder` no era idempotente: dos llamadas con el mismo PI creaban dos
órdenes. Ahora devuelve la existente.

### 1.5 Productos despublicados

`create-intent` seleccionaba `is_published` y no lo usaba. `quoteOrder` ahora los
excluye del mapa de precios.

---

## 2. Pendiente — requiere una decisión o un dato que no tengo

| # | Qué | Por qué no lo hice |
|---|---|---|
| 1 | `CheckoutMerch.tsx` debe mandar `discountCode` en vez de `discountMxn` a `create-intent` | Ver §3 — es una línea, pero el archivo son 29 KB de JSX |
| 2 | La tienda está en **modo test de Stripe** (`store_settings.stripe_test_mode = true`) | Decisión de negocio; hay que confirmar antes que `stripe_sk_live` esté cargada en `store_secrets` |
| 3 | Falta `ANTHROPIC_API_KEY` en Vercel | No tengo la llave. El asistente `/api/ai` está apagado por `ai_chat_enabled = false`; al encenderlo va a fallar |
| 4 | La cotización de envío ignora `product.weight_grams` | `getRatesForCheckout` solo recibe `packagingTypeId`; arreglarlo cambia la firma y el call site en el checkout |
| 5 | Sin rate limiting en `create-intent`, `validateDiscountCode` y `/api/sepomex` | `validateDiscountCode` funciona como oráculo para enumerar códigos |
| 6 | Sin validación de esquema (Zod) en los boundaries | Es la clase de bug de §1.1; vale la pena hacerlo bien |
| 7 | Sin RLS en Supabase | Todo pasa por `supabaseAdmin` (service role) |

### 3. El parche del cliente (pendiente #1)

En `src/app/(platform)/carrito/checkout/CheckoutMerch.tsx`, en el `fetch` a
`/api/stripe/create-intent`:

```diff
-            discountMxn: data.discount?.discountMxn ?? 0,
+            discountCode: data.discount?.code,
```

Mientras no se aplique, `create-intent` no aplica descuento alguno. Con 0 códigos
en la base eso no cambia nada hoy. **En cuanto exista un código**, el cliente
pagaría precio completo: la orden se registra igual (`createOrder` solo rechaza
el cobro *de menos*, nunca el de más, para no dejar a nadie pagado y sin pedido)
y queda un `console.warn` de sobrecobro en los logs de Vercel. Aplica el parche
antes de crear el primer código.

---

## 4. `ARCHITECTURE.md` está desactualizado

- **No documenta ~10 módulos que existen:** boletos con QR, scanner, soporte,
  correos (bandeja Resend inbound), descuentos, inventario con `reorder_point`,
  cuentas, bitácora, búsqueda global, asistente AI, webhook de Clerk, email
  entrante.
- Dice que el flujo de boletos "no está construido" — sí lo está.
- **El esquema cambió:** existe `store_secrets` (las llaves salieron de
  `store_settings`); `products` ganó `category`, `sku`, `barcode` y **no tiene**
  `stock`; `product_variants` ganó `reorder_point`; `store_settings` ganó
  `ai_chat_enabled`; `orders` ganó `discount_code` y `discount_mxn`.
- Marca como CRÍTICAS tres cosas ya resueltas: firma del webhook de Stripe, firma
  del de Clerk y los security headers. Las tres están bien y verificadas en
  producción.
- Marca como pendientes `RESEND_API_KEY`, `ADMIN_EMAIL` y el dominio real, que ya
  están.

---

## 5. Estado al momento de la auditoría

| | |
|---|---|
| Producción | compadregallo.com responde 200; CSP, HSTS y nosniff aplicados |
| Contenido | 3 productos (2 publicados, 1 agotado), 2 artistas, 3 usuarios, 1 orden, 0 códigos de descuento |
| Envíos | Skydropx activo, origen Puebla CP 72440, markup 15%, envío gratis desde $1,500 |
| Pagos | Stripe en modo **test** |
