'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Product, ProductVariant, StoreCategory, StoreSize, PackagingType } from '@/lib/supabase'
import { totalStock } from '@/lib/supabase'
import { createProduct, updateProduct, togglePublished, deleteProduct } from './actions'
import ImageUpload from './ImageUpload'
import AdminShell from '../AdminShell'

// ─── Selector de tallas ───────────────────────────────────────────────────────

function SizeManager({ variants, sizes }: { variants?: ProductVariant[]; sizes: string[] }) {
  const existingVariants = variants ?? []
  const isUnica = existingVariants.length === 0 ||
    (existingVariants.length === 1 && existingVariants[0].size === 'única')

  const [enabled, setEnabled] = useState<Set<string>>(
    isUnica ? new Set() : new Set(existingVariants.map(v => v.size))
  )
  const stockBySize = Object.fromEntries(existingVariants.map(v => [v.size, v.stock]))
  const hasSizes = enabled.size > 0

  function toggle(size: string) {
    setEnabled(prev => {
      const next = new Set(prev)
      next.has(size) ? next.delete(size) : next.add(size)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6a64', marginBottom: 8, letterSpacing: '0.03em' }}>
          tallas disponibles
          <span style={{ fontWeight: 400, marginLeft: 6, color: '#aaa' }}>— haz clic para activar</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sizes.map(size => (
            <button key={size} type="button" onClick={() => toggle(size)} style={{
              padding: '7px 16px', borderRadius: 4, fontFamily: 'var(--font-sans)',
              border: `1px solid ${enabled.has(size) ? '#003a87' : '#d4d3cd'}`,
              background: enabled.has(size) ? '#003a87' : 'transparent',
              color: enabled.has(size) ? '#fff' : '#6b6a64',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.1s',
            }}>
              {size}
            </button>
          ))}
          {sizes.length === 0 && (
            <span style={{ fontSize: 13, color: '#aaa' }}>
              no hay tallas — <a href="/casa/tienda/configuracion" style={{ color: '#003a87' }}>agregar en configuración</a>
            </span>
          )}
        </div>
      </div>

      {hasSizes ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6a64', marginBottom: 8, letterSpacing: '0.03em' }}>
            stock por talla
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {sizes.filter(s => enabled.has(s)).map(size => (
              <label key={size} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b6a64' }}>{size}</span>
                <input
                  name={`stock_${size}`} type="number" min="0"
                  defaultValue={stockBySize[size] ?? 0}
                  style={{ ...styles.input, width: 72, textAlign: 'center' }}
                />
              </label>
            ))}
          </div>
        </div>
      ) : (
        <label style={styles.label}>
          stock total
          <input
            name="stock_unica" type="number" min="0"
            defaultValue={isUnica ? (stockBySize['única'] ?? 0) : 0}
            style={{ ...styles.input, maxWidth: 120 }}
          />
        </label>
      )}

      <input type="hidden" name="enabled_sizes" value={sizes.filter(s => enabled.has(s)).join(',')} />
    </div>
  )
}

// ─── Formulario de producto ───────────────────────────────────────────────────

function ProductForm({
  initial, onSubmit, onCancel, pending, categories, sizes, packaging,
}: {
  initial?: Product
  onSubmit: (fd: FormData) => void
  onCancel: () => void
  pending: boolean
  categories: string[]
  sizes: string[]
  packaging: PackagingType[]
}) {
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '')

  return (
    <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={styles.label}>
          nombre *
          <input name="name" required defaultValue={initial?.name} style={styles.input} />
        </label>
        <label style={styles.label}>
          precio (MXN) *
          <input name="price_mxn" type="number" step="0.01" min="0" required
            defaultValue={initial ? (initial.price_mxn / 100).toFixed(2) : ''}
            style={styles.input} placeholder="350.00" />
        </label>
        <label style={styles.label}>
          categoría *
          <select name="category" value={category} onChange={e => setCategory(e.target.value)} style={styles.input}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
            {categories.length === 0 && <option value="">sin categorías</option>}
          </select>
        </label>
        <label style={styles.label}>
          peso (gramos)
          <input name="weight_grams" type="number" min="0"
            defaultValue={initial?.weight_grams ?? ''} style={styles.input} placeholder="ej. 220" />
          <span style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>peso del producto sin empaque</span>
        </label>
        <label style={styles.label}>
          embalaje
          <select name="packaging_type_id" defaultValue={initial?.packaging_type_id ?? ''} style={styles.input}>
            <option value="">sin embalaje</option>
            {packaging.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.length_cm}×{p.width_cm}×{p.height_cm} cm · {p.weight_grams}g
              </option>
            ))}
          </select>
          {packaging.length === 0 && (
            <span style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
              <a href="/casa/tienda/configuracion" style={{ color: '#003a87' }}>configura embalajes</a> primero
            </span>
          )}
        </label>
      </div>

      <SizeManager variants={initial?.product_variants} sizes={sizes} />

      <label style={styles.label}>
        descripción
        <textarea name="description" rows={3} defaultValue={initial?.description ?? ''}
          style={{ ...styles.input, resize: 'vertical' }} />
      </label>

      <ImageUpload currentUrl={imageUrl || null} onUploaded={setImageUrl} />
      <input type="hidden" name="image_url" value={imageUrl} />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button type="button" onClick={onCancel} style={styles.btnSecondary} disabled={pending}>
          cancelar
        </button>
        <button type="submit" style={styles.btnPrimary} disabled={pending}>
          {pending ? 'guardando...' : initial ? 'guardar cambios' : 'agregar producto'}
        </button>
      </div>
    </form>
  )
}

