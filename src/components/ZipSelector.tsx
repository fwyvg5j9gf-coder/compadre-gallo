'use client'

import { useState } from 'react'

export type ZipInfo = { zip: string; colonia: string; municipio: string; estado: string }

type Colonia = { colonia: string; municipio: string; estado: string; ciudad: string }

interface ZipSelectorProps {
  label?: string
  dark?: boolean
  // Modo form (hidden inputs)
  nameZip?: string
  nameState?: string
  nameCity?: string
  nameColonia?: string
  // Modo React state
  onSelect?: (info: ZipInfo | null) => void
  // Valores iniciales
  defaultZip?: string
  defaultState?: string
  defaultCity?: string
  defaultColonia?: string
}

export default function ZipSelector({
  label = 'CP',
  dark = false,
  nameZip, nameState, nameCity, nameColonia,
  onSelect,
  defaultZip = '', defaultState = '', defaultCity = '', defaultColonia = '',
}: ZipSelectorProps) {
  const [cp, setCp] = useState(defaultZip)
  const [colonias, setColonias] = useState<Colonia[]>([])
  const [selected, setSelected] = useState<Colonia | null>(
    defaultState ? { colonia: defaultColonia, municipio: defaultCity, estado: defaultState, ciudad: defaultCity } : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function buscar() {
    if (!/^\d{5}$/.test(cp)) { setError('debe ser un CP de 5 dígitos'); return }
    setLoading(true); setError(null); setColonias([]); select(null)
    try {
      const res = await fetch(`/api/sepomex?cp=${cp}`)
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error ?? 'CP no encontrado'); return }
      setColonias(json.colonias)
      if (json.colonias.length >= 1) select(json.colonias[0])
    } catch {
      setError('error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function select(col: Colonia | null) {
    setSelected(col)
    if (onSelect) onSelect(col ? { zip: cp, colonia: col.colonia, municipio: col.municipio, estado: col.estado } : null)
  }

  const inp = dark
    ? {
        padding: '9px 12px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4,
        fontSize: 14, color: '#f0efe9', background: '#0c0c0a', outline: 'none',
        fontFamily: 'var(--font-sans)', boxSizing: 'border-box' as const, width: '100%',
        transition: 'border-color 140ms',
      }
    : {
        padding: '8px 10px', border: '1px solid #d4d3cd', borderRadius: 4,
        fontSize: 14, color: '#0a0a0a', background: '#fff', outline: 'none',
        fontFamily: 'var(--font-sans)', boxSizing: 'border-box' as const, width: '100%',
      }

  const lbl = dark
    ? { display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 11, fontWeight: 700, color: '#6b6a64', letterSpacing: '0.06em', textTransform: 'uppercase' as const }
    : { display: 'flex', flexDirection: 'column' as const, gap: 4, fontSize: 12, fontWeight: 600, color: '#6b6a64', letterSpacing: '0.03em' }

  const confirmColor = dark ? '#22a25a' : '#1a6b35'
  const errorColor = '#ff0100'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={lbl}>
        {label}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={cp}
            onChange={e => { setCp(e.target.value); setColonias([]); select(null) }}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscar())}
            placeholder="00000" maxLength={5}
            className={dark ? 'adm-inp' : undefined}
            style={dark ? { width: 100 } : { ...inp, width: 100 }}
          />
          <button type="button" onClick={buscar} disabled={loading} style={{
            background: dark ? 'rgba(255,255,255,0.08)' : '#0a0a0a',
            color: dark ? '#f0efe9' : '#fff',
            border: dark ? '1px solid rgba(255,255,255,0.1)' : 'none',
            borderRadius: 4, padding: '8px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            opacity: loading ? 0.5 : 1, transition: 'opacity 150ms', whiteSpace: 'nowrap' as const,
          }}>
            {loading ? 'buscando...' : 'buscar'}
          </button>
        </div>
      </label>

      {error && <p style={{ fontSize: 12, color: errorColor, margin: 0 }}>{error}</p>}

      {colonias.length > 1 && (
        <label style={lbl}>
          colonia
          <select
            value={selected?.colonia ?? ''}
            onChange={e => {
              const col = colonias.find(c => c.colonia === e.target.value) ?? null
              select(col)
            }}
            className={dark ? 'adm-inp' : undefined}
            style={dark ? undefined : inp}
          >
            <option value="">— elige una colonia —</option>
            {colonias.map((c, i) => <option key={i} value={c.colonia}>{c.colonia}</option>)}
          </select>
        </label>
      )}

      {selected && (
        <p style={{ fontSize: 12, color: confirmColor, margin: 0 }}>
          ✓ {selected.colonia}, {selected.municipio}, {selected.estado}
        </p>
      )}

      {/* Hidden inputs para modo form */}
      {nameZip && <input type="hidden" name={nameZip} value={cp} />}
      {nameState && <input type="hidden" name={nameState} value={selected?.estado ?? defaultState} />}
      {nameCity && <input type="hidden" name={nameCity} value={selected?.municipio ?? defaultCity} />}
      {nameColonia && <input type="hidden" name={nameColonia} value={selected?.colonia ?? defaultColonia} />}
    </div>
  )
}
