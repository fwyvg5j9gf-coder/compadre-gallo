'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createManualOrder, lookupUser, type ManualItem } from './actions'
import AdminShell from '../../AdminShell'

type ProductOption = {
  id: string
  name: string
  price_mxn: number
  weight_grams: number | null
  is_published: boolean
  product_variants: { id: string; size: string; stock: number }[]
}

const B = '#e8e7e1'
const M = '#6b6a64'
const S = '#9a9994'

const inp: React.CSSProperties = {
  padding: '8px 10px', border: `1px solid ${B}`, borderRadius: 4,
  fontSize: 14, color: '#0a0a0a', background: '#fff', outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
}
const lbl: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  fontSize: 12, fontWeight: 600, color: M, letterSpacing: '0.03em',
}

let _id = 0
function uid() { return String(++_id) }

function ItemRow({
  item, products, onChange, onRemove,
}: {
  item: { _key: string } & ManualItem
  products: ProductOption[]
  onChange: (updated: ManualItem) => void
  onRemove: () => void
}) {
  const product = products.find(p => p.id === item.productId)
  const variants = product?.product_variants ?? []
  const hasSizes = variants.length > 0 && !(variants.length === 1 && variants[0].size === 'única')

  function selectProduct(productId: string) {
    const p = products.find(x => x.id === productId)
    if (!p) { onChange({ ...item, productId: '', productName: '', variantId: null, size: null, unitPriceMxn: 0 }); return }
    const firstVariant = p.product_variants[0]
    const size = firstVariant?.size === 'única' ? null : (firstVariant?.size ?? null)
    const variantId = firstVariant?.id ?? null
    onChange({ ...item, productId: p.id, productName: p.name, variantId, size, unitPriceMxn: p.price_mxn })
  }

  function selectSize(size: string) {
    const v = variants.find(x => x.size === size)
    onChange({ ...item, size, variantId: v?.id ?? null })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 60px 110px 32px', gap: 8, alignItems: 'end' }}>
      <label style={lbl}>
        producto
        <select value={item.productId} onChange={e => selectProduct(e.target.value)} style={inp}>
          <option value="">— seleccionar —</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.is_published ? '' : '[borrador] '}{p.name}</option>
          ))}
        </select>
      </label>

      {hasSizes ? (
        <label style={lbl}>
          talla
          <select value={item.size ?? ''} onChange={e => selectSize(e.target.value)} style={inp}>
            {variants.map(v => (
              <option key={v.size} value={v.size}>{v.size} ({v.stock} pzs)</option>
            ))}
          </select>
        </label>
      ) : (
        <div />
      )}

      <label style={lbl}>
        cant.
        <input
          type="number" min="1" value={item.quantity}
          onChange={e => onChange({ ...item, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
          style={{ ...inp, textAlign: 'center' }}
        />
      </label>

      <label style={lbl}>
        precio unit. ($)
        <input
          type="number" min="0" step="0.01"
          value={(item.unitPriceMxn / 100).toFixed(2)}
          onChange={e => onChange({ ...item, unitPriceMxn: Math.round(parseFloat(e.target.value || '0') * 100) })}
          style={{ ...inp, textAlign: 'right' }}
        />
      </label>

      <button
        type="button"
        onClick={onRemove}
        style={{ background: 'rgba(255,1,0,0.07)', border: 'none', borderRadius: 4, width: 32, height: 36, cursor: 'pointer', color: '#ff0100', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        ×
      </button>
    </div>
  )
}

export default function NuevoOrden({ products }: { products: ProductOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingLookup, startLookup] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isTest, setIsTest] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  // customer fields (controlled so lookup can pre-fill them)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [addrStreet, setAddrStreet] = useState('')
  const [addrColonia, setAddrColonia] = useState('')
  const [addrZip, setAddrZip] = useState('')
  const [addrCity, setAddrCity] = useState('')
  const [addrState, setAddrState] = useState('')
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [items, setItems] = useState<({ _key: string } & ManualItem)[]>([
    { _key: uid(), productId: '', productName: '', variantId: null, size: null, quantity: 1, unitPriceMxn: 0 },
  ])

  const subtotal = items.reduce((s, i) => s + i.unitPriceMxn * i.quantity, 0)
  const fmt = (c: number) => (c / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  function handleLookup() {
    setLookupError(null)
    startLookup(async () => {
      const { data, error: err } = await lookupUser(lookupQuery)
      if (err || !data) { setLookupError(err ?? 'no encontrado'); return }
      setCustomerEmail(data.email)
      setCustomerName(data.name ?? '')
      setCustomerPhone(data.phone ?? '')
      if (data.address) {
        setAddrStreet(data.address.street ?? '')
        setAddrColonia(data.address.colonia ?? '')
        setAddrZip(data.address.zip ?? '')
        setAddrCity(data.address.city ?? '')
        setAddrState(data.address.state ?? '')
        setShowAddress(true)
      }
    })
  }

  function addItem() {
    setItems(prev => [...prev, { _key: uid(), productId: '', productName: '', variantId: null, size: null, quantity: 1, unitPriceMxn: 0 }])
  }

  function updateItem(key: string, data: ManualItem) {
    setItems(prev => prev.map(i => i._key === key ? { ...data, _key: key } : i))
  }

  function removeItem(key: string) {
    setItems(prev => prev.filter(i => i._key !== key))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const cleanItems = items.filter(i => i.productId)
    if (cleanItems.length === 0) { setError('agrega al menos un producto'); return }

    fd.set('items_json', JSON.stringify(cleanItems.map(({ _key: _, ...rest }) => rest)))
    fd.set('is_test', isTest ? '1' : '0')

    startTransition(async () => {
      const { orderId, error: err } = await createManualOrder(fd)
      if (err || !orderId) { setError(err ?? 'error desconocido'); return }
      router.push(`/casa/ordenes/${orderId}`)
    })
  }

  const shippingMxnInput = { ...inp, width: 120 }

  return (
    <AdminShell crumb="nueva orden" crumbHref="/casa/ordenes">
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 32px' }}>

        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', color: '#0a0a0a' }}>
            nueva orden
          </h1>
          {isTest && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,226,0,0.25)', color: '#7a6000', letterSpacing: '0.04em', border: '1px solid rgba(255,226,0,0.5)' }}>
              PRUEBA
            </span>
          )}
        </div>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ff0100', borderRadius: 4, padding: '12px 16px', fontSize: 13, color: '#cc0000', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Orden de prueba toggle */}
          <div style={{ background: isTest ? 'rgba(255,226,0,0.08)' : '#fff', border: `1px solid ${isTest ? 'rgba(255,226,0,0.4)' : B}`, borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setIsTest(v => !v)}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0a0a0a' }}>orden de prueba</div>
              <div style={{ fontSize: 12, color: M, marginTop: 2 }}>no afecta estadísticas reales, se marca con badge &quot;PRUEBA&quot; en la lista</div>
            </div>
            <div style={{
              width: 44, height: 24, borderRadius: 999, background: isTest ? '#ffe200' : '#d4d3cd',
              position: 'relative', transition: 'background 0.15s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 3, left: isTest ? 23 : 3, width: 18, height: 18,
                borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.15s',
              }} />
            </div>
          </div>

          {/* Cliente */}
          <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>cliente</div>

            {/* Buscador de cliente registrado */}
            <div style={{ marginBottom: 16, padding: '12px 14px', background: '#f6f5f1', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: M }}>cargar cliente registrado</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={lookupQuery}
                  onChange={e => setLookupQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
                  placeholder="nombre, correo o username..."
                  style={{ ...inp, flex: 1, background: '#fff' }}
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={pendingLookup || !lookupQuery.trim()}
                  style={{ height: 36, padding: '0 16px', background: '#003a87', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (!lookupQuery.trim() || pendingLookup) ? 0.5 : 1 }}
                >
                  {pendingLookup ? '…' : 'cargar'}
                </button>
              </div>
              {lookupError && <p style={{ fontSize: 12, color: '#cc0000', margin: 0 }}>{lookupError}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <label style={lbl}>
                correo *
                <input name="customer_email" type="email" required value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} style={inp} placeholder="correo@ejemplo.com" />
              </label>
              <label style={lbl}>
                nombre
                <input name="customer_name" value={customerName} onChange={e => setCustomerName(e.target.value)} style={inp} placeholder="Nombre Apellido" />
              </label>
              <label style={lbl}>
                teléfono
                <input name="customer_phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={inp} placeholder="55 1234 5678" />
              </label>
            </div>
          </div>

          {/* Productos */}
          <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>productos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(item => (
                <ItemRow
                  key={item._key}
                  item={item}
                  products={products}
                  onChange={data => updateItem(item._key, data)}
                  onRemove={() => removeItem(item._key)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              style={{ marginTop: 12, background: 'transparent', border: `1px dashed ${B}`, borderRadius: 4, padding: '8px 16px', fontSize: 13, color: M, cursor: 'pointer', width: '100%' }}
            >
              + agregar producto
            </button>
          </div>

          {/* Envío */}
          <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>envío</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
              <label style={lbl}>
                costo de envío ($)
                <input name="shipping_mxn" type="number" min="0" step="0.01" defaultValue="0" style={shippingMxnInput} />
              </label>
              <button
                type="button"
                onClick={() => setShowAddress(v => !v)}
                style={{ height: 36, padding: '0 14px', border: `1px solid ${B}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, color: M, whiteSpace: 'nowrap' }}
              >
                {showAddress ? '− ocultar dirección' : '+ agregar dirección'}
              </button>
            </div>
            {showAddress && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                <label style={{ ...lbl, gridColumn: '1 / -1' }}>
                  calle y número
                  <input name="addr_street" value={addrStreet} onChange={e => setAddrStreet(e.target.value)} style={inp} placeholder="Av. Insurgentes 123" />
                </label>
                <label style={lbl}>
                  colonia
                  <input name="addr_colonia" value={addrColonia} onChange={e => setAddrColonia(e.target.value)} style={inp} placeholder="Roma Norte" />
                </label>
                <label style={lbl}>
                  C.P.
                  <input name="addr_zip" value={addrZip} onChange={e => setAddrZip(e.target.value)} style={inp} placeholder="06700" />
                </label>
                <label style={lbl}>
                  ciudad
                  <input name="addr_city" value={addrCity} onChange={e => setAddrCity(e.target.value)} style={inp} placeholder="Ciudad de México" />
                </label>
                <label style={lbl}>
                  estado
                  <input name="addr_state" value={addrState} onChange={e => setAddrState(e.target.value)} style={inp} placeholder="CDMX" />
                </label>
              </div>
            )}
          </div>

          {/* Estado + notas */}
          <div style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>detalles</div>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12 }}>
              <label style={lbl}>
                estado inicial
                <select name="status" defaultValue="paid" style={inp}>
                  <option value="paid">pagado</option>
                  <option value="pending">pendiente</option>
                  <option value="shipped">enviado</option>
                </select>
              </label>
              <label style={lbl}>
                notas internas
                <input name="notes" style={inp} placeholder="ej. pago en efectivo, entrega en tienda..." />
              </label>
            </div>
          </div>

          {/* Resumen + submit */}
          <div style={{ background: '#f6f5f1', border: `1px solid ${B}`, borderRadius: 8, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ fontSize: 14, color: M }}>
              {items.filter(i => i.productId).length} producto(s) ·{' '}
              <span style={{ fontWeight: 700, color: '#0a0a0a', fontFamily: 'monospace' }}>{fmt(subtotal)}</span>
              <span style={{ color: S }}> subtotal</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => router.push('/casa/ordenes')}
                style={{ height: 40, padding: '0 20px', border: `1px solid ${B}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 14, color: M }}
              >
                cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                style={{ height: 40, padding: '0 24px', background: '#ff0100', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                {isPending ? 'creando…' : 'crear orden'}
              </button>
            </div>
          </div>

        </form>
      </main>
    </AdminShell>
  )
}
