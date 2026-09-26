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

export type SpecKey = (typeof SPEC_FIELDS)[number]['key'] | 'horas_impresion'
export type Specs = Partial<Record<SpecKey, string>>

/** Lee las llaves spec_* de un formulario y regresa solo las que traen texto. */
export function specsFromForm(formData: FormData): Specs {
  const out: Specs = {}
  for (const f of SPEC_FIELDS) {
    const v = (formData.get(`spec_${f.key}`) as string | null)?.trim()
    if (v) out[f.key] = v.slice(0, 120)
  }
  const h = (formData.get('spec_horas_impresion') as string | null)?.trim()
  if (h && Number(h) > 0) out.horas_impresion = String(Math.round(Number(h)))
  return out
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
