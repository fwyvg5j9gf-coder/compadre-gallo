# ARCHITECTURE — compadregallo.com

> Documento maestro de arquitectura. Dirigido a cualquier desarrollador o modelo de IA que tome este proyecto sin contexto previo. Describe **qué existe, cómo funciona, qué falta y cómo replicarlo** para futuros clientes.

---

## 1. Visión General

`compadregallo.com` es la plataforma web de **GALLO**, una productora de música/arte independiente en México. Es una tienda + portal de artistas + panel de administración construidos desde cero con Next.js.

El objetivo es que este proyecto sea la **plantilla base** para replicar en futuros clientes: otras productoras, tiendas de merch, sellos discográficos.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Función |
|---|---|---|---|
| Framework | Next.js | 16.2.6 | App Router, SSR, Server Actions |
| Runtime | React | 19.2.4 | UI |
| Auth | Clerk | ^7.3.4 | Login admin + fans, roles |
| DB | Supabase | ^2.105.4 | PostgreSQL + Storage |
| Pagos | Stripe | ^22.1.1 | Payment Intents + Webhooks |
| Envíos | Skydropx Pro API | REST | Cotización, guías, rastreo |
| Emails | Resend | ^6.12.3 | Transaccionales |
| CSS | Global CSS | — | Design system en variables CSS |
| Deploy | Vercel | — | Auto-deploy desde GitHub |
| Repo | GitHub | — | `fwyvg5j9gf-coder/compadre-gallo` |

**Sin Tailwind. Sin CSS Modules.** Todo el sistema de diseño vive en `src/app/globals.css`.

---

## 3. Variables de Entorno Requeridas

Todas deben estar en `.env.local` (desarrollo) y en Vercel (producción).

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # solo servidor, bypasses RLS

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe (también configurables desde /casa/tienda/configuracion)
STRIPE_SECRET_KEY=sk_test_...          # fallback si no hay key en DB
STRIPE_WEBHOOK_SECRET=whsec_...        # secreto del webhook de Stripe

# Resend (correos)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=pedidos@compadregallo.com
ADMIN_EMAIL=diego@compadregallo.com    # recibe notificaciones de nuevos pedidos

