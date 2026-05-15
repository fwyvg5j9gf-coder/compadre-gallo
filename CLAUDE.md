# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server at localhost:3000
npm run build    # production build (run to verify no TS/compile errors)
npm run lint     # eslint
```

## Project

`compadregallo` — la plataforma web de GALLO, una productora de música en crecimiento. Vende boletos, expone artistas, y cuida el catálogo antes de que sea viral. Dominio: **compadregallo.com**.

## Stack

- **Next.js 16 (App Router)** — rutas en `src/app/`. Páginas con datos estáticos usan `generateStaticParams`. Componentes interactivos (hooks, eventos) llevan `'use client'`.
- **CSS global** — todo el sistema de diseño vive en `src/app/globals.css`. No hay Tailwind ni CSS Modules. Usa las variables CSS del design system directamente (`var(--gallo-red)`, `var(--space-5)`, etc.).
- **No hay base de datos** — los datos de ejemplo están en `src/lib/data.ts`. Artistas, shows y tracks se definen ahí.
- **Estado del reproductor** — `src/context/PlayerContext.tsx` es un React Context con `PlayerProvider`. Wrappea todo el app en el layout. Cualquier componente que necesite reproducir audio usa `usePlayer()`.

## Rutas

| Ruta | Archivo | Descripción |
|---|---|---|
| `/` | `src/app/page.tsx` | Discover — hero, artistas destacados, preventa |
| `/artistas` | `src/app/artistas/page.tsx` | Catálogo completo con filtros |
| `/preventa` | `src/app/preventa/page.tsx` | Drops activos con countdown |
| `/cuenta` | `src/app/cuenta/page.tsx` | Boletos, guardados, perfil |
| `/artista/[slug]` | `src/app/artista/[slug]/` | Detalle de artista — tracks, shows, compra |
| `/checkout/[slug]` | `src/app/checkout/[slug]/` | Flujo de compra con resumen y confirmación |

## Design system

El design system completo está en `~/Downloads/GALLO Design System/`. Los tokens ya están importados en `globals.css`.

**Paleta GALLO** (5 colores = 5 letras del logo):
- `--gallo-blue` `#003a87` — la `g`
- `--gallo-cyan` `#00c4df` — la `a`
- `--gallo-peach` `#ffd49a` — la `l`
- `--gallo-red` `#ff0100` — la `l`, color CTA principal
- `--gallo-yellow` `#ffe200` — la `o`, foco y selección

**Reglas clave:**
- Texto en **lowercase**. UPPERCASE solo para etiquetas de anuncio (`PREVENTA DISPONIBLE`, `AGOTADO`).
- Voz en **español mexicano**, segunda persona `tú`, tono de compadre.
- Sin gradientes, sin glassmorphism, sin emoji en UI de producto.
- Fuentes: `--font-display` (DM Sans 900) para wordmark y títulos, `--font-sans` (Inter) para UI, `--font-headline` (Newake) para momentos de impacto.
- Radii: `0` y `4px` dominan. `8px` para cards. `999px` solo para chips y avatares.
- Hover: opacidad a `0.7` en links, botones oscurecen ~8%. Sin scale.
- Focus: outline `2px var(--gallo-yellow)`.

## Componentes reutilizables

| Componente | Uso |
|---|---|
| `<ArtistTile artist ratio?>` | Tarjeta de artista. `ratio` = `'1/1'` (default), `'4/3'`, `'3/4'` |
| `<Countdown target>` | Temporizador en vivo. `target` es timestamp en ms |
| `<PlayBar>` | Reproductor sticky en footer. Se muestra solo cuando hay `nowPlaying` |
| `<Nav>` | Nav global sticky. Marca la ruta activa con `pathname` |

## Agregar un artista

Añade un objeto al array `ARTISTS` en `src/lib/data.ts` siguiendo el tipo `Artist`. El slug se convierte en ruta automáticamente vía `generateStaticParams`.
