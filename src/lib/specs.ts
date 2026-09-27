// Ficha técnica de producto — seguro para importar desde Client Components
//
// Se guarda en products.specs (jsonb). Las llaves son fijas para que el panel
// y la página de producto hablen de lo mismo. Una llave vacía no se guarda y
// no se muestra.

export const SPEC_FIELDS = [
  { key: 'medidas',  label: 'medidas',  placeholder: 'alto 34 cm · ancho 30 cm' },
  { key: 'foco',     label: 'foco',     placeholder: 'LED E27 regulable, incluido' },
  { key: 'cable',    label: 'cable',    placeholder: 'textil, 2.5 m, con apagador' },
  { key: 'material', label: 'material', placeholder: 'PLA impreso en 3D' },
  { key: 'voltaje',  label: 'voltaje',  placeholder: '127 V' },
] as const

// minutos_impresion: cuánto tarda en hacerse una. horas_impresion es el campo
// viejo (en horas); se sigue leyendo por si algún producto lo tiene.
export type SpecKey = (typeof SPEC_FIELDS)[number]['key'] | 'minutos_impresion' | 'horas_impresion'
export type Specs = Partial<Record<SpecKey, string>>

/** Lee las llaves spec_* de un formulario y regresa solo las que traen texto. */
export function specsFromForm(formData: FormData): Specs {
  const out: Specs = {}
  for (const f of SPEC_FIELDS) {
    const v = (formData.get(`spec_${f.key}`) as string | null)?.trim()
    if (v) out[f.key] = v.slice(0, 120)
  }
  const m = (formData.get('spec_minutos_impresion') as string | null)?.trim()
  if (m && Number(m) > 0) out.minutos_impresion = String(Math.round(Number(m)))
  return out
}

/** Minutos que tarda en hacerse una pieza (acepta el campo viejo en horas). */
export function makingMinutes(specs: Specs | null | undefined): number | null {
  const m = Number(specs?.minutos_impresion)
  if (m > 0) return Math.round(m)
  const h = Number(specs?.horas_impresion)
  return h > 0 ? Math.round(h * 60) : null
}

/** Renglones listos para pintar: [etiqueta, valor], en el orden de SPEC_FIELDS. */
export function specRows(specs: Specs | null | undefined, weightGrams?: number | null): [string, string][] {
  const rows: [string, string][] = []
  for (const f of SPEC_FIELDS) {
    const v = specs?.[f.key]
    if (v) rows.push([f.label, v])
    if (f.key === 'medidas' && weightGrams) {
      rows.push(['peso', weightGrams >= 1000 ? `${(weightGrams / 1000).toLocaleString('es-MX')} kg` : `${weightGrams} g`])
    }
  }
  return rows
}
