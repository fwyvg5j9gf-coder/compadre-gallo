---
name: GALLO
description: Productora de música en crecimiento — vende boletos, expone artistas, cuida la relación fan antes de que los nombres sean virales.
north_star: Antes de Que Truene
register: brand

colors:
  # Brand palette — 5 colores = 5 letras del logo
  gallo_red: "#ff0100"       # L — CTA principal
  gallo_blue: "#003a87"      # G
  gallo_cyan: "#00c4df"      # A
  gallo_peach: "#ffd49a"     # L
  gallo_yellow: "#ffe200"    # O — foco y selección
  # Base
  black: "#0a0a0a"
  white: "#ffffff"
  # Ink neutrals (paper-tinted)
  ink_100: "#f6f5f1"
  ink_200: "#ecebe5"
  ink_300: "#d5d3cc"
  ink_400: "#9b9a93"
  ink_500: "#6b6a64"
  ink_700: "#2a2a28"
  ink_900: "#0a0a0a"
  # Semantic roles
  background: "#ffffff"
  surface: "#f6f5f1"
  on_background: "#0a0a0a"
  on_primary: "#ffffff"
  cta: "#ff0100"
  focus: "#ffe200"

typography:
  family_display: "'DM Sans', sans-serif"
  family_headline: "'Newake', sans-serif"
  family_body: "'Inter', sans-serif"
  family_mono: "ui-monospace, SFMono-Regular, Menlo, monospace"
  weight_black: 900
  weight_bold: 700
  weight_semibold: 600
  weight_regular: 400
  # Type scale — canonical from design-system/brand/tokens.css
  scale_display: "clamp(72px, 12vw, 220px)"
  scale_h1: "clamp(44px, 6vw, 88px)"
  scale_h2: "clamp(32px, 4vw, 56px)"
  scale_h3: "28px"
  scale_h4: "20px"
  scale_body: "16px"
  scale_small: "14px"
  scale_eyebrow: "12px"
  line_height_display: 0.9
  line_height_heading: 1.02
  line_height_body: 1.45
  tracking_tight: "-0.085em"
  tracking_snug: "-0.02em"
  tracking_base: "-0.005em"
  tracking_wide: "0.08em"
  max_line_length: "64ch"

radii:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "16px"
  pill: "999px"
  # Rule: 0 and 4px dominate. 8px for cards. 999px only for chips and avatars.

spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
  7: "48px"
  8: "64px"
  9: "96px"
  10: "128px"
  base_unit: 4

motion:
  easing_primary: "cubic-bezier(0.2, 0.8, 0.2, 1)"
  duration_fast: "120ms"
  duration_base: "220ms"
  duration_slow: "420ms"
  # Hover: opacity to 0.7 on links; buttons darken ~8%. No scale.
  # Reduced motion: honor prefers-reduced-motion for hero and LandingHero animations.

elevation:
  strategy: flat-by-default
  levels:
    0: "none"
    1: "0 1px 0 rgba(0,0,0,0.06)"
    2: "0 4px 16px -8px rgba(0,0,0,0.12)"
    3: "0 24px 48px -24px rgba(10,10,10,0.25)"
  # Shadows appear on interaction (hover), not by default.

assets:
  source_dir: "design-system/brand/"
  logos:
    primary: "design-system/brand/logos/wordmark-color.svg"
    mono: "design-system/brand/logos/wordmark-black.svg"
    heritage: "design-system/brand/logos/wordmark-og.png"
    signature: "design-system/brand/logos/compadregallo-signature.svg"
  mascot:
    vector: "design-system/brand/mascot/rooster.svg"
    on_transparent_black: "design-system/brand/mascot/rooster-black-on-transparent.png"
    on_transparent_white: "design-system/brand/mascot/rooster-white-on-transparent.png"
    on_yellow: "design-system/brand/mascot/rooster-on-yellow.png"
    on_red: "design-system/brand/mascot/rooster-on-red.png"
    on_black: "design-system/brand/mascot/rooster-on-black.png"
  mood_reference: "design-system/brand/source/brand-reference.jpg"
  font_newake: "design-system/brand/fonts/NewakeFont-Demo.otf"
---

## Overview

**North Star:** Antes de Que Truene — the interface embodies arrival before everyone else knows the name. Exclusive, curated, new, high-energy, full of talent. The fan doesn't browse a catalog; they witness an event.

GALLO is a music production company that sells tickets, surfaces its artists' catalog, and owns the fan relationship before the artists blow up. Every design decision reinforces one idea: you're inside.

**Color strategy:** Full palette. Five brand colors map to five logo letters and carry deliberate roles — not decoration. Red is action. Yellow is focus. Blue is identity. Cyan is discovery. Peach is warmth. No color is interchangeable.

