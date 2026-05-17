export type BlockType =
  | 'hero-mascot'
  | 'cta-split'
  | 'page-header'
  | 'artist-grid'
  | 'product-grid'
  | 'text-block'
  | 'image-block'
  | 'banner-cta'

export type Block = {
  id: string
  page_key: string
  type: BlockType
  content: Record<string, string>
  draft_content: Record<string, string> | null
  spacing_bottom: number
  visible: boolean
  sort_order: number
}

export type NavLink     = { label: string; href: string }
export type NavSettings = { links: NavLink[] }
export type FooterLink  = { label: string; href: string }
export type FooterSettings = { email: string; copyright: string; links: FooterLink[] }

export const DEFAULT_NAV_LINKS: NavLink[] = [
  { label: 'artistas', href: '/artistas' },
  { label: 'preventa', href: '/preventa' },
  { label: 'tienda',   href: '/tienda'   },
  { label: 'cuenta',   href: '/cuenta'   },
]

export const DEFAULT_FOOTER: FooterSettings = {
  email:     'info@compadregallo.com',
  copyright: '© 2026 gallo records',
  links:     [{ label: 'prensa', href: '#' }, { label: 'privacidad', href: '#' }],
}

export const BLOCK_META: Record<BlockType, { label: string; description: string; pages: string[] }> = {
  'hero-mascot':  { label: 'Hero — mascota',       description: 'Pantalla completa con imagen central y tagline', pages: ['home'] },
  'cta-split':    { label: 'Dos paneles CTA',       description: 'Split a pantalla: izquierda + derecha con links', pages: ['home'] },
  'page-header':  { label: 'Encabezado de sección', description: 'Eyebrow + título grande',                        pages: ['*'] },
  'artist-grid':  { label: 'Grid de artistas',      description: 'Carga artistas publicados desde la DB',           pages: ['artistas'] },
  'product-grid': { label: 'Grid de productos',     description: 'Carga productos publicados desde la DB',          pages: ['tienda'] },
  'text-block':   { label: 'Texto libre',            description: 'Heading + cuerpo de texto',                      pages: ['*'] },
  'image-block':  { label: 'Imagen',                 description: 'Imagen de ancho completo con texto opcional',    pages: ['*'] },
  'banner-cta':   { label: 'Banner + botón',         description: 'Franja de color con texto y CTA',                pages: ['*'] },
}

export const BLOCK_FIELDS: Record<BlockType, { key: string; label: string; type: 'text' | 'textarea' | 'color' | 'image' | 'url' }[]> = {
  'hero-mascot': [
    { key: 'tagline',       label: 'Tagline',        type: 'text' },
    { key: 'mascot_image',  label: 'Imagen mascota', type: 'image' },
    { key: 'bg_color',      label: 'Color de fondo', type: 'color' },
  ],
  'cta-split': [
    { key: 'left_title',    label: 'Panel izq — título',    type: 'textarea' },
    { key: 'left_subtitle', label: 'Panel izq — subtítulo', type: 'text' },
    { key: 'left_bg',       label: 'Panel izq — color',     type: 'color' },
    { key: 'left_link',     label: 'Panel izq — link',      type: 'url' },
    { key: 'left_cta',      label: 'Panel izq — CTA',       type: 'text' },
    { key: 'right_title',   label: 'Panel der — título',    type: 'textarea' },
    { key: 'right_subtitle',label: 'Panel der — subtítulo', type: 'text' },
    { key: 'right_bg',      label: 'Panel der — color',     type: 'color' },
    { key: 'right_link',    label: 'Panel der — link',      type: 'url' },
    { key: 'right_cta',     label: 'Panel der — CTA',       type: 'text' },
  ],
  'page-header': [
    { key: 'eyebrow', label: 'Eyebrow',  type: 'text' },
    { key: 'title',   label: 'Título',   type: 'text' },
  ],
  'artist-grid':  [],
  'product-grid': [],
  'text-block': [
    { key: 'heading', label: 'Heading',   type: 'text' },
    { key: 'body',    label: 'Cuerpo',    type: 'textarea' },
  ],
  'image-block': [
    { key: 'image_url', label: 'Imagen',         type: 'image' },
    { key: 'caption',   label: 'Caption',        type: 'text' },
    { key: 'height',    label: 'Alto (px)',       type: 'text' },
  ],
  'banner-cta': [
    { key: 'text',       label: 'Texto',          type: 'text' },
    { key: 'bg_color',   label: 'Color fondo',    type: 'color' },
    { key: 'text_color', label: 'Color texto',    type: 'color' },
    { key: 'cta_label',  label: 'Botón — texto',  type: 'text' },
    { key: 'cta_link',   label: 'Botón — link',   type: 'url' },
  ],
}
