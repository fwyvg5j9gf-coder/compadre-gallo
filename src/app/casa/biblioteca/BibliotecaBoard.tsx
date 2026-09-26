'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ETAPAS, type Etapa, type TipoArchivo } from '@/lib/biblioteca'
import { createProyecto, type ProyectoCard } from './actions'

const B = '#e8e7e1'
const M = '#6b6a64'
const S = '#9a9994'

const ETAPA_COLOR: Record<Etapa, string> = {
  idea: '#00c4df',
  prototipo: '#ffd49a',
  final: '#ff0100',
}

const CONTEO_LABEL: [TipoArchivo, string][] = [
  ['boceto', 'bocetos'], ['render', 'renders'], ['foto', 'fotos'],
  ['stl', 'stl'], ['3mf', '3mf'], ['documento', 'docs'],
]

function fmtFecha(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(m) - 1]
  return `${Number(d)} ${mes} ${y}`
}

function Card({ p }: { p: ProyectoCard }) {
  const chips = CONTEO_LABEL.filter(([t]) => p.conteo[t]).map(([t, l]) => `${p.conteo[t]} ${l}`)
  return (
    <Link href={`/casa/biblioteca/${p.slug}`} className="bib-card" style={{
      display: 'block', background: '#fff', border: `1px solid ${B}`, borderRadius: 8,
      overflow: 'hidden', textDecoration: 'none', color: '#0a0a0a',
    }}>
      <div style={{ aspectRatio: '4 / 3', background: '#f6f5f1', display: 'grid', placeItems: 'center' }}>
        {p.portadaUrl
          ? <img src={p.portadaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <span style={{ fontSize: 12, color: S }}>sin imagen</span>}
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          {p.nombre}
        </div>
        {p.frase && (
          <p style={{ fontSize: 13, color: M, margin: '4px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {p.frase}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
          {chips.map(c => (
            <span key={c} style={{ fontSize: 11, fontWeight: 600, color: M, background: '#f6f5f1', borderRadius: 999, padding: '2px 8px' }}>{c}</span>
          ))}
          <span style={{ fontSize: 11, color: S, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{fmtFecha(p.updated_at)}</span>
        </div>
      </div>
    </Link>
  )
}

function NuevoProyecto() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [etapa, setEtapa] = useState<Etapa>('idea')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{
        height: 38, padding: '0 16px', borderRadius: 4, border: 'none',
        background: '#0a0a0a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      }}>
        + nuevo proyecto
      </button>
    )
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        setError(null)
        start(async () => {
          try { router.push(`/casa/biblioteca/${await createProyecto(nombre, etapa)}`) }
          catch (err) { setError(err instanceof Error ? err.message : 'no se pudo crear') }
        })
      }}
      style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
    >
      <input autoFocus required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="nombre (ej. tulipán)"
        style={{ height: 38, padding: '0 12px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 14, minWidth: 200 }} />
      <select value={etapa} onChange={e => setEtapa(e.target.value as Etapa)}
        style={{ height: 38, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 14, background: '#fff' }}>
        {ETAPAS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
      </select>
      <button type="submit" disabled={pending} style={{
        height: 38, padding: '0 16px', borderRadius: 4, border: 'none',
        background: '#0a0a0a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      }}>{pending ? 'creando…' : 'crear'}</button>
      <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: M, fontSize: 13, cursor: 'pointer' }}>cancelar</button>
      {error && <span style={{ fontSize: 13, color: '#cc0000', width: '100%' }}>{error}</span>}
    </form>
  )
}

export default function BibliotecaBoard({ proyectos }: { proyectos: ProyectoCard[] }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const visibles = needle
    ? proyectos.filter(p => [p.nombre, p.frase, p.forma, p.textura].some(v => v?.toLowerCase().includes(needle)))
    : proyectos

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 20px 64px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, letterSpacing: '-0.03em', margin: 0 }}>biblioteca</h1>
          <p style={{ fontSize: 13, color: M, margin: '4px 0 0' }}>
            los proyectos del estudio de lámparas: bocetos, pruebas y archivos de impresión. {proyectos.length} en total.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="buscar…" aria-label="buscar proyecto"
            style={{ height: 38, padding: '0 12px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 14, background: '#fff' }} />
          <NuevoProyecto />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        {ETAPAS.map(e => {
          const items = visibles.filter(p => p.etapa === e.key)
          return (
            <section key={e.key} aria-labelledby={`col-${e.key}`}>
              <div style={{ borderTop: `3px solid ${ETAPA_COLOR[e.key]}`, paddingTop: 10, marginBottom: 12 }}>
                <h2 id={`col-${e.key}`} style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, display: 'flex', gap: 8 }}>
                  {e.label} <span style={{ color: S, fontWeight: 600 }}>{items.length}</span>
                </h2>
                <p style={{ fontSize: 12, color: S, margin: '2px 0 0' }}>{e.desc}</p>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {items.length === 0
                  ? <p style={{ fontSize: 13, color: S, border: `1px dashed ${B}`, borderRadius: 8, padding: 20, textAlign: 'center', margin: 0 }}>nada aquí todavía</p>
                  : items.map(p => <Card key={p.id} p={p} />)}
              </div>
            </section>
          )
        })}
      </div>

      <style>{`.bib-card { transition: border-color 120ms; } .bib-card:hover { border-color: #0a0a0a !important; } .bib-card:focus-visible { outline: 2px solid #ffe200; outline-offset: 2px; }`}</style>
    </div>
  )
}