# App
NEXT_PUBLIC_APP_URL=https://compadregallo.com
ADMIN_USER_IDS=user_xxxxxx            # Clerk user IDs separados por coma (admins)
```

---

## 4. Estructura de Archivos

```
src/
├── app/
│   ├── layout.tsx              # Root layout: ClerkProvider + PlayerProvider
│   ├── globals.css             # Design system completo (tokens, componentes admin)
│   ├── page.tsx                # Landing "/" — bloques CMS desde DB
│   │
│   ├── (platform)/             # Rutas públicas con Nav + Footer
│   │   ├── layout.tsx          # Nav, PlayBar, CartProvider, Footer
│   │   ├── artista/[slug]/     # Detalle de artista
│   │   ├── artistas/           # Catálogo de artistas
│   │   ├── carrito/checkout/   # Checkout con Stripe
│   │   ├── checkout/[slug]/    # Checkout legacy de boletos (deprecated)
│   │   ├── cuenta/             # Cuenta del usuario (pedidos, boletos, perfil)
│   │   ├── preventa/           # Drops activos con countdown
│   │   └── tienda/             # Tienda de merch + [id] detalle
│   │
│   ├── (auth)/                 # Login público de fans
│   │   ├── cuenta/login/       # Clerk SignIn component
│   │   └── cuenta/registro/    # Clerk SignUp component
│   │
│   ├── casa/                   # Panel de administración (protegido)
│   │   ├── layout.tsx          # Sin Nav/Footer público
│   │   ├── login/              # Login de admin
│   │   ├── page.tsx            # Dashboard principal
│   │   ├── AdminShell.tsx      # Layout compartido del admin (nav lateral)
│   │   ├── artistas/           # Gestión de artistas
│   │   ├── clientes/           # Lista de clientes registrados
│   │   ├── editor/             # Page builder visual
│   │   ├── media/              # Biblioteca de medios
│   │   ├── ordenes/            # Gestión de órdenes ← más complejo
│   │   │   ├── page.tsx        # Lista con folio, estado, Skydropx balance badge
│   │   │   ├── [id]/           # Detalle de orden
│   │   │   │   ├── page.tsx    # Vista completa (server component)
│   │   │   │   ├── OrderActions.tsx  # Sidebar de acciones (client)
│   │   │   │   └── actions.ts  # Server actions de la orden
│   │   │   ├── nuevo/          # Crear orden manual
│   │   │   └── SkydropxBalanceBadge.tsx  # Badge de saldo en tiempo real
│   │   ├── tienda/             # Gestión de productos
│   │   │   └── configuracion/  # Stripe, Skydropx, categorías, tallas, embalajes
│   │   └── usuarios/           # Gestión de usuarios y roles
│   │
│   └── api/
│       ├── export-orders/      # GET → CSV de órdenes
│       ├── sepomex/            # GET → datos por CP (colonia, ciudad, estado)
│       └── stripe/
│           ├── create-intent/  # POST → crea PaymentIntent
│           └── webhook/        # POST → confirma pago, marca orden paid
│
├── components/
│   ├── ArtistTile.tsx          # Tarjeta de artista reutilizable
│   ├── BlockRenderer.tsx       # Renderiza bloques CMS por tipo
│   ├── CartDrawer.tsx          # Carrito lateral
│   ├── Countdown.tsx           # Temporizador en vivo
│   ├── Footer.tsx
│   ├── Hero.tsx                # Hero genérico
│   ├── LandingHero.tsx         # Hero específico del home
│   ├── Nav.tsx                 # Navegación global
│   ├── PlayBar.tsx             # Reproductor sticky
│   └── ZipSelector.tsx         # Selector de CP con autocompletado (Sepomex)
│
├── context/
│   ├── CartContext.tsx          # Carrito global (localStorage + state)
│   └── PlayerContext.tsx        # Reproductor de audio global
│
└── lib/
    ├── auth.server.ts           # requireAdmin, isAdmin, getLinkedArtist
    ├── blocks.ts                # Tipos de bloques CMS
    ├── data.ts                  # Datos estáticos legacy (deprecando)
    ├── emails.ts                # sendOrderConfirmation, sendAdminNewOrder
    ├── mapArtist.ts             # Mapper Supabase → tipo Artist
    ├── skydropx.ts              # Cliente completo de Skydropx Pro API
    ├── supabase.server.ts       # supabaseAdmin (service role) + supabase (anon)
    ├── supabase.ts              # Cliente Supabase para browser
    └── utils.ts                 # fmt(), folio(), escapeHtml()
```

---

## 5. Base de Datos (Supabase)

### Tablas Principales

```sql
-- Usuarios registrados (fans)
users (
  id uuid PK,
  clerk_user_id text UNIQUE,      -- ID de Clerk
  email text,
  name text,
  username text UNIQUE,           -- @handle
  role text DEFAULT 'fan',        -- 'fan' | 'admin'
  shipping_address jsonb,         -- dirección guardada para checkout
  created_at timestamptz
)

-- Artistas
artists (
  id uuid PK,
  slug text UNIQUE,               -- URL: /artista/[slug]
  name text,
  bio text,
  city text,
  genre text,
  image_url text,                 -- Supabase Storage
  bg_color text,                  -- color de fondo
  stripe_color text,              -- color acento
  fg_color text,                  -- color texto
  is_published boolean,
  sort_order int,
  page_sections jsonb,            -- [{key: 'canciones', visible: true}, ...]
  clerk_user_id text,             -- si el artista tiene login propio
  created_at timestamptz
)

-- Canciones por artista
tracks (
  id uuid PK,
  artist_id uuid FK→artists,
  title text,
  audio_url text,
  duration_sec int,
  sort_order int
)

-- Shows/eventos
shows (
  id uuid PK,
  artist_id uuid FK→artists,
  venue text,
  city text,
  date timestamptz,
  ticket_url text,
  price_mxn int,
  is_published boolean
)

-- Productos de merch
products (
  id uuid PK,
  name text,
  description text,
  price_mxn int,                  -- en CENTAVOS (ej. $350 = 35000)
  stock int,
  image_url text,
  artist_id uuid FK→artists,
  category_id uuid FK→store_categories,
  packaging_type_id uuid FK→packaging_types,
  weight_grams int,
  is_published boolean,
  sort_order int
)

-- Variantes de producto (tallas)
product_variants (
  id uuid PK,
  product_id uuid FK→products,
  size text,                      -- 'S', 'M', 'L', 'única'
  stock int,
  sort_order int
)

