#!/usr/bin/env node
// Biblioteca de diseño — sube proyectos del estudio de lámparas al panel
// (/casa/biblioteca) sin pasar por el navegador.
//
// Se corre desde cualquier carpeta; las rutas de archivos son relativas a
// donde estés. Usa la llave de servicio de compadregallo/.env.local, que nunca
// sale de esta máquina.
//
//   node ~/compadregallo/scripts/biblioteca.mjs subir <slug> [opciones] <archivos o carpetas…>
//   node ~/compadregallo/scripts/biblioteca.mjs etapa <slug> <idea|prototipo|final>
//   node ~/compadregallo/scripts/biblioteca.mjs listar [slug]
//
// Opciones de `subir`:
//   --nombre "tulipán"        nombre visible (al crear; por defecto, el slug)
//   --etapa idea|prototipo|final
//   --ficha ficha.json        campos de la ficha (solo se actualizan los que traiga)
//   --tipo boceto|render|foto|stl|3mf|documento|otro   fuerza el tipo de TODOS los archivos
//   --portada archivo.png     imagen de portada (una de las que subes o ya subiste)
//   --probar                  muestra qué haría, sin subir ni cambiar nada
//
// Es seguro repetirlo: un archivo con el mismo nombre y el mismo contenido
// (sha256) no se vuelve a subir; si cambió, se reemplaza.

import { readFileSync, statSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(join(REPO, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const { createClient } = await import(join(REPO, 'node_modules/@supabase/supabase-js/dist/module/index.js'))
  .catch(() => import('@supabase/supabase-js'))

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BUCKET = 'biblioteca'
const MAX_BYTES = 50 * 1024 * 1024
const PANEL = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://compadregallo.com'}/casa/biblioteca`

// Igual que src/lib/biblioteca.ts: si cambias uno, cambia el otro.
const ETAPAS = ['idea', 'prototipo', 'final']
const TIPOS = ['boceto', 'render', 'foto', 'stl', '3mf', 'documento', 'otro']
const TIPO_POR_EXT = {
  stl: 'stl', '3mf': '3mf', step: 'otro', stp: 'otro', obj: 'otro',
  pdf: 'documento', md: 'documento', txt: 'documento',
  png: 'render', jpg: 'foto', jpeg: 'foto', heic: 'foto', webp: 'render', gif: 'render', svg: 'boceto',
  mp4: 'foto', mov: 'foto',
}
const CONTENT_TYPE = {
  stl: 'model/stl', '3mf': 'model/3mf', obj: 'model/obj', step: 'model/step', stp: 'model/step',
  pdf: 'application/pdf', md: 'text/markdown', txt: 'text/plain',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', heic: 'image/heic', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', mov: 'video/quicktime',
}
const FICHA_KEYS = ['nombre', 'frase', 'historia', 'forma', 'textura', 'cmf', 'luz', 'medidas', 'fabricacion', 'notas']
const NUM_KEYS = ['tiempo_min', 'gramos', 'costo_pesos', 'precio_pesos']
const IMG = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])

const ext = n => (n.includes('.') ? n.split('.').pop().toLowerCase() : '')
const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const safeName = n => { const e = ext(n); const b = slugify(n.replace(/\.[^.]+$/, '')) || 'archivo'; return e ? `${b}.${e}` : b }
const mb = n => `${(n / 1e6).toFixed(1)} MB`

function die(msg) { console.error(`✗ ${msg}`); process.exit(1) }

function parseArgs(argv) {
  const opts = {}, rest = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--probar') opts.probar = true
    else if (a.startsWith('--')) { opts[a.slice(2)] = argv[++i]; if (opts[a.slice(2)] === undefined) die(`falta el valor de ${a}`) }
    else rest.push(a)
  }
  return { opts, rest }
}

// Carpetas: sus archivos directos (sin subcarpetas ni ocultos), solo tipos conocidos.
function expand(paths) {
  const out = []
  for (const p of paths) {
    const abs = resolve(p)
    let st
    try { st = statSync(abs) } catch { die(`no existe: ${p}`) }
    if (st.isDirectory()) {
      for (const f of readdirSync(abs).sort()) {
        if (f.startsWith('.')) continue
        const full = join(abs, f)
        if (statSync(full).isFile() && (TIPO_POR_EXT[ext(f)])) out.push(full)
      }
    } else out.push(abs)
  }
  return out
}

