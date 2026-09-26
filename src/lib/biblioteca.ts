// Biblioteca de diseño — seguro para importar desde Client Components
//
// Los proyectos del estudio de lámparas (~/compadregallo-lamparas) en tres
// etapas. Los campos de la ficha son los mismos de la plantilla del estudio
// (skill gallo-diseno, plantillas/ficha-objeto.md). scripts/biblioteca.mjs
// repite TIPO_POR_EXT: si cambias uno, cambia el otro.

export const ETAPAS = [
  { key: 'idea',      label: 'idea',      desc: 'bocetos y propuestas de las rondas' },
  { key: 'prototipo', label: 'prototipo', desc: 'con archivos de impresión, en prueba física' },
  { key: 'final',     label: 'final',     desc: 'aprobada: lista para producir y para la tienda' },
] as const

export type Etapa = (typeof ETAPAS)[number]['key']
export const isEtapa = (v: unknown): v is Etapa => ETAPAS.some(e => e.key === v)

export const TIPOS = ['boceto', 'render', 'foto', 'stl', '3mf', 'documento', 'otro'] as const
export type TipoArchivo = (typeof TIPOS)[number]
export const isTipo = (v: unknown): v is TipoArchivo => (TIPOS as readonly string[]).includes(v as string)

const TIPO_POR_EXT: Record<string, TipoArchivo> = {
  stl: 'stl', '3mf': '3mf', step: 'otro', stp: 'otro', obj: 'otro',
  pdf: 'documento', md: 'documento', txt: 'documento',
  png: 'render', jpg: 'foto', jpeg: 'foto', heic: 'foto', webp: 'render', gif: 'render', svg: 'boceto',
  mp4: 'foto', mov: 'foto',
}

const CONTENT_TYPE: Record<string, string> = {
  stl: 'model/stl', '3mf': 'model/3mf', obj: 'model/obj', step: 'model/step', stp: 'model/step',
  pdf: 'application/pdf', md: 'text/markdown', txt: 'text/plain',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', heic: 'image/heic', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', mov: 'video/quicktime',
}

const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

export const tipoFromName = (name: string): TipoArchivo => TIPO_POR_EXT[ext(name)] ?? 'otro'
export const contentTypeFor = (name: string) => CONTENT_TYPE[ext(name)] ?? 'application/octet-stream'
export const isImage = (name: string) => ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext(name))

/** "tulipán alto" → "tulipan-alto" */
export function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

/** Nombre de archivo seguro para la ruta del bucket, conservando la extensión. */
export function safeFileName(name: string): string {
  const e = ext(name)
  const base = slugify(name.replace(/\.[^.]+$/, '')) || 'archivo'
  return e ? `${base}.${e}` : base
}

// Campos de la ficha, en el orden de la plantilla del estudio.
export const FICHA = [
  { key: 'frase',       label: 'la frase',     hint: 'qué es, en una línea' },
  { key: 'historia',    label: 'historia',     hint: 'la referencia: mar, México, mid-century', long: true },
  { key: 'forma',       label: 'forma',        hint: 'piedra, tulipán, perla…' },
  { key: 'textura',     label: 'textura',      hint: 'cerebro, estría, azulejo…' },
  { key: 'cmf',         label: 'CMF',          hint: 'color, materiales, acabado, firma metálica' },
  { key: 'luz',         label: 'luz',          hint: 'fuente, dónde brilla, temperatura' },
  { key: 'medidas',     label: 'medidas',      hint: 'alto × ancho, en mm' },
  { key: 'fabricacion', label: 'fabricación',  hint: 'piezas, modo vase o normal, uniones', long: true },
] as const

export type FichaKey = (typeof FICHA)[number]['key']

export type Proyecto = {
  id: string
  slug: string
  nombre: string
  etapa: Etapa
  frase: string | null
  historia: string | null
  forma: string | null
  textura: string | null
  cmf: string | null
  luz: string | null
  medidas: string | null
  fabricacion: string | null
  tiempo_min: number | null
  gramos: number | null
  costo_pesos: number | null
  precio_pesos: number | null
  notas: string | null
  portada: string | null
  product_id: string | null
  created_at: string
  updated_at: string
}

export type Archivo = {
  id: string
  proyecto_id: string
  nombre: string
  tipo: TipoArchivo
  path: string
  bytes: number | null
  content_type: string | null
  nota: string | null
  created_at: string
}

export function fmtBytes(n: number | null | undefined): string {
  if (!n) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1e3))} KB`
}

export function fmtMinutos(min: number | null | undefined): string | null {
  if (!min) return null
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}