-- Órdenes de compra
orders (
  id uuid PK,
  folio_number int GENERATED,     -- auto-incremento, visible como GALLO-00001
  user_id uuid,                   -- Clerk user ID si estaba loggeado
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping_address jsonb,         -- {street, colonia, zip, city, state}
  shipping_carrier text,          -- 'FedEx', 'DHL', etc.
  shipping_rate_id text,          -- rate_id de Skydropx
  shipping_mxn int,               -- costo de envío en centavos
  subtotal_mxn int,
  total_mxn int,
  notes text,
  status text,                    -- 'pending'|'paid'|'shipped'|'delivered'|'refunded'|'failed'
  stripe_payment_id text,         -- PaymentIntent ID (pi_xxx)
  tracking_number text,           -- número de guía
  label_url text,                 -- URL del PDF de la guía
  skydropx_shipment_id text,      -- ID del shipment en Skydropx
  skydropx_cost_mxn int,          -- costo real cobrado por Skydropx (centavos)
  skydropx_events jsonb,          -- historial: [{type, at, tracking, carrier, cost_mxn, label_url}]
  is_test boolean DEFAULT false,  -- marca órdenes de prueba
  created_at timestamptz,
  updated_at timestamptz
)

-- Productos de cada orden
order_items (
  id uuid PK,
  order_id uuid FK→orders,
  product_id uuid FK→products,
  variant_id uuid FK→product_variants,
  size text,
  product_name text,              -- snapshot del nombre al momento de compra
  unit_price_mxn int,             -- snapshot del precio
  quantity int
)

-- Categorías de la tienda
store_categories (
  id uuid PK,
  name text,
  sort_order int
)

-- Tallas disponibles
store_sizes (
  id uuid PK,
  name text,                      -- 'S', 'M', 'XL', 'única'
  sort_order int
)

-- Tipos de embalaje (para Skydropx Carta Porte)
packaging_types (
  id uuid PK,
  name text,
  weight_grams int,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  skydropx_package_type text,     -- código SAT de embalaje (ej. '4G')
  consignment_note text,          -- código UNSPSC SAT (ej. '60121000')
  sort_order int
)

-- Configuración global de la tienda
store_settings (
  id int PK DEFAULT 1,            -- siempre 1 fila
  -- Stripe
  stripe_test_mode boolean,
  stripe_pk_test text,
  stripe_sk_test text,
  stripe_pk_live text,
  stripe_sk_live text,
  stripe_webhook_secret text,
  stripe_statement_desc text,
  stripe_markup_pct numeric,
  -- Skydropx
  skydropx_enabled boolean,
  skydropx_client_id text,
  skydropx_client_secret text,
  skydropx_markup_pct numeric,
  skydropx_allowed_carriers text[],
  -- Origen de envíos
  origin_name text,
  origin_street text,
  origin_zip text,
  origin_state text,
  origin_city text,
  origin_colonia text,
  origin_phone text,
  origin_email text,
  -- Tarifas manuales (cuando Skydropx está desactivado)
  shipping_local_mxn int,
  shipping_national_mxn int,
  shipping_intl_mxn int,
  shipping_free_threshold_mxn int,
  -- Políticas
  return_policy text,
  shipping_policy text
)

-- Bloques CMS para páginas públicas
page_blocks (
  id uuid PK,
  page text,                      -- 'home' | 'artistas' | 'tienda'
  type text,                      -- ver tipos en src/lib/blocks.ts
  data jsonb,                     -- contenido del bloque
  sort_order int,
  is_visible boolean
)

-- Tareas por artista (kanban)
artist_tasks (
  id uuid PK,
  artist_id uuid FK→artists,
  title text,
  status text,                    -- 'pendiente'|'en-progreso'|'listo'
  priority text,
  due_date date,
  notes text,
  created_at timestamptz
)

-- Calendario de contenido
content_calendar (
  id uuid PK,
  artist_id uuid FK→artists,
  title text,
  platform text,
  publish_date date,
  status text,
  notes text
)

-- Suscripciones de fans a artistas
artist_subscriptions (
  id uuid PK,
  artist_id uuid FK→artists,
  user_id uuid FK→users,
  email text,
  created_at timestamptz
)

