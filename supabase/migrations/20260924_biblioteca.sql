-- Biblioteca de diseño: los proyectos de lámparas del estudio (el agente de
-- diseño en ~/compadregallo-lamparas), divididos en idea → prototipo → final.
--
-- Un proyecto lleva los campos de la ficha de objeto del estudio
-- (plantillas/ficha-objeto.md de la skill gallo-diseno) para que el panel y el
-- estudio hablen igual. Sus archivos (bocetos, renders, fotos de prueba, STL,
-- 3MF, PDFs) viven en el bucket privado `biblioteca`: los archivos de
-- impresión no son públicos, se bajan con URLs firmadas.
--
-- Se sube desde el panel (/casa/biblioteca) o con scripts/biblioteca.mjs.

create table if not exists biblioteca_proyectos (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  nombre       text not null,
  etapa        text not null default 'idea' check (etapa in ('idea', 'prototipo', 'final')),
  frase        text,
  historia     text,
  forma        text,
  textura      text,
  cmf          text,
  luz          text,
  medidas      text,
  fabricacion  text,
  tiempo_min   integer check (tiempo_min is null or tiempo_min >= 0),
  gramos       integer check (gramos is null or gramos >= 0),
  costo_pesos  integer check (costo_pesos is null or costo_pesos >= 0),
  precio_pesos integer check (precio_pesos is null or precio_pesos >= 0),
  notas        text,
  portada      text,  -- path en el bucket de la imagen de portada
  product_id   uuid references products(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists biblioteca_proyectos_etapa_idx on biblioteca_proyectos (etapa, updated_at desc);

create table if not exists biblioteca_archivos (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid not null references biblioteca_proyectos(id) on delete cascade,
  nombre       text not null,
  tipo         text not null check (tipo in ('boceto', 'render', 'foto', 'stl', '3mf', 'documento', 'otro')),
  path         text not null unique,
  bytes        bigint,
  content_type text,
  sha256       text,  -- para no volver a subir lo que no cambió
  nota         text,
  created_at   timestamptz not null default now(),
  unique (proyecto_id, nombre)
);

create index if not exists biblioteca_archivos_proyecto_idx on biblioteca_archivos (proyecto_id, tipo);

-- Solo el service role, igual que el resto.
alter table biblioteca_proyectos enable row level security;
alter table biblioteca_archivos enable row level security;
drop policy if exists "service role only" on biblioteca_proyectos;
drop policy if exists "service role only" on biblioteca_archivos;
create policy "service role only" on biblioteca_proyectos for all using (false);
create policy "service role only" on biblioteca_archivos for all using (false);

-- Bucket privado. 50 MB por archivo: el STL más grande del estudio pesa 33 MB.
insert into storage.buckets (id, name, public, file_size_limit)
values ('biblioteca', 'biblioteca', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
