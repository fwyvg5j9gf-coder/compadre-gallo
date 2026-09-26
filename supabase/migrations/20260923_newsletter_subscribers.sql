-- Lista de correos: "10% en tu primera compra a cambio de tu correo".
-- Aprendido de Crème Atelier; es también la lista para anunciar lanzamientos.
--
-- Cada suscriptor recibe un código de descuento propio de un solo uso
-- (discount_codes, max_uses = 1). `unsubscribe_token` va en la liga de "ya no
-- quiero correos" de cada envío.

create table if not exists newsletter_subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  source            text not null default 'tienda',
  discount_code_id  uuid references discount_codes(id) on delete set null,
  unsubscribe_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  unsubscribed_at   timestamptz,
  created_at        timestamptz not null default now()
);

-- Igual que el resto: solo el service role, nunca la llave anon.
alter table newsletter_subscribers enable row level security;
drop policy if exists "service role only" on newsletter_subscribers;
create policy "service role only" on newsletter_subscribers for all using (false);