-- Boletos de shows
tickets (
  id uuid PK,
  user_id uuid FK→users,
  show_id uuid FK→shows,
  quantity int,
  unit_price_mxn int,
  total_mxn int,
  folio_code text UNIQUE,
  status text,
  stripe_payment_id text,
  created_at timestamptz
)
```

### Funciones RPC Supabase

```sql
-- Decrementa el stock de una variante de forma atómica
decrement_stock(p_variant_id uuid, p_qty int)
```

---

## 6. Sistema de Auth

**Clerk v7** maneja toda la autenticación. El middleware está en `src/proxy.ts` (no `middleware.ts` — Next.js 16 usa este nombre).

### Roles y rutas

| Tipo de usuario | Acceso |
|---|---|
| Fan (anónimo) | `/`, `/tienda`, `/artistas`, `/artista/[slug]` |
| Fan (registrado) | + `/cuenta` (pedidos, boletos, perfil) |
| Artista | `/casa` → redirige a `/casa/artistas/[su-id]` |
| Admin | Todo `/casa/*` |

### Cómo se determina el rol

1. `ADMIN_USER_IDS` env var — lista de Clerk user IDs hardcodeada en Vercel
2. `users.role = 'admin'` en Supabase — gestionable desde `/casa/usuarios`

El middleware protege `/casa/*` (excepto `/casa/login`) redirigiendo a `/cuenta/login` si no hay sesión.

`requireAdmin()` en `src/lib/auth.server.ts` — se llama al inicio de cada server action del admin para garantizar acceso.

---

## 7. Flujo de Pago (Stripe)

```
Cliente → /carrito/checkout → CartDrawer → CheckoutMerch
  │
  ├── 1. POST /api/stripe/create-intent
  │      • Lee precios reales de DB (no confía en el cliente)
  │      • Aplica markup % de la configuración
  │      • Crea PaymentIntent en Stripe
  │      • Devuelve clientSecret
  │
  ├── 2. <Elements> de Stripe en el cliente
  │      • El usuario ingresa su tarjeta
  │      • stripe.confirmPayment()
  │
  └── 3. createOrder() — Server Action
         • Verifica PI contra API de Stripe (pi.status === 'succeeded')
         • Fetch precios reales de DB (segunda verificación)
         • Valida stock
         • INSERT en orders (status: 'paid' — ya verificado server-side)
         • INSERT en order_items
         • decrement_stock() RPC por variante
         • Guarda dirección en users si el cliente lo pide
         • sendOrderConfirmation() + sendAdminNewOrder() — fire-and-forget
         • Retorna orderId + folioNumber

WEBHOOK /api/stripe/webhook (fallback):
  • payment_intent.succeeded → orders.status = 'paid'
  • payment_intent.payment_failed → orders.status = 'failed'
  • charge.refunded → orders.status = 'refunded'
```

**Importante:** El order se crea como `'paid'` directamente porque ya se verificó el PI server-side. El webhook es solo un fallback por si la acción del servidor falla después del pago.

---

## 8. Flujo de Envío (Skydropx)

Skydropx Pro API (`api-pro.skydropx.com/api/v1`) con OAuth2 client_credentials.

### Checkout (cotización)

```
/carrito/checkout → ZipSelector (autocompletado por Sepomex)
  → getRatesForCheckout() server action
    • Cotiza con packaging_type del producto principal
    • Filtra por allowed_carriers
    • Aplica markup %
    • Devuelve ShippingRate[] al cliente
  → Cliente selecciona tarifa → rate_id guardado en order
```

### Admin — Crear guía

```
/casa/ordenes/[id] → OrderActions → "crear guía automáticamente"
  → createSkydropxShipment() server action
    1. buildOrderShipmentData() — valida todos los campos requeridos
    2. Re-cotiza con quotation fresco (las cotizaciones expiran)
    3. createShipment() en skydropx.ts
       • POST /quotations — para obtener quotation_id actualizado
       • POST /shipments — con packaging SAT + consignment_note SAT
       • Polling hasta 12×2.5s esperando tracking_number Y label_url
    4. Guarda en orders:
       • tracking_number, skydropx_shipment_id, label_url
       • skydropx_cost_mxn (centavos)
       • status = 'shipped'
    5. appendSkydropxEvent() — tipo 'created' en skydropx_events JSONB

Tipos de embalaje SAT requeridos (en packaging_types):
  • skydropx_package_type → código de embalaje (ej. '4G' = Caja de cartón)
  • consignment_note → código UNSPSC (ej. '60121000' = Juguetes y juegos)
```

### Admin — Consultar estado

```
"consultar estado" → fetchSkydropxShipmentStatus()
  • GET /shipments/{skydropx_shipment_id}
  • Extrae: workflow_status, carrier, cost, tracking, label_url
  • Si label_url encontrado y orders.label_url es null → guarda en DB
  • Actualiza UI cliente sin recargar página
```

### Admin — Cancelar guía

```
"cancelar guía de envío" → cancelSkydropxShipment(orderId, reason)
  • POST /shipments/{id}/cancellations — {reason, shipment_id}
  • Si Skydropx rechaza (422 para envíos en tránsito) → guarda skydropxError
  • appendSkydropxEvent() — tipo 'cancelled'
  • Limpia: tracking_number, skydropx_shipment_id, label_url, skydropx_cost_mxn
  • orders.status = 'paid'
  • UI muestra banner verde (éxito) o naranja (error parcial de Skydropx)
```

---

## 9. Sistema de Emails (Resend)

Dos emails transaccionales en `src/lib/emails.ts`:

| Función | Destinatario | Trigger |
|---|---|---|
| `sendOrderConfirmation()` | Cliente | Después de createOrder() |
| `sendAdminNewOrder()` | `ADMIN_EMAIL` env | Después de createOrder() |

Los emails son **fire-and-forget** (`Promise.allSettled`). Si fallan, el pedido ya está creado.

El email de confirmación incluye: folio, tabla de productos, totales, dirección, y número de guía (si existe).

---

## 10. Panel de Admin — Inventario de Funciones

### `/casa` — Dashboard
- Estadísticas: total de órdenes, ventas, artistas publicados
- Acceso rápido a módulos

### `/casa/artistas` — Lista de Artistas
- Grid con imagen, nombre, género, ciudad, estado publicado
- Crear artista nuevo con formulario completo

### `/casa/artistas/[id]` — Detalle de Artista
- Editar perfil (bio, género, ciudad, colores)
- Imagen: upload directo a Supabase Storage con crop
- Tracks: agregar/reordenar/eliminar canciones
- Shows: agregar/editar/eliminar fechas
- Secciones: reordenar y ocultar (canciones/fechas/merch)
- Tareas: kanban (pendiente/en-progreso/listo)
- Calendario de contenido
- Conectar a usuario Clerk (artistas tienen login propio)

### `/casa/tienda` — Productos
- Lista con imagen, nombre, precio, stock, estado
- Crear/editar producto: imagen + crop, variantes de talla, precio, descripción
- Publicar/despublicar

### `/casa/tienda/configuracion`
- **Stripe**: test/live keys, webhook secret, markup %
- **Skydropx**: activar/desactivar, credenciales, dirección de origen, markup %, paqueterías permitidas, test de cotización
- **Embalajes**: CRUD con dimensiones y códigos SAT
- **Categorías**: CRUD ordenable
- **Tallas**: CRUD ordenable
- **Tarifas manuales**: CDMX, nacional, internacional, gratis desde $X
- **Políticas**: texto libre de devoluciones y envíos

### `/casa/ordenes` — Lista de Órdenes
- Folio format: `GALLO-00001`
- Columnas: folio, cliente, productos, total, fecha, estado
- Filtro visual test vs real en stats
- Badge de saldo Skydropx en tiempo real (rojo si < $200 MXN)
- Exportar CSV → `/api/export-orders`
- Crear nueva orden manual

### `/casa/ordenes/[id]` — Detalle de Orden
Panel izquierdo (info):
- Productos con precios y tallas
- Subtotal, envío, total
- Cliente: nombre, correo, teléfono, notas
- Dirección de envío
- Historial Skydropx (eventos creada/cancelada con fechas)
- Stripe PI ID

Panel derecho (acciones — OrderActions.tsx):
- Cambiar estado (select + guardar)
- Número de guía (input + guardar)
- Botones PDF + Imprimir (cuando hay label_url)
- Rastreo: consultar estado en Skydropx (solo si hay skydropx_shipment_id)
- Crear guía Skydropx (checklist de readiness, SOS protección toggle, flujo con/sin rate_id)
- Editar datos del cliente y dirección
- Zona de peligro: cancelar guía (con razón requerida) + eliminar orden

### `/casa/ordenes/nuevo` — Nueva Orden Manual
- Búsqueda de cliente registrado (prellenado automático)
- Agregar productos con selección de talla y precio editable
- Dirección de envío opcional
- Estado inicial (pagado/pendiente/enviado)
- Notas internas
- Toggle de orden de prueba

### `/casa/editor` — Page Builder
- Vista iframe con responsive preview (móvil/tablet/desktop)
- Páginas: home, artistas, tienda
- Bloques: hero-mascot, cta-split, page-header, artist-grid, product-grid, text-block, image-block, banner-cta
- Mover, ocultar, editar, agregar bloques

### `/casa/media` — Biblioteca de Medios
- Upload de imágenes a Supabase Storage
- Vista en grid con miniaturas

### `/casa/usuarios` — Gestión de Usuarios
- Lista de usuarios registrados
- Cambiar rol (fan/admin)

### `/casa/clientes` — Clientes
- Lista de clientes con órdenes

---

## 11. Plataforma Pública — Inventario

### `/` — Landing
- Bloques CMS editables desde `/casa/editor`
- LandingHero con reproducción de audio

### `/tienda` — Tienda
- Grid de productos publicados
- Filtros por categoría
- Añadir al carrito (con selección de talla si aplica)

### `/tienda/[id]` — Detalle de Producto
- Galería, descripción, talla, cantidad
- Añadir al carrito

### `/carrito/checkout` — Checkout
- Formulario: nombre, email, teléfono, dirección (con autocompletado Sepomex)
- Cotización de envío Skydropx en tiempo real
- Pago con Stripe Elements (tarjeta)
- Dirección prellenada si usuario tiene una guardada

### `/artistas` — Catálogo
- Grid de artistas publicados

### `/artista/[slug]` — Detalle de Artista
- Secciones dinámicas (canciones, fechas, merch) según configuración del admin
- PlayBar (reproductor sticky)

### `/cuenta` — Cuenta del Cliente (requiere login)
Tabs:
- **Pedidos**: activos ("en camino") e historial — expandibles con detalle y guía de rastreo
- **Boletos**: próximos y pasados
- **Artistas**: seguir/dejar de seguir artistas (optimistic UI)
- **Perfil**: nombre de usuario (@handle), dirección de envío guardada

### `/cuenta/login` y `/cuenta/registro` — Auth de Fans
- Clerk SignIn/SignUp components estilizados

---

## 12. Componentes Reutilizables Clave

### ZipSelector (`src/components/ZipSelector.tsx`)
Selector de código postal con autocompletado usando API de Sepomex (`/api/sepomex`). Devuelve estado, municipio, colonia. Usado en checkout y config de Skydropx.

### BlockRenderer (`src/components/BlockRenderer.tsx`)
Renderiza cualquier bloque CMS por tipo. Lee `data` de la DB. Usado en páginas públicas editables.

### CartDrawer (`src/components/CartDrawer.tsx`)
Carrito lateral con gestión de items, cantidades, resumen y botón de ir a checkout.

### AdminShell (`src/app/casa/AdminShell.tsx`)
Layout del admin: header con breadcrumb + slot derecho, nav lateral. Todos los módulos admin lo usan.

---

## 13. Patrones de Código Importantes

### Server Actions con `'use server'`
Todas las mutaciones van por Server Actions. El patrón estándar:

```typescript
// actions.ts
'use server'
export async function myAction(data): Promise<{ error?: string }> {
  await requireAdmin()          // auth check
  // lógica
  revalidatePath('/ruta')       // invalida caché
  return {}
}

// Component ('use client')
const [pending, startTransition] = useTransition()
startTransition(async () => {
  const { error } = await myAction(data)
  // handle
})
```

### Precios siempre en centavos
`price_mxn = 35000` = $350.00 MXN. La función `fmt()` en `utils.ts` convierte de centavos a string formateado.

### supabaseAdmin vs supabase
- `supabaseAdmin` (service_role) → solo en Server Components y Server Actions. Bypasses RLS.
- `supabase` (anon key) → nunca con datos sensibles.

### Folio de órdenes
`GALLO-00001` = `folio_number` auto-incremento en Supabase + `padStart(5, '0')` + prefijo `GALLO-`.

### is_test en órdenes
Las órdenes marcadas como prueba (`is_test: true`) se filtran de las estadísticas en `/casa/ordenes` pero son visibles con badge amarillo "PRUEBA".

---

## 14. Deploy y Pipeline

```
git push origin main
  → GitHub (fwyvg5j9gf-coder/compadre-gallo)
  → Vercel auto-deploy (2-3 minutos)
  → compadregallo.vercel.app
```

- Rama activa: `main`
- No hay staging. Todo va directo a producción.
- Variables de entorno en Vercel: Settings → Environment Variables

---

## 15. Estado Actual del Proyecto

### ✅ Completado y funcionando

| Módulo | Estado |
|---|---|
| Auth admin (Clerk) | ✅ |
| Auth fans (Clerk) | ✅ |
| Roles (admin/artista/fan) | ✅ |
| Artistas: CRUD completo | ✅ |
| Tienda: productos + variantes | ✅ |
| Configuración de tienda | ✅ |
| Pago con Stripe | ✅ |
| Webhook Stripe | ✅ |
| Correos transaccionales (Resend) | ✅ |
| Órdenes: lista + folio + CSV export | ✅ |
| Órdenes: detalle completo | ✅ |
| Órdenes: crear manual | ✅ |
| Skydropx: cotización en checkout | ✅ |
| Skydropx: generar guía | ✅ |
| Skydropx: rastreo | ✅ |
| Skydropx: cancelar guía | ✅ |
| Skydropx: historial de eventos | ✅ |
| Skydropx: PDF + imprimir | ✅ |
| Saldo Skydropx en tiempo real | ✅ |
| Cuenta del cliente (/cuenta) | ✅ |
| Page builder CMS | ✅ |
| Media library | ✅ |
| Gestión de usuarios/roles | ✅ |

### ⚠️ Pendiente / Por hacer

| Tarea | Prioridad | Descripción |
|---|---|---|
| Dominio real | ALTA | Conectar `compadregallo.com` en Vercel + Clerk producción |
| Stripe webhook URL | ALTA | Configurar en Stripe Dashboard apuntando a la URL de producción |
| RESEND_API_KEY | ALTA | Sin esta env var, los correos no se envían |
| ADMIN_EMAIL | ALTA | Sin esta var, el admin no recibe notificaciones |
| Email de envío | MEDIA | Enviar guía de rastreo al cliente cuando se genera la guía |
| Boletos/Tickets | MEDIA | El flujo de compra de boletos de shows no está construido |
| /preventa | MEDIA | Página de drops tiene UI pero sin checkout de tickets |
| RLS en Supabase | MEDIA | Actualmente `supabaseAdmin` bypasses RLS — agregar políticas |
| Mobile admin | MEDIA | El admin no está optimizado para móvil |
| SEO dinámico | BAJA | Metadata por artista/producto |
| Analytics | BAJA | No hay tracking (Google Analytics, Plausible, etc.) |
| Artista portal | BAJA | Artistas pueden ver su perfil pero funcionalidad limitada |

---

### 🔒 Seguridad — Pendiente

| Tarea | Prioridad | Descripción |
|---|---|---|
| Verificar firma webhook Stripe | CRÍTICA | `src/app/api/stripe/webhook/route.ts` debe usar `stripe.webhooks.constructEvent(body, sig, secret)`. Sin esto, cualquiera puede POST a ese endpoint y marcar órdenes como pagadas. |
| Verificar firma webhook Clerk | CRÍTICA | `src/app/api/clerk/webhook/route.ts` debe validar el header `svix-signature` con el SDK de Svix. Sin esto, cualquiera puede falsificar eventos de Clerk. |
| Rate limiting en APIs públicas | ALTA | `/api/stripe/create-intent` y el endpoint de validación de descuentos no tienen throttle. Agregar con Vercel Edge Middleware o `upstash/ratelimit`. |
| Validación de schema con Zod | ALTA | Las server actions de checkout y admin solo hacen `.trim()` y `parseFloat()`. Inputs malformados (strings gigantes, números negativos) entran sin problema. Agregar Zod en los boundaries de entrada. |
| Security headers HTTP | MEDIA | Agregar en `next.config.js`: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`. Vercel no los agrega automáticamente. |
| Validación MIME en uploads | MEDIA | `getUploadUrl()` en `src/app/casa/tienda/actions.ts` genera URLs firmadas sin verificar que el archivo sea realmente una imagen. Agregar validación de `contentType` antes de firmar. |
| Auditar logs del servidor | BAJA | Revisar que ningún `console.log` o `console.error` exponga keys, tokens o datos de tarjetas en los logs de Vercel. |

> **Lo que YA está protegido:** precios re-fetcheados server-side, PI de Stripe verificado antes de crear orden, todas las mutaciones admin protegidas con `requireAdminUserId()`, `supabaseAdmin` nunca expuesto al cliente, sin SQL injection (SDK parametrizado), CSRF cubierto por Next.js server actions.

---

## 16. Cómo Replicar para un Nuevo Cliente

Esta plataforma es la plantilla base. Para crear una nueva instancia:

### Paso 1 — Infraestructura
1. Crear proyecto en Supabase (nuevo proyecto)
2. Ejecutar el schema de tablas (ver sección 5)
3. Crear el RPC `decrement_stock`
4. Crear proyecto en Clerk
5. Crear proyecto en Vercel conectado al repo (fork)

### Paso 2 — Branding (mínimo a cambiar)
```css
/* globals.css — cambiar paleta de 5 colores */
--brand-1: #003a87;  /* color 1 */
--brand-2: #00c4df;  /* color 2 */
--brand-3: #ffd49a;  /* color 3 */
--brand-4: #ff0100;  /* CTA principal */
--brand-5: #ffe200;  /* foco / selección */
```

Archivos a modificar:
- `src/app/globals.css` — paleta de colores
- `src/app/layout.tsx` — title, description, Open Graph
- `src/lib/emails.ts` — remitente, dominio, branding del email
- `src/app/(platform)/carrito/checkout/actions.ts` — prefijo de folio (GALLO- → NUEVO-)
- `public/` — favicon, iconos, OG image

### Paso 3 — Variables de Entorno
Copiar `.env.local.example` (crear si no existe) y llenar todas las vars de la sección 3.

### Paso 4 — Configuración inicial desde el admin
1. Ir a `/casa/tienda/configuracion`
2. Ingresar keys de Stripe (test primero)
3. Configurar Skydropx si aplica
4. Agregar embalajes con dimensiones y códigos SAT
5. Definir categorías y tallas
6. Configurar tarifas de envío manual como fallback

### Paso 5 — Contenido
1. Crear artistas desde `/casa/artistas`
2. Crear productos desde `/casa/tienda`
3. Editar páginas desde `/casa/editor`

---

## 17. Dependencias Externas y Cuentas Necesarias

| Servicio | Uso | URL |
|---|---|---|
| Supabase | DB + Storage | supabase.com |
| Clerk | Auth | clerk.com |
| Stripe | Pagos | stripe.com |
| Skydropx Pro | Envíos | pro.skydropx.com |
| Resend | Emails | resend.com |
| Vercel | Deploy | vercel.com |
| GitHub | Repo | github.com |

---

---

## 18. Bugs Conocidos y Cómo Resolverlos

### B1 ✅ shipping_carrier no se guardaba al crear guía Skydropx
Arreglado. Se añadió `shipping_carrier: result.carrier || null` al UPDATE en `createSkydropxShipment()`.

### B2 ✅ label_url null por polling insuficiente
Arreglado. El polling ahora espera tanto `trackingNumber` como `labelUrl` (hasta 12 intentos de 2.5s).

### B3 ✅ "consultar estado" no actualizaba label_url
Arreglado. `fetchSkydropxShipmentStatus()` ahora guarda `label_url` en DB si lo devuelve Skydropx y la orden no lo tenía.

### B4 ⚠️ Stock no verificado para productos sin variantId
**Archivo:** `src/app/(platform)/carrito/checkout/actions.ts` → `createOrder()`
La validación de stock hace `if (!item.variantId) continue` — si el producto no tiene variantes o `variantId` es null, no se valida el stock antes de crear la orden.
**Fix:** Agregar fallback que verifique `products.stock` cuando no hay `variantId`.

### B5 ⚠️ decrement_stock RPC puede no decrementar products.stock
**Verificar en Supabase:** `SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'decrement_stock';`
El RPC debe actualizar tanto `product_variants.stock` como `products.stock`.

### B6 ⚠️ No hay email cuando se genera la guía de rastreo
Al llamar `createSkydropxShipment()`, el cliente no recibe notificación de que su pedido fue enviado.
**Fix:** Crear `sendShipmentNotification()` en `src/lib/emails.ts` y llamarla en el server action después del UPDATE.

### B7 ⚠️ proxy.ts manda al admin no autenticado a /cuenta/login
**Archivo:** `src/proxy.ts` línea 11
Admin que visita `/casa` sin sesión es redirigido a `/cuenta/login` (login de fans) en vez de `/casa/login`.
**Fix:** Separar las rutas de redirect según si es `/casa` o `/cuenta`.

*Última actualización: 2026-05-18*
