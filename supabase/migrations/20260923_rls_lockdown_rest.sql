-- Cerrar con RLS las seis tablas que quedaban abiertas.
--
-- Probado el 23 sep 2026 contra el proyecto en vivo con la llave `anon`:
--
--   email_logs           14 filas  ← destinatarios y asuntos de correos enviados
--   audit_log            15 filas  ← historial de acciones del panel
--   discount_codes        0 filas  ← vacía hoy, pero sin RLS cualquiera podía
--                                    crear o leer cupones
--   site_settings         3 filas
--   page_blocks           6 filas  ← contenido de la página, incluido el borrador
--   inventory_movements   2 filas
--
-- Sin RLS no solo se podían leer: la llave anon también podía insertar,
-- editar y borrar filas.
--
-- Cerrarlas no rompe nada: todas se consultan con `supabaseAdmin` (service
-- role) desde el servidor, y el service role ignora RLS. Ninguna tenía
-- políticas previas, así que `using (false)` basta.
--
-- Mismo patrón que 20260922_rls_lockdown.sql.

alter table email_logs          enable row level security;
alter table audit_log           enable row level security;
alter table discount_codes      enable row level security;
alter table site_settings       enable row level security;
alter table page_blocks         enable row level security;
alter table inventory_movements enable row level security;

drop policy if exists "service role only" on email_logs;
drop policy if exists "service role only" on audit_log;
drop policy if exists "service role only" on discount_codes;
drop policy if exists "service role only" on site_settings;
drop policy if exists "service role only" on page_blocks;
drop policy if exists "service role only" on inventory_movements;

create policy "service role only" on email_logs          for all using (false);
create policy "service role only" on audit_log           for all using (false);
create policy "service role only" on discount_codes      for all using (false);
create policy "service role only" on site_settings       for all using (false);
create policy "service role only" on page_blocks         for all using (false);
create policy "service role only" on inventory_movements for all using (false);

-- Verificación después de correrla — las seis deben devolver 0 filas:
--   curl "$URL/rest/v1/email_logs?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