async function getProyecto(slug) {
  const { data, error } = await db.from('biblioteca_proyectos').select('*').eq('slug', slug).maybeSingle()
  if (error) die(error.message)
  return data
}

// ── subir ────────────────────────────────────────────────────────────────────
async function subir(slugArg, opts, files) {
  const slug = slugify(slugArg ?? '')
  if (!slug) die('falta el slug del proyecto (ej. tulipan)')
  if (opts.etapa && !ETAPAS.includes(opts.etapa)) die(`etapa inválida: ${opts.etapa} (usa ${ETAPAS.join(', ')})`)
  if (opts.tipo && !TIPOS.includes(opts.tipo)) die(`tipo inválido: ${opts.tipo} (usa ${TIPOS.join(', ')})`)

  let ficha = {}
  if (opts.ficha) {
    try { ficha = JSON.parse(readFileSync(resolve(opts.ficha), 'utf8')) } catch (e) { die(`no pude leer ${opts.ficha}: ${e.message}`) }
    const desconocidas = Object.keys(ficha).filter(k => !FICHA_KEYS.includes(k) && !NUM_KEYS.includes(k) && k !== 'etapa')
    if (desconocidas.length) die(`la ficha trae campos que no existen: ${desconocidas.join(', ')}. válidos: ${[...FICHA_KEYS, ...NUM_KEYS, 'etapa'].join(', ')}`)
  }

  const patch = {}
  for (const k of FICHA_KEYS) if (typeof ficha[k] === 'string' && ficha[k].trim()) patch[k] = ficha[k].trim()
  for (const k of NUM_KEYS) if (ficha[k] !== undefined && ficha[k] !== null && ficha[k] !== '') {
    const n = Math.round(Number(ficha[k]))
    if (!Number.isFinite(n) || n < 0) die(`${k} tiene que ser un número entero ≥ 0`)
    patch[k] = n
  }
  if (opts.nombre) patch.nombre = opts.nombre.trim()
  const etapa = opts.etapa ?? ficha.etapa
  if (etapa) { if (!ETAPAS.includes(etapa)) die(`etapa inválida: ${etapa}`); patch.etapa = etapa }

  const list = expand(files)
  for (const f of list) if (statSync(f).size > MAX_BYTES) die(`${basename(f)} pesa ${mb(statSync(f).size)}; el máximo es 50 MB`)

  let proyecto = await getProyecto(slug)
  const nuevo = !proyecto
  console.log(`${nuevo ? '+ proyecto nuevo' : '· proyecto'} ${slug}${patch.etapa ? ` → ${patch.etapa}` : ''}${opts.probar ? '   (modo prueba: no se cambia nada)' : ''}`)

  if (!opts.probar) {
    if (nuevo) {
      const { data, error } = await db.from('biblioteca_proyectos')
        .insert({ slug, nombre: patch.nombre ?? slug, etapa: 'idea', ...patch }).select('*').single()
      if (error) die(error.message)
      proyecto = data
    } else if (Object.keys(patch).length) {
      const { data, error } = await db.from('biblioteca_proyectos')
        .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', proyecto.id).select('*').single()
      if (error) die(error.message)
      proyecto = data
    }
  }
  const campos = Object.keys(patch).filter(k => k !== 'etapa')
  if (campos.length) console.log(`  ficha: ${campos.join(', ')}`)

  const existentes = new Map()
  if (proyecto) {
    const { data } = await db.from('biblioteca_archivos').select('nombre, sha256, path').eq('proyecto_id', proyecto.id)
    for (const a of data ?? []) existentes.set(a.nombre, a)
  }

  let subidos = 0, iguales = 0, primeraImagen = null
  for (const f of list) {
    const nombre = safeName(basename(f))
    const tipo = opts.tipo ?? TIPO_POR_EXT[ext(nombre)] ?? 'otro'
    const buf = await readFile(f)
    const sha256 = createHash('sha256').update(buf).digest('hex')
    const prev = existentes.get(nombre)
    const path = prev?.path ?? `${slug}/${tipo}/${nombre}`
    if (IMG.has(ext(nombre)) && !primeraImagen) primeraImagen = path

    if (prev && prev.sha256 === sha256) { iguales++; console.log(`  = ${nombre}  (sin cambios)`); continue }
    console.log(`  ${prev ? '↻' : '↑'} ${nombre}  ${tipo}  ${mb(buf.length)}`)
    if (opts.probar) { subidos++; continue }

    const contentType = CONTENT_TYPE[ext(nombre)] ?? 'application/octet-stream'
    const { error: upErr } = await db.storage.from(BUCKET).upload(path, buf, { contentType, upsert: true })
    if (upErr) die(`no se subió ${nombre}: ${upErr.message}`)
    const { error: rowErr } = await db.from('biblioteca_archivos').upsert(
      { proyecto_id: proyecto.id, nombre, tipo, path, bytes: buf.length, content_type: contentType, sha256 },
      { onConflict: 'proyecto_id,nombre' },
    )
    if (rowErr) die(`se subió ${nombre} pero no se registró: ${rowErr.message}`)
    subidos++
  }

  // Portada: la que pidan, o la primera imagen si el proyecto no tiene.
  if (!opts.probar && proyecto) {
    let portada = null
    if (opts.portada) {
      const n = safeName(basename(opts.portada))
      const { data } = await db.from('biblioteca_archivos').select('path').eq('proyecto_id', proyecto.id).eq('nombre', n).maybeSingle()
      if (!data) die(`--portada: ${n} no está en el proyecto (súbela en este mismo comando o antes)`)
      portada = data.path
    } else if (!proyecto.portada && primeraImagen) portada = primeraImagen
    await db.from('biblioteca_proyectos')
      .update({ ...(portada ? { portada } : {}), updated_at: new Date().toISOString() }).eq('id', proyecto.id)
    if (portada) console.log(`  portada: ${basename(portada)}`)
  }

  console.log(`✓ ${subidos} ${opts.probar ? 'por subir' : 'subido(s)'}, ${iguales} sin cambios. ${PANEL}/${slug}`)
}

