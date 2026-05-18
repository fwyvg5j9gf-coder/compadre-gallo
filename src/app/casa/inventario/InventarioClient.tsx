'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  adjustVariantStock,
  updateReorderPoint,
  updateProductSku,
  updateVariantSku,
  getVariantMovements,
  type Movement,
} from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type Variant = {
  id: string
  size: string
  stock: number
  sku: string | null
  reorder_point: number
}

type Product = {
  id: string
  name: string
  category: string
  image_url: string | null
  sku: string | null
  is_published: boolean
  product_variants: Variant[]
}

type Stats = {
  totalVariants: number
  totalUnits: number
  outOfStock: number
  lowStock: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const B = '#e8e7e1', M = '#6b6a64', S = '#9a9994'

const MOVEMENT_TYPE_META: Record<string, { label: string; color: string }> = {
  sale:       { label: 'venta',      color: '#003a87' },
  restock:    { label: 'reposición', color: '#1a6b35' },
  adjustment: { label: 'ajuste',     color: '#6b6a64' },
  correction: { label: 'corrección', color: '#8a5e00' },
  return:     { label: 'devolución', color: '#007a8c' },
  initial:    { label: 'inicial',    color: '#9a9994' },
}

const ADJUST_REASONS = [
  'reposición de stock',
  'conteo físico',
  'devolución de cliente',
  'muestra / uso interno',
  'merma o daño',
  'corrección de error',
  'ajuste manual',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function stockBadge(stock: number, reorderPoint: number) {
  if (stock === 0)   return { label: 'agotado',   bg: 'rgba(255,1,0,0.08)',     text: '#cc0000' }
  if (reorderPoint > 0 && stock <= reorderPoint)
                     return { label: 'bajo stock', bg: 'rgba(255,180,0,0.12)',   text: '#8a5e00' }
  return             { label: 'en stock',          bg: 'rgba(26,107,53,0.08)',   text: '#1a6b35' }
}

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Movement history ──────────────────────────────────────────────────────────

function MovementHistory({ variantId }: { variantId: string }) {
  const [movements, setMovements] = useState<Movement[] | null>(null)
  const [loading, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  function load() {
    if (loaded) return
    start(async () => {
      const { data, error: err } = await getVariantMovements(variantId)
      if (err) { setError(err); return }
      setMovements(data ?? [])
      setLoaded(true)
    })
  }

  if (!loaded) {
    return (
      <div style={{ padding: '12px 0 0' }}>
        <button
          onClick={load}
          disabled={loading}
          style={{ fontSize: 12, color: '#003a87', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
        >
          {loading ? 'cargando…' : 'ver historial →'}
        </button>
      </div>
    )
  }

  if (error) return <p style={{ fontSize: 12, color: '#cc0000', marginTop: 8 }}>{error}</p>

  if (!movements?.length) {
    return <p style={{ fontSize: 12, color: S, fontStyle: 'italic', marginTop: 8 }}>sin movimientos registrados.</p>
  }

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${B}`, paddingTop: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        historial ({movements.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {movements.map(mv => {
          const meta = MOVEMENT_TYPE_META[mv.type] ?? { label: mv.type, color: S }
          const sign = mv.qty_change >= 0 ? '+' : ''
          return (
            <div key={mv.id} style={{ display: 'grid', gridTemplateColumns: '70px 50px 1fr 140px', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: `${meta.color}18`, color: meta.color, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {meta.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: mv.qty_change >= 0 ? '#1a6b35' : '#cc0000', textAlign: 'right' }}>
                {sign}{mv.qty_change}
              </span>
              <span style={{ color: M }}>
                {mv.reason ?? '—'}
                {mv.reference_id && (
                  <span style={{ color: S, marginLeft: 6, fontSize: 11 }}>#{mv.reference_id.slice(0, 8)}</span>
                )}
              </span>
              <span style={{ color: S, fontSize: 11 }}>{fmtTs(mv.created_at)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Stock adjustment panel ────────────────────────────────────────────────────

function AdjustPanel({
  variant,
  onClose,
  onDone,
}: {
  variant: Variant
  onClose: () => void
  onDone: () => void
}) {
  const [newQty, setNewQty] = useState(String(variant.stock))
  const [reason, setReason] = useState(ADJUST_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [type, setType] = useState<'adjustment' | 'restock' | 'correction' | 'return'>('adjustment')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const parsedQty = parseInt(newQty) || 0
  const delta = parsedQty - variant.stock

  function handleSave() {
    setError(null)
    const finalReason = reason === 'ajuste manual' ? (customReason.trim() || 'ajuste manual') : reason
    start(async () => {
      const { error: err } = await adjustVariantStock(variant.id, parsedQty, finalReason, type)
      if (err) { setError(err); return }
      onDone()
    })
  }

  return (
    <div style={{
      position: 'absolute', right: 0, top: '100%', zIndex: 40, marginTop: 4,
      background: '#fff', border: `1px solid ${B}`, borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: 16, width: 280,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0a' }}>ajustar stock · {variant.size}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: S, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: M }}>
          nueva cantidad
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setNewQty(String(Math.max(0, parsedQty - 1)))}
              style={{ width: 32, height: 32, borderRadius: 4, border: `1px solid ${B}`, background: '#f6f5f1', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: M }}
            >−</button>
            <input
              type="number" min="0"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              style={{ flex: 1, height: 32, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 15, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#0a0a0a' }}
            />
            <button
              type="button"
              onClick={() => setNewQty(String(parsedQty + 1))}
              style={{ width: 32, height: 32, borderRadius: 4, border: `1px solid ${B}`, background: '#f6f5f1', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: M }}
            >+</button>
          </div>
          {delta !== 0 && (
            <span style={{ fontSize: 11, color: delta > 0 ? '#1a6b35' : '#cc0000', fontWeight: 600 }}>
              {delta > 0 ? `+${delta}` : delta} respecto al stock actual ({variant.stock})
            </span>
          )}
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: M }}>
          tipo de movimiento
          <select
            value={type}
            onChange={e => setType(e.target.value as typeof type)}
            style={{ height: 32, padding: '0 8px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 12 }}
          >
            <option value="restock">reposición de stock</option>
            <option value="adjustment">ajuste manual</option>
            <option value="correction">corrección de error</option>
            <option value="return">devolución</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: M }}>
          razón
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{ height: 32, padding: '0 8px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 12 }}
          >
            {ADJUST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        {reason === 'ajuste manual' && (
          <input
            placeholder="describe el motivo…"
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            style={{ height: 32, padding: '0 10px', border: `1px solid ${B}`, borderRadius: 4, fontSize: 12 }}
          />
        )}

        {error && <p style={{ fontSize: 12, color: '#cc0000', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={handleSave}
            disabled={pending || delta === 0}
            style={{
              flex: 1, height: 34, borderRadius: 4, border: 'none', fontSize: 13, fontWeight: 700,
              background: delta === 0 ? '#f0efe9' : '#0a0a0a',
              color: delta === 0 ? S : '#fff',
              cursor: delta === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {pending ? 'guardando…' : 'guardar'}
          </button>
          <button onClick={onClose} style={{ height: 34, padding: '0 12px', border: `1px solid ${B}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, color: M, fontFamily: 'var(--font-sans)' }}>
            cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Variant row ───────────────────────────────────────────────────────────────

function VariantRow({
  variant,
  productId,
  isMultiVariant,
}: {
  variant: Variant
  productId: string
  isMultiVariant: boolean
}) {
  const router = useRouter()
  const [showAdjust, setShowAdjust] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [editingSku, setEditingSku] = useState(false)
  const [skuInput, setSkuInput] = useState(variant.sku ?? '')
  const [editingReorder, setEditingReorder] = useState(false)
  const [reorderInput, setReorderInput] = useState(String(variant.reorder_point))
  const [pendingSku, startSku] = useTransition()
  const [pendingReorder, startReorder] = useTransition()
  const [errSku, setErrSku] = useState<string | null>(null)

  const badge = stockBadge(variant.stock, variant.reorder_point)

  function saveSku() {
    setErrSku(null)
    startSku(async () => {
      const { error } = await updateVariantSku(variant.id, skuInput)
      if (error) { setErrSku(error); return }
      setEditingSku(false)
      router.refresh()
    })
  }

  function saveReorder() {
    startReorder(async () => {
      await updateReorderPoint(variant.id, parseInt(reorderInput) || 0)
      setEditingReorder(false)
      router.refresh()
    })
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMultiVariant ? '28px 80px 1fr 70px 70px 80px 100px' : '28px 80px 1fr 70px 70px 80px 100px',
        gap: 10, alignItems: 'center', padding: '10px 20px',
        borderBottom: `1px solid #f6f5f1`,
        background: showHistory ? 'rgba(0,58,135,0.02)' : '#fff',
        fontSize: 13,
      }}>
        {/* Indent indicator for variants */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {isMultiVariant && (
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: B }} />
          )}
        </div>

        {/* Talla */}
        <span style={{ fontWeight: isMultiVariant ? 500 : 600, color: M, fontSize: 12 }}>
          {variant.size === 'única' ? 'sin talla' : variant.size}
        </span>

        {/* SKU variante */}
        <div style={{ position: 'relative' }}>
          {editingSku ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                value={skuInput}
                onChange={e => setSkuInput(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') saveSku(); if (e.key === 'Escape') setEditingSku(false) }}
                autoFocus
                style={{ height: 28, padding: '0 8px', border: `1px solid #003a87`, borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-mono)', width: 140 }}
              />
              <button onClick={saveSku} disabled={pendingSku} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: 'none', background: '#003a87', color: '#fff', cursor: 'pointer' }}>
                {pendingSku ? '…' : 'ok'}
              </button>
              <button onClick={() => setEditingSku(false)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: `1px solid ${B}`, background: '#fff', cursor: 'pointer', color: M }}>×</button>
              {errSku && <span style={{ fontSize: 11, color: '#cc0000' }}>{errSku}</span>}
            </div>
          ) : (
            <button
              onClick={() => { setSkuInput(variant.sku ?? ''); setEditingSku(true) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {variant.sku ? (
                <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#003a87', background: 'rgba(0,58,135,0.06)', padding: '2px 6px', borderRadius: 3 }}>
                  {variant.sku}
                </code>
              ) : (
                <span style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>sin SKU</span>
              )}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={S} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Stock actual */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: variant.stock === 0 ? '#cc0000' : '#0a0a0a' }}>
            {variant.stock}
          </span>
        </div>

        {/* Reorder point */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {editingReorder ? (
            <input
              type="number" min="0"
              value={reorderInput}
              autoFocus
              onChange={e => setReorderInput(e.target.value)}
              onBlur={saveReorder}
              onKeyDown={e => { if (e.key === 'Enter') saveReorder(); if (e.key === 'Escape') setEditingReorder(false) }}
              style={{ width: 52, height: 26, padding: '0 6px', border: `1px solid #003a87`, borderRadius: 4, fontSize: 12, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
            />
          ) : (
            <button
              onClick={() => setEditingReorder(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: M }}>
                {variant.reorder_point || '—'}
              </span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={S} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Estado */}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
          background: badge.bg, color: badge.text,
          textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
          textAlign: 'center',
        }}>
          {badge.label}
        </span>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', position: 'relative' }}>
          <button
            onClick={() => { setShowHistory(v => !v); setShowAdjust(false) }}
            title="historial"
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${showHistory ? '#003a87' : B}`, borderRadius: 4,
              background: showHistory ? 'rgba(0,58,135,0.06)' : '#fff',
              cursor: 'pointer', color: showHistory ? '#003a87' : S,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </button>
          <button
            onClick={() => { setShowAdjust(v => !v); setShowHistory(false) }}
            title="ajustar stock"
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${showAdjust ? '#0a0a0a' : B}`, borderRadius: 4,
              background: showAdjust ? '#0a0a0a' : '#fff',
              cursor: 'pointer', color: showAdjust ? '#fff' : S,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {showAdjust && (
            <AdjustPanel
              variant={variant}
              onClose={() => setShowAdjust(false)}
              onDone={() => { setShowAdjust(false); router.refresh() }}
            />
          )}
        </div>
      </div>

      {/* History row */}
      {showHistory && (
        <div style={{ padding: '12px 20px 16px', background: 'rgba(0,58,135,0.02)', borderBottom: `1px solid ${B}` }}>
          <MovementHistory variantId={variant.id} />
        </div>
      )}
    </>
  )
}

// ── Product section ───────────────────────────────────────────────────────────

function ProductSection({ product }: { product: Product }) {
  const router = useRouter()
  const [editingProductSku, setEditingProductSku] = useState(false)
  const [productSkuInput, setProductSkuInput] = useState(product.sku ?? '')
  const [pendingProductSku, startProductSku] = useTransition()
  const [errProductSku, setErrProductSku] = useState<string | null>(null)

  const variants = product.product_variants ?? []
  const totalStock = variants.reduce((s, v) => s + v.stock, 0)
  const isMultiVariant = variants.length > 1 || (variants.length === 1 && variants[0].size !== 'única')

  function saveProductSku() {
    setErrProductSku(null)
    startProductSku(async () => {
      const { error } = await updateProductSku(product.id, productSkuInput)
      if (error) { setErrProductSku(error); return }
      setEditingProductSku(false)
      router.refresh()
    })
  }

  return (
    <div style={{ border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
      {/* Product header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto 100px',
        gap: 12, alignItems: 'center', padding: '12px 20px',
        background: '#f6f5f1', borderBottom: `1px solid ${B}`,
      }}>
        {/* Image */}
        <div style={{ width: 36, height: 36, borderRadius: 4, background: '#e8e7e1', overflow: 'hidden', flexShrink: 0 }}>
          {product.image_url && (
            <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        {/* Name + category + product SKU */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a' }}>{product.name}</span>
            <span style={{ fontSize: 11, color: S, background: '#e8e7e1', padding: '1px 6px', borderRadius: 3 }}>{product.category}</span>
            {!product.is_published && (
              <span style={{ fontSize: 10, fontWeight: 700, color: S, textTransform: 'uppercase', letterSpacing: '0.04em' }}>borrador</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: S, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SKU producto:</span>
            {editingProductSku ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={productSkuInput}
                  onChange={e => setProductSkuInput(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') saveProductSku(); if (e.key === 'Escape') setEditingProductSku(false) }}
                  autoFocus
                  style={{ height: 24, padding: '0 6px', border: `1px solid #003a87`, borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', width: 120 }}
                />
                <button onClick={saveProductSku} disabled={pendingProductSku} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, border: 'none', background: '#003a87', color: '#fff', cursor: 'pointer' }}>
                  {pendingProductSku ? '…' : 'ok'}
                </button>
                <button onClick={() => setEditingProductSku(false)} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, border: `1px solid ${B}`, background: '#fff', cursor: 'pointer', color: M }}>×</button>
                {errProductSku && <span style={{ fontSize: 10, color: '#cc0000' }}>{errProductSku}</span>}
              </div>
            ) : (
              <button
                onClick={() => { setProductSkuInput(product.sku ?? ''); setEditingProductSku(true) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {product.sku ? (
                  <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#003a87' }}>{product.sku}</code>
                ) : (
                  <span style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>asignar SKU</span>
                )}
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={S} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Column labels */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 80px 1fr 70px 70px 80px 100px',
          gap: 10, fontSize: 9, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase',
          alignItems: 'center',
        }}>
          <div />
          <div>talla</div>
          <div>SKU variante</div>
          <div style={{ textAlign: 'right' }}>stock</div>
          <div style={{ textAlign: 'right' }}>mínimo</div>
          <div style={{ textAlign: 'center' }}>estado</div>
          <div />
        </div>

        {/* Total stock chip */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: S }}>total:</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 16, color: totalStock === 0 ? '#cc0000' : '#0a0a0a' }}>
            {totalStock}
          </span>
        </div>
      </div>

      {/* Variant rows */}
      <div style={{ background: '#fff' }}>
        {variants.map(v => (
          <VariantRow key={v.id} variant={v} productId={product.id} isMultiVariant={isMultiVariant} />
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function InventarioClient({
  products,
  initialFilter,
  stats,
}: {
  products: Product[]
  initialFilter: 'all' | 'low' | 'out'
  stats: Stats
}) {
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>(initialFilter)
  const [search, setSearch] = useState('')

  const filtered = products.filter(p => {
    const variants = p.product_variants ?? []
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
      variants.some(v => (v.sku ?? '').toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    if (filter === 'out') return variants.some(v => v.stock === 0)
    if (filter === 'low') return variants.some(v => v.stock > 0 && v.reorder_point > 0 && v.stock <= v.reorder_point)
    return true
  })

  const TABS: { key: 'all' | 'low' | 'out'; label: string; count?: number }[] = [
    { key: 'all', label: 'todos' },
    { key: 'low', label: 'bajo stock', count: stats.lowStock },
    { key: 'out', label: 'agotado',    count: stats.outOfStock },
  ]

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: '#0a0a0a', textTransform: 'lowercase', marginBottom: 4 }}>
          inventario
        </h1>
        <p style={{ fontSize: 13, color: M, margin: 0 }}>
          {stats.totalVariants} SKUs · {stats.totalUnits} unidades totales
        </p>
      </div>

      {/* KPI chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'total unidades', value: stats.totalUnits, color: '#0a0a0a' },
          { label: 'variantes',      value: stats.totalVariants, color: '#6b6a64' },
          { label: 'bajo stock',     value: stats.lowStock, color: stats.lowStock > 0 ? '#8a5e00' : '#9a9994' },
          { label: 'agotados',       value: stats.outOfStock, color: stats.outOfStock > 0 ? '#cc0000' : '#9a9994' },
        ].map(k => (
          <div key={k.label} style={{
            padding: '10px 16px', background: '#fff', border: `1px solid ${B}`,
            borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-mono)', color: k.color }}>{k.value}</span>
            <span style={{ fontSize: 11, color: S, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                height: 32, padding: '0 14px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${filter === tab.key ? '#0a0a0a' : B}`,
                background: filter === tab.key ? '#0a0a0a' : '#fff',
                color: filter === tab.key ? '#fff' : M,
                fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 999,
                  background: filter === tab.key ? 'rgba(255,255,255,0.25)' : 'rgba(204,0,0,0.12)',
                  color: filter === tab.key ? '#fff' : '#cc0000',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={S} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="buscar por nombre o SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 32, paddingLeft: 32, paddingRight: 12, border: `1px solid ${B}`, borderRadius: 4, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 11, color: S, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>haz clic en un SKU para editar · haz clic en el mínimo para cambiar el punto de reorden · <strong style={{ color: M }}>mínimo</strong> = alerta de bajo stock</span>
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '48px 24px', textAlign: 'center', color: M, fontSize: 13, fontStyle: 'italic' }}>
          {filter === 'all' ? 'no hay productos.' : `no hay productos con estado "${filter === 'low' ? 'bajo stock' : 'agotado'}".`}
        </div>
      ) : (
        <div>
          {filtered.map(p => (
            <ProductSection key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  )
}