**Theme:** Dark-capable, but default light. The surface is paper-warm white (`#ffffff` with ink neutrals tinted slightly warm). Dark contexts — scanner UI, event hero sections — use `gallo-black` (`#0a0a0a`). The choice is always motivated by the scene, never cosmetic.

---

## Colors

### Brand Palette

| Token | Value | Role |
|---|---|---|
| `gallo-red` | `#ff0100` | Primary CTA, urgency, action |
| `gallo-blue` | `#003a87` | Brand identity, deep presence |
| `gallo-cyan` | `#00c4df` | Discovery, links, highlight |
| `gallo-peach` | `#ffd49a` | Warmth, secondary emphasis |
| `gallo-yellow` | `#ffe200` | Focus ring, selection state, alert |

All five appear in the logo. They are not interchangeable. Use each color for its role, not for variety.

### Neutrals

Ink neutrals are warm-tinted toward paper, never pure gray. `ink-100` (#f6f5f1) is the background for inset surfaces. `ink-400` is secondary text minimum. Never use pure `#000` or `#fff` for text.

### Semantic Assignments

- **Background:** `#ffffff` (paper white)
- **Surface (inset):** `ink-100` (#f6f5f1)
- **Primary text:** `ink-900` (#0a0a0a)
- **Secondary text:** `ink-500` (#6b6a64)
- **CTA:** `gallo-red`
- **Focus / selection:** `gallo-yellow`
- **Brand accent:** `gallo-blue`

### Color Rule

One brand color per surface. Two maximum. The full five-color rainbow is reserved exclusively for the wordmark or a horizontal palette stripe — never as a gradient, never scattered across a layout.

### Artist Colors

Each artist has a unique `bg_color` and `stripe_color` defined in the data layer. These are load-bearing — they differentiate artists visually and cannot be overridden by design decisions.

---

## Typography

### Fonts

| Role | Family | Usage |
|---|---|---|
| Display | DM Sans 900 | Wordmark, section headlines, hero impact |
| Headline | Newake | Impact moments, artist names, ticket callouts |
| Body | Inter | All UI text, labels, descriptions |
| Mono | ui-monospace | Folio codes, technical strings |

**Hierarchy rule:** Always two variables — size AND weight. Never size alone. Minimum 1.25× ratio between adjacent steps.

### Type Scale

Canonical values from `design-system/brand/tokens.css`.

| Step | Size | Weight | Family | lh | Notes |
|---|---|---|---|---|---|
| `.display` | clamp(72px, 12vw, 220px) | 800 | DM Sans | 0.9 | Landing hero, wordmark-scale |
| `h1` | clamp(44px, 6vw, 88px) | 800 | DM Sans | 1.02 | Page hero |
| `h2` | clamp(32px, 4vw, 56px) | 700 | DM Sans | 1.02 | Section headings |
| `h3` | 28px | 700 | DM Sans | 1.15 | Sub-headings |
| `h4` | 20px | 600 | Inter | — | Card headings, callouts |
| body | 16px | 400 | Inter | 1.45 | Default copy |
| small | 14px | 400 | Inter | — | Secondary text, meta |
| `.eyebrow` | 12px | 700 | Inter | — | UPPERCASE labels: PREVENTA, AGOTADO, EN VIVO |
| `.preventa` | inherit | 800 | DM Sans | 1.0 | Uppercase announcement — `letter-spacing: -0.005em` |

**Tracking:** display/h1 use `--track-tight` (-0.085em). Headings use `--track-snug` (-0.02em). Body uses `--track-base` (-0.005em). Eyebrow uses `--track-wide` (0.08em).

**Case rule:** Body and navigation always lowercase. UPPERCASE only for short, loud announcements — status tags, PREVENTA, AGOTADO, EN VIVO.

**Line length:** Cap at 64ch on `p` elements. Display text ignores this.

---

## Elevation

Strategy: **flat by default**. Elements live on the same plane until interaction or float state demands separation.

| Level | Shadow | When |
|---|---|---|
| 0 | none | Default state for all elements |
| 1 — hairline | `0 1px 0 rgba(0,0,0,0.06)` | Dividers, table rows, bottom borders |
| 2 — card | `0 4px 16px -8px rgba(0,0,0,0.12)` | Cards on hover, dropdowns, tooltips |
| 3 — float | `0 24px 48px -24px rgba(0,0,0,0.16)` | Sticky nav, modals, drawers |

Nav uses frosted glass: `background: rgba(255,255,255,0.92); backdrop-filter: blur(12px)` — functional, not decorative.

**Focus state:** `outline: 2px solid var(--gallo-yellow); outline-offset: 2px` on all interactive elements. Never suppressed.

---

## Components

### Buttons

Five roles, each with a specific purpose. No mixing.

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| `.btn-primary` | `gallo-black` | white | — | Default action |
| `.btn-accent` | `gallo-red` | white | — | Primary CTA (comprar, confirmar) |
| `.btn-yellow` | `gallo-yellow` | `gallo-black` | — | Spotlight actions |
| `.btn-secondary` | white | `gallo-black` | 1.5px black | Secondary / ghost alternative |
| `.btn-ghost` | transparent | inherited | — | Tertiary, inline actions |

Radius: `var(--r-sm)` (4px) by default. Hover: darken ~8%. No scale transform.

### Artist Tile

Each tile uses the artist's `bg_color` as background and `stripe_color` as an accent bar. The tile is `r-md` (8px). Shadow appears on hover (level 2). Ratio variants: `1/1` (default), `4/3`, `3/4`.

### Chip / Tag

Pill shape (`r-pill`, 999px). Default: transparent background, `ink-700` text. Active / hover: `gallo-black` background, white text. Used for genre filters, status tags.

Status chips follow fixed color rules:
- `válido` — black background
- `usado` — `gallo-red` background
- `nuevo` — `gallo-cyan` background
- `respondido` — `gallo-cyan` background
- `resuelto` — `gallo-blue` background

### Nav

Height: 60px. Frosted glass background. Links lowercase, `body-sm` (14px), weight 500. Active route: underline or weight boost, never color change alone. Focus: `gallo-yellow` outline.

### Input / Form

Default: 1px `ink-300` border, `r-sm`. Focus: `gallo-black` border + `3px gallo-yellow box-shadow` ring. Placeholder: `ink-400`. Never suppress the focus ring.

### Folio Code

Monospace font, uppercase, `gallo-blue` color. Displayed large on ticket pages. Copy-to-clipboard affordance.

---

## Brand Assets

Source: `design-system/brand/` — canonical files, do not modify.

### Logos

Three marks, three contexts. Never mix them.

| File | Use |
|---|---|
| `wordmark-color.svg` | **Primary.** Digital, platform, UI, marketing. Default everywhere online. |
| `wordmark-black.svg` | Monochrome contexts — reversed on dark, black on light, single-color print. |
| `wordmark-og.png` | **Heritage.** Merch, posters, vinilos, tour materials. Script/cursive style. Never combine with wordmark-color on the same surface. |
| `compadregallo-signature.svg` | Italic URL signature for captions and footers. |

### Mascot — El Gallo

The rooster is a **stamp**, never a hero. Rules:
- 80–240px tall — ideal range. One per surface.
- Never recolor. Always flat (no shadows, no gradients, no fills added).
- Never stretch or distort the aspect ratio.
- Variants: black-on-transparent (light bg), white-on-transparent (dark bg), on-yellow, on-red, on-black.

```tsx
// Footer stamp — correct usage
<img src="/brand/mascot/rooster-black-on-transparent.png" alt="el gallo" height={120} />
```

### Photography Direction

Mood: golden hour LATAM, skate/concreto, iPhone-shot pero gradeado. Not polished studio photography. Not stock. Reference: `design-system/brand/source/brand-reference.jpg`.

---

## Do's and Don'ts

### Do

- Treat every artist launch and ticket drop as an editorial event, not a catalog item
- Use the 5 brand colors for their assigned roles — red for action, yellow for focus, blue for identity
- Keep the interface lowercase (except eyebrow labels)
- Let urgency come from the content (fecha, capacidad, agotado) — not from manufactured pressure copy
- Use Newake for high-impact artist/show callouts to create visual drama
- Apply artist `bg_color` and `stripe_color` faithfully — they are the identity
- Maintain WCAG AA contrast on all artist tile backgrounds (verify per-artist)
- Honor `prefers-reduced-motion` for hero and scroll animations

### Don't

- **No gradients.** Not background gradients, not gradient text (`background-clip: text` is banned). The five brand colors together as a gradient is the worst possible violation.
- **No rainbow scatter.** The full palette together only in the wordmark or a horizontal palette strip — never spread across a layout as decoration.
- **No glassmorphism** as decoration. The nav blur is the only allowed exception — it's functional.
- **No Ticketmaster/Boletómetro patterns.** No seat maps, queue pages, fee-reveal patterns, or anything that reads "corporate ticketing infrastructure."
- **No SaaS template.** No Inter-on-white card grids, no purple-to-blue accent, no rounded-square icon tiles above headings, no "Product" hero with centered text and a gradient CTA.
- **No Spotify/Apple Music platform aesthetic.** No infinite scroll album art grids, no genre pill menus that cover the entire viewport width.
- **No emoji in product UI.** Emoji in marketing copy only, never in forms, tables, labels, or navigation.
- **No scale transforms on hover.** Opacity to 0.7 for links; darken ~8% for buttons. Nothing bounces.
- **No nested cards.** A card inside a card is always the wrong answer.
- **No identical card grids.** If every card is the same size with the same structure, the design is a catalog, not an event.
