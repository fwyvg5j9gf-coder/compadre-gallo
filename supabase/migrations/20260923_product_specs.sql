-- Ficha técnica por producto (medidas, foco, cable, material, voltaje, horas
-- de impresión). Aprendido de Crème Atelier: en lámparas la ficha completa es
-- lo que quita el miedo de comprar por internet.
--
-- jsonb con llaves fijas definidas en src/lib/specs.ts. Las vacías no se
-- guardan y no se muestran. Aditiva: no toca datos existentes.

alter table products add column if not exists specs jsonb not null default '{}'::jsonb;
