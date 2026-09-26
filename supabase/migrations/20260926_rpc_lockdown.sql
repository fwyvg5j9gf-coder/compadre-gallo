-- Cerrar las funciones RPC que la llave anon podía ejecutar.
--
-- Auditoría del 26 sep 2026: cuatro funciones SECURITY DEFINER (corren con
-- permisos de dueño, saltándose RLS) eran ejecutables por `anon` y
-- `authenticated` vía /rest/v1/rpc/<función>. Con la llave pública del sitio,
-- cualquiera podía:
--   adjust_stock            → fijar el inventario de cualquier variante
--   decrement_stock         → dejar productos en cero
--   increment_discount_uses → agotar códigos de descuento
--   log_sale_movement       → llenar de basura los movimientos de inventario
--
-- El código solo las llama con supabaseAdmin (service role), así que se les
-- quita el permiso a public/anon/authenticated y se le da explícito a
-- service_role. Además se fija search_path (advisor function_search_path_mutable).
-- set_updated_at es un trigger: solo se le fija el search_path.

revoke execute on function public.adjust_stock(uuid, integer, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
revoke execute on function public.increment_discount_uses(uuid) from public, anon, authenticated;
revoke execute on function public.log_sale_movement(uuid, uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.decrement_product_stock(uuid, integer) from public, anon, authenticated;

grant execute on function public.adjust_stock(uuid, integer, text, text, text, text) to service_role;
grant execute on function public.decrement_stock(uuid, integer) to service_role;
grant execute on function public.increment_discount_uses(uuid) to service_role;
grant execute on function public.log_sale_movement(uuid, uuid, integer, text) to service_role;
grant execute on function public.decrement_product_stock(uuid, integer) to service_role;

alter function public.adjust_stock(uuid, integer, text, text, text, text) set search_path = public;
alter function public.decrement_stock(uuid, integer) set search_path = public;
alter function public.increment_discount_uses(uuid) set search_path = public;
alter function public.log_sale_movement(uuid, uuid, integer, text) set search_path = public;
alter function public.decrement_product_stock(uuid, integer) set search_path = public;
alter function public.set_updated_at() set search_path = public;