// ── etapa ────────────────────────────────────────────────────────────────────
async function cambiarEtapa(slugArg, etapa) {
  const slug = slugify(slugArg ?? '')
  if (!ETAPAS.includes(etapa)) die(`etapa inválida: ${etapa} (usa ${ETAPAS.join(', ')})`)
  const p = await getProyecto(slug)
  if (!p) die(`no existe el proyecto ${slug}`)
  const { error } = await db.from('biblioteca_proyectos').update({ etapa, updated_at: new Date().toISOString() }).eq('id', p.id)
  if (error) die(error.message)
  console.log(`✓ ${slug}: ${p.etapa} → ${etapa}`)
}

// ── listar ───────────────────────────────────────────────────────────────────
async function listar(slugArg) {
  if (slugArg) {
    const p = await getProyecto(slugify(slugArg))
    if (!p) die(`no existe el proyecto ${slugArg}`)
    console.log(`${p.nombre} (${p.slug}) · ${p.etapa}${p.frase ? `\n  ${p.frase}` : ''}`)
    const { data } = await db.from('biblioteca_archivos').select('nombre, tipo, bytes').eq('proyecto_id', p.id).order('tipo').order('nombre')
    for (const a of data ?? []) console.log(`  ${a.tipo.padEnd(10)} ${mb(a.bytes ?? 0).padStart(8)}  ${a.nombre}`)
    return
  }
  const { data } = await db.from('biblioteca_proyectos').select('slug, nombre, etapa, updated_at').order('etapa').order('updated_at', { ascending: false })
  for (const e of ETAPAS) {
    const items = (data ?? []).filter(p => p.etapa === e)
    console.log(`${e.toUpperCase()} (${items.length})`)
    for (const p of items) console.log(`  ${p.slug.padEnd(24)} ${p.nombre}`)
  }
}

const [cmd, ...argv] = process.argv.slice(2)
const { opts, rest } = parseArgs(argv)
if (cmd === 'subir') await subir(rest[0], opts, rest.slice(1))
else if (cmd === 'etapa') await cambiarEtapa(rest[0], rest[1])
else if (cmd === 'listar') await listar(rest[0])
else {
  console.log('uso:\n  node scripts/biblioteca.mjs subir <slug> [--nombre] [--etapa] [--ficha f.json] [--tipo] [--portada img] [--probar] <archivos|carpetas…>\n  node scripts/biblioteca.mjs etapa <slug> <idea|prototipo|final>\n  node scripts/biblioteca.mjs listar [slug]')
  process.exit(cmd ? 1 : 0)
}
