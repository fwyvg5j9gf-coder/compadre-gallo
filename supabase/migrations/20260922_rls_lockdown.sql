-- Cerrar con RLS las dos tablas que hoy lee cualquiera.
--
-- Probado el 22 sep 2026 contra el proyecto en vivo con la llave `anon` (la
-- pública, la que va en el bundle del navegador y que cualquier visitante
-- puede sacar del sitio):
--
--   store_secrets     0 filas  ← RLS ya la protege (la llave live de Stripe NO está expuesta)
--   orders            0 filas  ← protegida
--   users             0 filas  ← protegida
--   discount_codes    0 filas  ← protegida
--   support_messages  3 filas  ← EXPUESTA: correos de clientes, con nombre,
--                                 dirección de correo, asunto y cuerpo completo
--   store_settings    1 fila   ← EXPUESTA: domicilio y teléfono del negocio,
--                                 y los márgenes (skydropx_markup_pct,
--                                 stripe_markup_pct)
--
-- Cerrarlas no rompe nada: `src/lib/supabase.ts` solo exporta tipos, no hay
-- cliente de Supabase en el navegador. Todo el acceso a datos pasa por
-- `supabaseAdmin` (service role) desde el servidor, y el service role ignora
-- RLS por diseño.
--
-- Mismo patrón que ya usan orders y order_items aquí, y que gangstafairy usa
-- en todas sus tablas de soporte.

alter table support_messages enable row level security;
alter table store_settings enable row level security;

drop policy if exists "service role only" on support_messages;
drop policy if exists "service role only" on store_settings;

-- store_settings ya tenía RLS encendido, pero con esta política permisiva
-- `using (true)` para todos los roles. Las permisivas se suman con OR, así
-- que sin quitarla el `using (false)` de abajo no cerraría nada.
drop policy if exists "public read store_settings" on store_settings;

-- `using (false)` no le niega nada al service role: esa llave salta RLS.
-- Lo que hace es dejar sin acceso a anon y a los usuarios autenticados, que
-- es justo lo que se busca.
create policy "service role only" on support_messages for all using (false);
create policy "service role only" on store_settings for all using (false);

-- Verificación después de correrla — las dos deben devolver 0 filas:
--   curl "$URL/rest/v1/support_messages?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--   curl "$URL/rest/v1/store_settings?select=*"   -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
