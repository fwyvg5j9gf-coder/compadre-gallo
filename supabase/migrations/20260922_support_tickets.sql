-- Buzón de soporte con hilo.
--
-- Hasta ahora cada correo entrante era una fila suelta en `support_messages`,
-- con una sola respuesta guardada como `reply_resend_id`. Si el cliente volvía
-- a escribir, salía como un mensaje sin relación con el anterior: no había
-- conversación, no había estado, y las respuestas del equipo no se guardaban
-- como mensajes.
--
-- Esta migración es ADITIVA: `support_messages` se queda intacta y se copia a
-- las tablas nuevas. Si algo sale mal, los correos siguen ahí.
-- Estructura tomada de soporte_tickets/soporte_mensajes de gangstafairy.

create table if not exists support_tickets (
  id                  uuid primary key default gen_random_uuid(),
  customer_email      text not null,
  customer_name       text,
  subject             text not null default '(sin asunto)',
  status              text not null default 'open'
                        check (status in ('open', 'pending', 'resolved', 'closed')),
  -- A qué buzón llegó. Hoy solo hola@, pero ventas@ y prensa@ llegarán y un
  -- mismo cliente puede escribirle a dos por separado.
  inbox               text not null default 'hola',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_activity_at    timestamptz not null default now()
);

create index if not exists support_tickets_customer_email_idx on support_tickets (customer_email);
create index if not exists support_tickets_status_idx on support_tickets (status);
create index if not exists support_tickets_last_activity_idx on support_tickets (last_activity_at desc);

create table if not exists support_ticket_messages (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references support_tickets(id) on delete cascade,
  direction       text not null check (direction in ('inbound', 'outbound')),
  sender_email    text not null,
  sender_name     text,
  subject         text,
  body_html       text,
  body_text       text,
  resend_email_id text,
  message_id      text,
  created_at      timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_id_idx
  on support_ticket_messages (ticket_id, created_at);

-- Evita que un reintento del webhook de Resend duplique el mismo correo.
create unique index if not exists support_ticket_messages_resend_email_id_key
  on support_ticket_messages (resend_email_id) where resend_email_id is not null;

-- ── Backfill desde support_messages ─────────────────────────────────────────
-- Un ticket por remitente, con el asunto de su primer correo. Los correos ya
-- respondidos entran como 'resolved' para no llenar la bandeja de pendientes
-- que en realidad ya se atendieron.
insert into support_tickets (customer_email, customer_name, subject, status, created_at, updated_at, last_activity_at)
select
  lower(m.from_email),
  (array_agg(m.from_name order by m.created_at))[1],
  coalesce((array_agg(m.subject order by m.created_at))[1], '(sin asunto)'),
  case when bool_and(m.status = 'resolved' or m.replied_at is not null) then 'resolved' else 'open' end,
  min(m.created_at),
  max(m.created_at),
  max(m.created_at)
from support_messages m
group by lower(m.from_email)
on conflict do nothing;

insert into support_ticket_messages (ticket_id, direction, sender_email, sender_name, subject, body_html, body_text, resend_email_id, message_id, created_at)
select t.id, 'inbound', lower(m.from_email), m.from_name, m.subject, m.body_html, m.body_text, m.resend_email_id, m.message_id, m.created_at
from support_messages m
join support_tickets t on t.customer_email = lower(m.from_email)
on conflict do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Igual que orders y order_items: solo el service role las toca; nunca se leen
-- desde el navegador con la llave anon.
alter table support_tickets enable row level security;
alter table support_ticket_messages enable row level security;

drop policy if exists "service role only" on support_tickets;
drop policy if exists "service role only" on support_ticket_messages;
create policy "service role only" on support_tickets for all using (false);
create policy "service role only" on support_ticket_messages for all using (false);