// ─── Skydropx readiness ───────────────────────────────────────────────────────

function skydropxStatus(product: Product): { ok: boolean; warn: boolean; msg: string } {
  const pkg = product.packaging_types
  if (!product.packaging_type_id || !pkg) return { ok: false, warn: false, msg: 'sin embalaje' }
  if (!pkg.skydropx_package_type) return { ok: false, warn: true, msg: 'falta código SAT embalaje' }
  if (!pkg.consignment_note || pkg.consignment_note === 'Merch') return { ok: false, warn: true, msg: 'falta código SAT clase' }
  if (!product.weight_grams) return { ok: false, warn: true, msg: 'falta peso del producto' }
  return { ok: true, warn: false, msg: 'listo para skydropx' }
}

// ─── Fila de producto ─────────────────────────────────────────────────────────

function ProductRow({ product, onEdit, onRefresh }: {
  product: Product; onEdit: (p: Product) => void; onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pricePesos = (product.price_mxn / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
  const stock = totalStock(product.product_variants)
  const hasSizes = (product.product_variants ?? []).some(v => v.size !== 'única')

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '48px 1fr 100px auto 90px 140px',
      alignItems: 'center', gap: 12, padding: '12px 16px',
      borderBottom: '1px solid #ecebe5', background: '#fff',
      opacity: isPending ? 0.5 : 1, transition: 'opacity 0.15s',
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 4, background: '#f0efe9', overflow: 'hidden', flexShrink: 0 }}>
        {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0a0a0a' }}>{product.name}</div>
        <div style={{ fontSize: 12, color: '#6b6a64', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>{product.category}</span>
          {product.weight_grams && <span>· {product.weight_grams}g</span>}
          {(() => {
            const s = skydropxStatus(product)
            return (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                background: s.ok ? 'rgba(26,107,53,0.1)' : s.warn ? 'rgba(255,180,0,0.15)' : '#f0efe9',
                color: s.ok ? '#1a6b35' : s.warn ? '#8a5e00' : '#aaa',
                letterSpacing: '0.03em',
              }}>
                {s.ok ? '✓ sky' : s.msg}
              </span>
            )
          })()}
        </div>
      </div>

      <div style={{ fontSize: 14, color: '#0a0a0a', fontVariantNumeric: 'tabular-nums' }}>{pricePesos}</div>

      <div style={{ fontSize: 13 }}>
        {hasSizes ? (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(product.product_variants ?? []).map(v => (
              <span key={v.size} style={{
                fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                background: v.stock === 0 ? '#f0efe9' : '#e8f4ee',
                color: v.stock === 0 ? '#aaa' : '#1a6b35',
              }}>
                {v.size} {v.stock}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: stock === 0 ? '#ff0100' : '#0a0a0a', fontVariantNumeric: 'tabular-nums' }}>
            {stock === 0 ? 'agotado' : `${stock} pzs`}
          </span>
        )}
      </div>

      <button onClick={() => startTransition(async () => { await togglePublished(product.id, product.is_published); onRefresh() })}
        disabled={isPending} style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          padding: '4px 8px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: product.is_published ? '#003a87' : '#ecebe5',
          color: product.is_published ? '#fff' : '#6b6a64',
        }}>
        {product.is_published ? 'PUBLICADO' : 'BORRADOR'}
      </button>

      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => onEdit(product)} style={{ ...styles.btnIcon, lineHeight: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
          </svg>
        </button>
        {confirmDelete ? (
          <>
            <button onClick={() => startTransition(async () => { await deleteProduct(product.id); onRefresh() })}
              style={{ ...styles.btnIcon, background: 'rgba(255,1,0,0.08)', color: '#ff0100', fontSize: 11, fontWeight: 700, padding: '4px 10px', lineHeight: 1 }}>
              eliminar
            </button>
            <button onClick={() => setConfirmDelete(false)} style={{ ...styles.btnIcon, fontSize: 11, fontWeight: 600, padding: '4px 10px', lineHeight: 1 }}>no</button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ ...styles.btnIcon, lineHeight: 0, color: 'rgba(255,1,0,0.45)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export default function TiendaAdmin({ initial, categories, sizes, packaging }: {
  initial: Product[]
  categories: StoreCategory[]
  sizes: StoreSize[]
  packaging: PackagingType[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const refresh = () => router.refresh()
  const categoryNames = categories.map(c => c.name)
  const sizeNames = sizes.map(s => s.name)
  const published = initial.filter(p => p.is_published).length

  function handleCreate(fd: FormData) {
    setError(null)
    startTransition(async () => {
      try { await createProduct(fd); setShowForm(false); refresh() }
      catch (e: unknown) { setError(e instanceof Error ? e.message : 'error al guardar') }
    })
  }

  function handleUpdate(fd: FormData) {
    if (!editing) return
    setError(null)
    startTransition(async () => {
      try { await updateProduct(editing.id, fd); setEditing(null); refresh() }
      catch (e: unknown) { setError(e instanceof Error ? e.message : 'error al guardar') }
    })
  }

  return (
    <AdminShell
      crumb="tienda"
      crumbHref="/casa"
      right={
        <a href="/casa/tienda/configuracion" style={{ fontSize: 13, color: '#9a9994', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          configuración
        </a>
      }
    >
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: '#0a0a0a', marginBottom: 4 }}>
              tienda
            </h1>
            <p style={{ color: '#6b6a64', fontSize: 14 }}>
              {initial.length === 0 ? 'no hay productos todavía'
                : `${initial.length} producto${initial.length !== 1 ? 's' : ''} · ${published} publicado${published !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => { setShowForm(true); setEditing(null) }} style={styles.btnPrimary}>
            + agregar producto
          </button>
        </div>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ff0100', borderRadius: 4, padding: '12px 16px', fontSize: 13, color: '#ff0100', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {showForm && !editing && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>nuevo producto</h2>
            <ProductForm categories={categoryNames} sizes={sizeNames} packaging={packaging} onSubmit={handleCreate} onCancel={() => setShowForm(false)} pending={isPending} />
          </div>
        )}

        {editing && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>editar — {editing.name}</h2>
            <ProductForm categories={categoryNames} sizes={sizeNames} packaging={packaging} initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} pending={isPending} />
          </div>
        )}

        {initial.length === 0 && !showForm ? (
          <div style={{ background: '#fff', border: '1px solid #ecebe5', borderRadius: 8, padding: '64px 32px', textAlign: 'center', color: '#6b6a64', fontSize: 14 }}>
            todavía no hay productos. dale a &ldquo;+ agregar producto&rdquo; para empezar.
          </div>
        ) : initial.length > 0 ? (
          <div style={{ background: '#fff', border: '1px solid #ecebe5', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '48px 1fr 100px auto 90px 140px',
              gap: 12, padding: '8px 16px', background: '#f6f5f1', borderBottom: '1px solid #ecebe5',
              fontSize: 11, fontWeight: 700, color: '#6b6a64', letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              <div /><div>nombre</div><div>precio</div><div>stock</div><div>estado</div><div>acciones</div>
            </div>
            {initial.map(p => (
              <ProductRow key={p.id} product={p}
                onEdit={prod => { setEditing(prod); setShowForm(false) }}
                onRefresh={refresh} />
            ))}
          </div>
        ) : null}
      </main>
    </AdminShell>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = {
  label: { display: 'flex', flexDirection: 'column' as const, gap: 4, fontSize: 12, fontWeight: 600, color: '#6b6a64', letterSpacing: '0.03em' },
  input: { padding: '8px 10px', border: '1px solid #d4d3cd', borderRadius: 4, fontSize: 14, color: '#0a0a0a', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'var(--font-sans)' },
  btnPrimary: { background: '#ff0100', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  btnSecondary: { background: 'transparent', color: '#6b6a64', border: '1px solid #d4d3cd', borderRadius: 4, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  btnIcon: { background: '#f0efe9', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)' },
  formCard: { background: '#fff', border: '1px solid #ecebe5', borderRadius: 8, padding: 24, marginBottom: 24 },
  formTitle: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: '#0a0a0a', marginBottom: 20, letterSpacing: '-0.02em' },
}
