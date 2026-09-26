-- Envíos: de Skydropx a Envia.com (como gangstafairy, a la medida de aquí).
--
-- Igual que Stripe, las llaves de Envia viven en store_secrets (prueba y
-- producción) y se editan en /casa/tienda/configuracion. Las columnas de
-- Skydropx se quedan sin usar: no se borra historia.
--
-- En pedidos se agregan columnas genéricas (proveedor, servicio, costo real,
-- bitácora de la guía) en vez de más columnas con nombre de proveedor.
-- Al momento de la migración hay 0 pedidos, así que no hay guías vivas de
-- Skydropx que proteger.

alter table store_secrets
  add column if not exists envia_api_key_test text,
  add column if not exists envia_api_key_live text;

alter table store_settings
  add column if not exists envia_enabled         boolean not null default false,
  add column if not exists envia_test_mode       boolean not null default true,
  add column if not exists envia_carriers        text[]  not null default '{dhl}',
  add column if not exists envia_markup_pct      numeric not null default 0,
  add column if not exists origin_number         text,
  add column if not exists envia_last_balance    numeric,
  add column if not exists envia_last_balance_at timestamptz;

alter table orders
  add column if not exists shipping_provider  text,
  add column if not exists shipping_service   text,
  add column if not exists shipment_cost_mxn  integer,
  add column if not exists shipment_events    jsonb not null default '[]'::jsonb;

-- Se heredan la configuración de Skydropx: mismo recargo y mismas paqueterías.
update store_settings set
  envia_markup_pct = coalesce(skydropx_markup_pct, 0),
  envia_carriers   = coalesce(
    (select array_agg(lower(c)) from unnest(skydropx_allowed_carriers) c where c <> ''),
    '{dhl}'
  );

-- Envia pide el número exterior aparte: "Calle Puebla 5912" → calle + 5912.
update store_settings set
  origin_number = substring(origin_street from '(\d+[A-Za-z]?)\s*$'),
  origin_street = trim(regexp_replace(origin_street, '[\s,]+\d+[A-Za-z]?\s*$', ''))
where origin_number is null and origin_street ~ '\d+[A-Za-z]?\s*$';

-- Skydropx se apaga. Envia queda apagado hasta que se ponga su llave; mientras
-- tanto el checkout cobra la tarifa fija de configuración.
update store_settings set skydropx_enabled = false;
