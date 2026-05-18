'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { StoreCategory, StoreSize, StoreSettings, PackagingType } from '@/lib/supabase'
import type { ShippingRate } from '@/lib/skydropx'
import {
  addCategory, updateCategory, deleteCategory, reorderCategory,
  addSize, updateSize, deleteSize, reorderSize,
  addPackaging, updatePackaging, deletePackaging, reorderPackaging,
  saveSkydropxConfig, toggleSkydropx, testShippingQuote,
  saveShipping, savePolicies, saveStripeConfig, saveSkydropxExtra,
  fetchSkydropxPackagings, fetchSkydropxClasses, fetchSkydropxBalance,
} from './actions'
import type { SatCode } from '@/lib/skydropx'
import ZipSelector from '@/components/ZipSelector'
import AdminShell from '../../AdminShell'

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)
const IconPencil = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
  </svg>
)
const IconChevUp = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
)
const IconChevDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconEyeOn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconEyeOff = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

// ── Tokens ────────────────────────────────────────────────────────────────────
const B = '#ecebe5'   // border
const M = '#6b6a64'   // muted text

// ── SavedBadge ─────────────────────────────────────────────────────────────────
function SavedBadge({ show }: { show: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, color: '#1a6b35', fontWeight: 600,
      opacity: show ? 1 : 0, transition: 'opacity 200ms',
    }}>
      <IconCheck /> guardado
    </span>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '28px 16px', textAlign: 'center', color: M, fontSize: 13, fontStyle: 'italic' }}>
      {text}
    </div>
  )
}

// ── EditableList ───────────────────────────────────────────────────────────────
function EditableList({ items, onAdd, onUpdate, onDelete, onReorder, placeholder, transform }: {
  items: { id: string; name: string }[]
  onAdd: (name: string) => Promise<void>
  onUpdate: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (id: string, dir: 'up' | 'down') => Promise<void>
  placeholder: string
  transform?: (v: string) => string
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <div style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 150ms' }}>
      <div style={{ border: `1px solid ${B}`, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
        {items.length === 0
          ? <Empty text="sin elementos" />
          : items.map((item, idx) => (
            <div key={item.id} className="adm-row" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderBottom: idx < items.length - 1 ? `1px solid ${B}` : 'none',
              background: '#fff',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                <button type="button" disabled={idx === 0}
                  onClick={() => startTransition(async () => { await onReorder(item.id, 'up'); refresh() })}
                  className="adm-btn-icon">
                  <IconChevUp />
                </button>
                <button type="button" disabled={idx === items.length - 1}
                  onClick={() => startTransition(async () => { await onReorder(item.id, 'down'); refresh() })}
                  className="adm-btn-icon">
                  <IconChevDown />
                </button>
              </div>

              {editingId === item.id
                ? <input autoFocus value={editingName}
                    onChange={e => setEditingName(transform ? transform(e.target.value) : e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') startTransition(async () => { await onUpdate(item.id, editingName); setEditingId(null); refresh() })
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="adm-inp-inline" />
                : <span style={{ flex: 1, fontSize: 14, color: '#0a0a0a' }}>{item.name}</span>
              }

              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {editingId === item.id ? (
                  <>
                    <button type="button" onClick={() => startTransition(async () => { await onUpdate(item.id, editingName); setEditingId(null); refresh() })} className="adm-btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>guardar</button>
                    <button type="button" onClick={() => setEditingId(null)} className="adm-btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>cancelar</button>
                  </>
                ) : confirmDelete === item.id ? (
                  <>
                    <button type="button" onClick={() => startTransition(async () => { await onDelete(item.id); setConfirmDelete(null); refresh() })} className="adm-btn-danger" style={{ fontSize: 11, padding: '4px 10px' }}>eliminar</button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="adm-btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>no</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { setEditingId(item.id); setEditingName(item.name) }} className="adm-btn-icon"><IconPencil /></button>
                    <button type="button" onClick={() => setConfirmDelete(item.id)} className="adm-btn-icon" style={{ color: 'rgba(255,1,0,0.5)' }}><IconTrash /></button>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={newName}
          onChange={e => setNewName(transform ? transform(e.target.value) : e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) startTransition(async () => { await onAdd(newName); setNewName(''); refresh() }) }}
          placeholder={placeholder}
          className="adm-inp"
        />
        <button type="button" disabled={!newName.trim() || isPending}
          onClick={() => startTransition(async () => { await onAdd(newName); setNewName(''); refresh() })}
          className="adm-btn-primary" style={{ padding: '9px 16px' }}>
          agregar
        </button>
      </div>
    </div>
  )
}

// ── DimFields ─────────────────────────────────────────────────────────────────
function DimFields({ pkg, onLoadSatCodes, satLoading, satError, packagings, classes }: {
  pkg?: PackagingType
  onLoadSatCodes: () => void
  satLoading: boolean
  satError: string | null
  packagings: SatCode[]
  classes: SatCode[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 10 }}>
        <label className="adm-lbl">nombre<input name="name" required defaultValue={pkg?.name ?? ''} className="adm-inp" /></label>
        <label className="adm-lbl">largo cm<input name="length_cm" type="number" step="0.1" min="0" required defaultValue={pkg?.length_cm ?? ''} className="adm-inp" /></label>
        <label className="adm-lbl">ancho cm<input name="width_cm" type="number" step="0.1" min="0" required defaultValue={pkg?.width_cm ?? ''} className="adm-inp" /></label>
        <label className="adm-lbl">alto cm<input name="height_cm" type="number" step="0.1" min="0" required defaultValue={pkg?.height_cm ?? ''} className="adm-inp" /></label>
        <label className="adm-lbl">peso g<input name="weight_grams" type="number" min="0" required defaultValue={pkg?.weight_grams ?? ''} className="adm-inp" /></label>
      </div>
      <div style={{ marginBottom: 4 }}>
        <button type="button" onClick={onLoadSatCodes} disabled={satLoading}
          className="adm-btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }}>
          {satLoading ? 'cargando…' : 'cargar catálogos SAT de Skydropx'}
        </button>
        {satError && <span style={{ fontSize: 11, color: '#cc0000', marginLeft: 8 }}>{satError}</span>}
        {(packagings.length > 0 || classes.length > 0) && (
          <span style={{ fontSize: 11, color: '#1a6b35', marginLeft: 8 }}>
            {packagings.length} embalajes · {classes.length} clases cargadas
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="adm-lbl">
          código embalaje SAT (consignment_note_packaging_code)
          {packagings.length > 0 ? (
            <select name="skydropx_package_type" defaultValue={pkg?.skydropx_package_type ?? ''} className="adm-inp">
              <option value="">— selecciona —</option>
              {packagings.map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
            </select>
          ) : (
            <input name="skydropx_package_type" defaultValue={pkg?.skydropx_package_type ?? ''} placeholder="ej. 4G" className="adm-inp" />
          )}
        </label>
        <label className="adm-lbl">
          código clase SAT (consignment_note_class_code)
          {classes.length > 0 ? (
            <select name="consignment_note" defaultValue={pkg?.consignment_note ?? ''} className="adm-inp">
              <option value="">— selecciona —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
            </select>
          ) : (
            <input name="consignment_note" defaultValue={pkg?.consignment_note ?? ''} placeholder="ej. 53131600" className="adm-inp" />
          )}
        </label>
      </div>
    </div>
  )
}

// ── PackagingList ─────────────────────────────────────────────────────────────
function PackagingList({ items }: { items: PackagingType[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [packagings, setPackagings] = useState<SatCode[]>([])
  const [classes, setClasses] = useState<SatCode[]>([])
  const [satLoading, startSatTransition] = useTransition()
  const [satError, setSatError] = useState<string | null>(null)
  const router = useRouter()
  const refresh = () => router.refresh()

  const colHdr: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: M,
    letterSpacing: '0.07em', textTransform: 'uppercase',
  }

  function handleLoadSatCodes() {
    setSatError(null)
    startSatTransition(async () => {
      const [pkgRes, clsRes] = await Promise.all([fetchSkydropxPackagings(), fetchSkydropxClasses()])
      if (pkgRes.error || clsRes.error) { setSatError(pkgRes.error ?? clsRes.error ?? 'error'); return }
      setPackagings(pkgRes.codes ?? [])
      setClasses(clsRes.codes ?? [])
    })
  }

  const dimFieldsProps = { onLoadSatCodes: handleLoadSatCodes, satLoading, satError, packagings, classes }

  return (
    <div style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 150ms' }}>
      <div style={{ border: `1px solid ${B}`, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 80px 80px 80px 80px 100px', gap: 8, padding: '9px 14px', background: '#f6f5f1', borderBottom: `1px solid ${B}` }}>
          <div /><div style={colHdr}>nombre</div><div style={colHdr}>largo</div><div style={colHdr}>ancho</div><div style={colHdr}>alto</div><div style={colHdr}>peso</div><div />
        </div>

        {items.length === 0
          ? <Empty text="sin embalajes" />
          : items.map((pkg, idx) => (
            <div key={pkg.id}>
              {editingId === pkg.id ? (
                <form style={{ padding: 14, background: '#fafaf8', borderBottom: `1px solid ${B}` }}
                  action={fd => startTransition(async () => { await updatePackaging(pkg.id, fd); setEditingId(null); refresh() })}>
                  <DimFields pkg={pkg} {...dimFieldsProps} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="submit" className="adm-btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>guardar</button>
                    <button type="button" onClick={() => setEditingId(null)} className="adm-btn-secondary">cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="adm-row" style={{
                  display: 'grid', gridTemplateColumns: '40px 2fr 80px 80px 80px 80px 100px',
                  gap: 8, alignItems: 'center', padding: '11px 14px',
                  borderBottom: idx < items.length - 1 ? `1px solid ${B}` : 'none',
                  background: '#fff',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <button type="button" disabled={idx === 0} onClick={() => startTransition(async () => { await reorderPackaging(pkg.id, 'up'); refresh() })} className="adm-btn-icon"><IconChevUp /></button>
                    <button type="button" disabled={idx === items.length - 1} onClick={() => startTransition(async () => { await reorderPackaging(pkg.id, 'down'); refresh() })} className="adm-btn-icon"><IconChevDown /></button>
                  </div>
                  <div>
                    <span style={{ fontSize: 14, color: '#0a0a0a', fontWeight: 600 }}>{pkg.name}</span>
                    {pkg.skydropx_package_type && (
                      <span style={{ fontSize: 11, color: M, marginLeft: 8 }}>sky: {pkg.skydropx_package_type}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: M }}>{pkg.length_cm}</span>
                  <span style={{ fontSize: 13, color: M }}>{pkg.width_cm}</span>
                  <span style={{ fontSize: 13, color: M }}>{pkg.height_cm}</span>
                  <span style={{ fontSize: 13, color: M }}>{pkg.weight_grams}g</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {confirmDelete === pkg.id ? (
                      <>
                        <button type="button" onClick={() => startTransition(async () => { await deletePackaging(pkg.id); setConfirmDelete(null); refresh() })} className="adm-btn-danger" style={{ fontSize: 11, padding: '4px 10px' }}>eliminar</button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className="adm-btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>no</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setEditingId(pkg.id)} className="adm-btn-icon"><IconPencil /></button>
                        <button type="button" onClick={() => setConfirmDelete(pkg.id)} className="adm-btn-icon" style={{ color: 'rgba(255,1,0,0.5)' }}><IconTrash /></button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {showAdd ? (
        <form style={{ border: `1px solid ${B}`, borderRadius: 6, padding: 16, background: '#fafaf8' }}
          action={fd => startTransition(async () => { await addPackaging(fd); setShowAdd(false); refresh() })}>
          <DimFields {...dimFieldsProps} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" className="adm-btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>agregar</button>
            <button type="button" onClick={() => setShowAdd(false)} className="adm-btn-secondary">cancelar</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowAdd(true)} className="adm-btn-secondary">
          + nuevo embalaje
        </button>
      )}
    </div>
  )
}

// ── SkydropxSection ────────────────────────────────────────────────────────────
function SkydropxSection({ settings, packaging }: { settings: StoreSettings; packaging: PackagingType[] }) {
  const [enabled, setEnabled] = useState(settings.skydropx_enabled)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [testZip, setTestZip] = useState('')
  const [testState, setTestState] = useState('')
  const [testCity, setTestCity] = useState('')
  const [testColonia, setTestColonia] = useState('')
  const [testPkg, setTestPkg] = useState(packaging[0]?.id ?? '')
  const [testRates, setTestRates] = useState<ShippingRate[] | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [testPending, startTestTransition] = useTransition()
  const [balance, setBalance] = useState<number | null>(null)
  const [balancePending, startBalanceTransition] = useTransition()
  const router = useRouter()

  function handleRefreshBalance() {
    startBalanceTransition(async () => {
      const res = await fetchSkydropxBalance()
      if (res.balance !== undefined) setBalance(res.balance)
    })
  }

  function handleToggle(val: boolean) {
    setEnabled(val)
    startTransition(async () => { await toggleSkydropx(val); router.refresh() })
  }

  function handleSave(fd: FormData) {
    startTransition(async () => {
      await saveSkydropxConfig(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    })
  }

  function handleTest() {
    if (!testZip.trim() || !testState || !testCity || !testPkg) return
    setTestRates(null); setTestError(null)
    startTestTransition(async () => {
      try {
        const rates = await testShippingQuote(testZip, testState, testCity, testColonia, testPkg)
        setTestRates(rates)
      } catch (e: unknown) {
        setTestError(e instanceof Error ? e.message : 'error')
      }
    })
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: '#aaa', paid: '#003a87', shipped: '#00c4df',
    delivered: '#1a6b35', refunded: '#ffd49a', failed: '#ff0100',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#f6f5f1', borderRadius: 6, border: `1px solid ${B}` }}>
        <button type="button" onClick={() => handleToggle(!enabled)} disabled={isPending} aria-label="activar skydropx" style={{
          width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: enabled ? '#ff0100' : '#d4d3cd',
          position: 'relative', transition: 'background 200ms', flexShrink: 0,
        }}>
          <span style={{
            position: 'absolute', top: 3, left: enabled ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>{enabled ? 'skydropx activado' : 'skydropx desactivado'}</div>
          <div style={{ fontSize: 12, color: M, marginTop: 2 }}>
            {enabled ? 'cotizaciones en tiempo real en el checkout' : 'se usan las tarifas manuales de envíos'}
          </div>
        </div>
        {enabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            {balance !== null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: balance < 200 ? '#ff0100' : '#1a6b35', fontVariantNumeric: 'tabular-nums' }}>
                {balance.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
              </span>
            )}
            <button type="button" onClick={handleRefreshBalance} disabled={balancePending}
              style={{ fontSize: 11, color: M, background: 'none', border: `1px solid ${B}`, borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
              {balancePending ? '…' : balance === null ? 'ver saldo' : 'actualizar'}
            </button>
          </div>
        )}
      </div>

      {/* Credenciales */}
      <form action={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <label className="adm-lbl">
            api key (client id)
            {settings.skydropx_client_id && <span style={{ fontSize: 10, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>activa: ···{settings.skydropx_client_id.slice(-6)}</span>}
            <input name="client_id" type="text" defaultValue={settings.skydropx_client_id} placeholder="We9LlN..." className="adm-inp" autoComplete="off" />
          </label>
          <label className="adm-lbl">
            api secret
            {settings.skydropx_client_secret && <span style={{ fontSize: 10, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>activa: ···{settings.skydropx_client_secret.slice(-6)}</span>}
            <div style={{ position: 'relative' }}>
              <input name="client_secret" type={showSecret ? 'text' : 'password'}
                defaultValue={settings.skydropx_client_secret} placeholder="5XcL63..."
                className="adm-inp" style={{ paddingRight: 44 }} autoComplete="off" />
              <button type="button" onClick={() => setShowSecret(v => !v)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: M,
                display: 'flex', alignItems: 'center', padding: 0,
              }}>
                {showSecret ? <IconEyeOff /> : <IconEyeOn />}
              </button>
            </div>
          </label>
        </div>

        <div>
          <div className="adm-lbl" style={{ marginBottom: 10 }}>remitente (origen)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label className="adm-lbl">
              nombre del remitente
              <input name="origin_name" type="text" defaultValue={settings.origin_name} placeholder="GALLO" className="adm-inp" />
            </label>
            <label className="adm-lbl">
              calle y número
              <input name="origin_street" type="text" defaultValue={settings.origin_street} placeholder="Av. Insurgentes 123" className="adm-inp" />
            </label>
            <label className="adm-lbl">
              teléfono
              <input name="origin_phone" type="tel" defaultValue={settings.origin_phone} placeholder="5512345678" className="adm-inp" />
            </label>
            <label className="adm-lbl">
              email
              <input name="origin_email" type="email" defaultValue={settings.origin_email} placeholder="envios@compadregallo.com" className="adm-inp" />
            </label>
          </div>
          <ZipSelector
            nameZip="origin_zip" nameState="origin_state" nameCity="origin_city" nameColonia="origin_colonia"
            defaultZip={settings.origin_zip} defaultState={settings.origin_state}
            defaultCity={settings.origin_city} defaultColonia={settings.origin_colonia}
            label="código postal de origen"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="submit" disabled={isPending} className="adm-btn-primary">
            {isPending ? 'guardando…' : 'guardar configuración'}
          </button>
          <SavedBadge show={saved} />
        </div>
      </form>

      {/* Test */}
      <div style={{ border: `1px solid ${B}`, borderRadius: 6, padding: 20, background: '#fafaf8' }}>
        <div className="adm-lbl" style={{ marginBottom: 16 }}>probar cotización</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start', marginBottom: 14 }}>
          <ZipSelector label="cp destino" onSelect={info => {
            setTestZip(info?.zip ?? '')
            setTestState(info?.estado ?? '')
            setTestCity(info?.municipio ?? '')
            setTestColonia(info?.colonia ?? '')
          }} />
          <label className="adm-lbl" style={{ alignSelf: 'end' }}>
            embalaje
            <select value={testPkg} onChange={e => setTestPkg(e.target.value)} className="adm-inp">
              {packaging.map(p => <option key={p.id} value={p.id}>{p.name} ({p.length_cm}×{p.width_cm}×{p.height_cm}cm · {p.weight_grams}g)</option>)}
              {packaging.length === 0 && <option value="">sin embalajes</option>}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={handleTest}
            disabled={!testZip || !testState || !testPkg || testPending || !enabled}
            className="adm-btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}>
            {testPending ? 'cotizando…' : 'cotizar'}
          </button>
          {!enabled && <span style={{ fontSize: 12, color: M }}>activa skydropx primero</span>}
        </div>

        {testError && (
          <div style={{ marginTop: 14, fontSize: 13, color: '#ff0100', background: 'rgba(255,1,0,0.05)', borderRadius: 4, padding: '10px 14px', border: '1px solid rgba(255,1,0,0.15)' }}>
            {testError}
          </div>
        )}

        {testRates && (
          <div style={{ marginTop: 14, border: `1px solid ${B}`, borderRadius: 6, overflow: 'hidden' }}>
            {testRates.length === 0
              ? <div style={{ padding: '14px', fontSize: 13, color: M }}>sin opciones disponibles para ese CP</div>
              : testRates.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderBottom: i < testRates.length - 1 ? `1px solid ${B}` : 'none',
                  background: '#fff',
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0a0a0a' }}>{r.carrier}</span>
                    {r.service_level && <span style={{ fontSize: 12, color: M, marginLeft: 8 }}>{r.service_level}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {r.days && <span style={{ fontSize: 12, color: M }}>{r.days}d</span>}
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0a0a0a', fontVariantNumeric: 'tabular-nums' }}>
                      {r.total_mxn.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
      {/* Markup + carriers */}
      <form action={fd => startTransition(async () => { await saveSkydropxExtra(fd); setSaved(true); setTimeout(() => setSaved(false), 2500); router.refresh() })}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: `1px solid ${B}`, paddingTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase' }}>ajustes de tarifa</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <label className="adm-lbl">
            markup % (comisión + diferencias)
            <input name="markup_pct" type="number" step="0.1" min="0" max="50"
              defaultValue={settings.skydropx_markup_pct ?? 0} className="adm-inp" />
            <span style={{ fontSize: 11, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              ej. 5 = +5% sobre la tarifa de SkyDropX
            </span>
          </label>
          <label className="adm-lbl">
            paqueterías a mostrar
            <input name="allowed_carriers" type="text"
              defaultValue={(settings.skydropx_allowed_carriers ?? []).join(', ')}
              placeholder="FedEx, DHL, Estafeta (vacío = todas)"
              className="adm-inp" />
            <span style={{ fontSize: 11, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              separadas por coma. vacío muestra todas.
            </span>
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="submit" disabled={isPending} className="adm-btn-primary">guardar ajustes</button>
          <SavedBadge show={saved} />
        </div>
      </form>

      {/* suppresses unused import warning */}
      <span style={{ display: 'none' }}>{JSON.stringify(STATUS_COLOR)}</span>
    </div>
  )
}

// ── StripeSection ─────────────────────────────────────────────────────────────
function StripeSection({ settings }: { settings: StoreSettings }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [testMode, setTestMode] = useState(settings.stripe_test_mode ?? true)
  const [showSk, setShowSk] = useState(false)
  const router = useRouter()

  function handleSave(fd: FormData) {
    fd.set('test_mode', testMode ? 'true' : 'false')
    startTransition(async () => {
      await saveStripeConfig(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    })
  }

  const hint = (v: string, n = 8) => v && v.length > n ? `···${v.slice(-6)}` : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#f6f5f1', borderRadius: 6, border: `1px solid ${B}` }}>
        <button type="button" onClick={() => setTestMode(v => !v)} style={{
          width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: testMode ? '#ffd49a' : '#1a6b35',
          position: 'relative', transition: 'background 200ms', flexShrink: 0,
        }}>
          <span style={{
            position: 'absolute', top: 3, left: testMode ? 3 : 23,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>
            {testMode ? 'modo prueba (test)' : 'modo producción (live)'}
          </div>
          <div style={{ fontSize: 12, color: M, marginTop: 2 }}>
            {testMode
              ? 'usa keys sk_test_... y pk_test_... — no cobra real'
              : 'usa keys sk_live_... y pk_live_... — cobra real'}
          </div>
        </div>
        {!testMode && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#1a6b35', background: 'rgba(26,107,53,0.1)', padding: '3px 10px', borderRadius: 999 }}>
            LIVE
          </span>
        )}
      </div>

      <form action={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Test keys */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            keys de prueba (test)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="adm-lbl">
              publishable key (pk_test_...)
              {hint(settings.stripe_pk_test) && <span style={{ fontSize: 10, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>activa: {hint(settings.stripe_pk_test)}</span>}
              <input name="pk_test" type="text" defaultValue={settings.stripe_pk_test} placeholder="pk_test_..." className="adm-inp" autoComplete="off" />
            </label>
            <label className="adm-lbl">
              secret key (sk_test_...)
              {hint(settings.stripe_sk_test) && <span style={{ fontSize: 10, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>activa: {hint(settings.stripe_sk_test)}</span>}
              <input name="sk_test" type="password" defaultValue={settings.stripe_sk_test} placeholder="sk_test_..." className="adm-inp" autoComplete="off" />
            </label>
          </div>
        </div>

        {/* Live keys */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: M, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            keys de producción (live)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="adm-lbl">
              publishable key (pk_live_...)
              {hint(settings.stripe_pk_live) && <span style={{ fontSize: 10, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>activa: {hint(settings.stripe_pk_live)}</span>}
              <input name="pk_live" type="text" defaultValue={settings.stripe_pk_live} placeholder="pk_live_..." className="adm-inp" autoComplete="off" />
            </label>
            <label className="adm-lbl">
              secret key (sk_live_...)
              {hint(settings.stripe_sk_live) && <span style={{ fontSize: 10, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>activa: {hint(settings.stripe_sk_live)}</span>}
              <div style={{ position: 'relative' }}>
                <input name="sk_live" type={showSk ? 'text' : 'password'} defaultValue={settings.stripe_sk_live}
                  placeholder="sk_live_..." className="adm-inp" style={{ paddingRight: 44 }} autoComplete="off" />
                <button type="button" onClick={() => setShowSk(v => !v)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: M, display: 'flex', alignItems: 'center', padding: 0,
                }}>
                  {showSk ? <IconEyeOff /> : <IconEyeOn />}
                </button>
              </div>
            </label>
          </div>
        </div>

        {/* Webhook + extras */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <label className="adm-lbl" style={{ gridColumn: '1/3' }}>
            webhook secret (whsec_...)
            {hint(settings.stripe_webhook_secret) && <span style={{ fontSize: 10, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>activa: {hint(settings.stripe_webhook_secret)}</span>}
            <input name="webhook_secret" type="password" defaultValue={settings.stripe_webhook_secret} placeholder="whsec_..." className="adm-inp" autoComplete="off" />
          </label>
          <label className="adm-lbl">
            descriptor (22 chars)
            <input name="statement_desc" type="text" maxLength={22}
              defaultValue={settings.stripe_statement_desc || 'GALLO'} className="adm-inp" />
            <span style={{ fontSize: 11, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              aparece en el estado de cuenta del cliente
            </span>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <label className="adm-lbl">
            markup % (comisión pasarela)
            <input name="markup_pct" type="number" step="0.1" min="0" max="10"
              defaultValue={settings.stripe_markup_pct ?? 0} className="adm-inp" />
            <span style={{ fontSize: 11, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              ej. 3.6 = agrega 3.6% al total (Stripe cobra ~3.6% en MX)
            </span>
          </label>
          <div style={{ background: 'rgba(0,58,135,0.04)', border: '1px solid rgba(0,58,135,0.12)', borderRadius: 6, padding: '14px 16px', fontSize: 12, color: M, lineHeight: 1.7 }}>
            <strong style={{ color: '#003a87', display: 'block', marginBottom: 6 }}>¿cómo funciona?</strong>
            Si el carrito suma $500 MXN con 3.6% de markup, el cliente paga $518 MXN.
            Los $18 cubren la comisión de Stripe (3.6% + IVA).<br />
            Las keys de DB tienen prioridad sobre las variables de entorno de Vercel.
            Si dejas los campos vacíos, se usan las env vars.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 4 }}>
          <button type="submit" disabled={isPending} className="adm-btn-primary">
            {isPending ? 'guardando…' : 'guardar configuración stripe'}
          </button>
          <SavedBadge show={saved} />
        </div>
      </form>
    </div>
  )
}

// ── ShippingSection ────────────────────────────────────────────────────────────
function ShippingSection({ settings }: { settings: StoreSettings }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const toP = (c: number) => (c / 100).toFixed(2)

  return (
    <form action={fd => startTransition(async () => { await saveShipping(fd); setSaved(true); setTimeout(() => setSaved(false), 2500); router.refresh() })}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <label className="adm-lbl">envío CDMX (MXN)<input name="shipping_local" type="number" step="0.01" min="0" required defaultValue={toP(settings.shipping_local_mxn)} className="adm-inp" /></label>
        <label className="adm-lbl">envío nacional (MXN)<input name="shipping_national" type="number" step="0.01" min="0" required defaultValue={toP(settings.shipping_national_mxn)} className="adm-inp" /></label>
        <label className="adm-lbl">envío internacional (MXN)<input name="shipping_intl" type="number" step="0.01" min="0" required defaultValue={toP(settings.shipping_intl_mxn)} className="adm-inp" /></label>
        <label className="adm-lbl">
          gratis a partir de (MXN)
          <input name="shipping_free_threshold" type="number" step="0.01" min="0" required defaultValue={toP(settings.shipping_free_threshold_mxn)} className="adm-inp" />
          <span style={{ fontSize: 11, color: M, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>pon 0 para desactivar</span>
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="submit" disabled={isPending} className="adm-btn-primary">{isPending ? 'guardando…' : 'guardar tarifas'}</button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}

// ── PoliciesSection ────────────────────────────────────────────────────────────
function PoliciesSection({ settings }: { settings: StoreSettings }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  return (
    <form action={fd => startTransition(async () => { await savePolicies(fd); setSaved(true); setTimeout(() => setSaved(false), 2500); router.refresh() })}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label className="adm-lbl">
        política de devoluciones
        <textarea name="return_policy" rows={4} defaultValue={settings.return_policy}
          placeholder="ej. aceptamos devoluciones dentro de 15 días..."
          className="adm-inp" style={{ resize: 'vertical' }} />
      </label>
      <label className="adm-lbl">
        política de envíos
        <textarea name="shipping_policy" rows={4} defaultValue={settings.shipping_policy}
          placeholder="ej. enviamos en 3–5 días hábiles..."
          className="adm-inp" style={{ resize: 'vertical' }} />
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="submit" disabled={isPending} className="adm-btn-primary">{isPending ? 'guardando…' : 'guardar políticas'}</button>
        <SavedBadge show={saved} />
      </div>
    </form>
  )
}

// ── SectionCard ────────────────────────────────────────────────────────────────
function SectionCard({ id, title, desc, children }: { id: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ background: '#fff', border: `1px solid ${B}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${B}`, background: '#f6f5f1' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900,
          letterSpacing: '-0.02em', color: '#0a0a0a', marginBottom: 3, textTransform: 'lowercase',
        }}>{title}</h2>
        <p style={{ fontSize: 12, color: M, margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </section>
  )
}

// ── NAV ────────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'stripe',     label: 'stripe' },
  { id: 'skydropx',   label: 'skydropx' },
  { id: 'embalajes',  label: 'embalajes' },
  { id: 'categorias', label: 'categorías' },
  { id: 'tallas',     label: 'tallas' },
  { id: 'tarifas',    label: 'tarifas' },
  { id: 'politicas',  label: 'políticas' },
]

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ConfiguracionAdmin({ categories, sizes, packaging, settings }: {
  categories: StoreCategory[]
  sizes: StoreSize[]
  packaging: PackagingType[]
  settings: StoreSettings
}) {
  return (
    <AdminShell
      crumb="tienda / configuración"
      crumbHref="/casa/tienda"
      right={
        <a href="/casa/tienda" style={{ fontSize: 13, color: '#9a9994', textDecoration: 'none' }}>
          ← tienda
        </a>
      }
    >
      <div style={{ display: 'flex', maxWidth: 980, margin: '0 auto', padding: '0 24px' }}>

        {/* Sidebar */}
        <aside style={{
          width: 176, flexShrink: 0, paddingTop: 32, paddingRight: 16,
          position: 'sticky', top: 56, height: 'calc(100vh - 56px)',
          overflowY: 'auto', borderRight: `1px solid ${B}`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#bcbbb5', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 8 }}>
            secciones
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(item => (
              <a key={item.id} href={`#${item.id}`} className="adm-nav-link">{item.label}</a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, paddingLeft: 32, paddingTop: 32, paddingBottom: 80 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <SectionCard id="stripe" title="stripe"
              desc="pasarela de pagos. stripe.com → developers → api keys. en producción cobra 3.6% + IVA por transacción en México.">
              <StripeSection settings={settings} />
            </SectionCard>

            <SectionCard id="skydropx" title="skydropx"
              desc="cotización automática. credenciales en pro.skydropx.com → api → credenciales de aplicación.">
              <SkydropxSection settings={settings} packaging={packaging} />
            </SectionCard>

            <SectionCard id="embalajes" title="embalajes"
              desc="tipos de caja o sobre que usas. cada producto elige uno para calcular el envío.">
              <PackagingList items={packaging} />
            </SectionCard>

            <SectionCard id="categorias" title="categorías"
              desc="organiza tu catálogo. se guardan en minúsculas con guiones.">
              <EditableList items={categories} onAdd={addCategory} onUpdate={updateCategory}
                onDelete={deleteCategory} onReorder={reorderCategory}
                placeholder="nueva categoría" transform={v => v.toLowerCase().replace(/\s+/g, '-')} />
            </SectionCard>

            <SectionCard id="tallas" title="tallas"
              desc="el orden aquí determina el orden en los formularios.">
              <EditableList items={sizes} onAdd={addSize} onUpdate={updateSize}
                onDelete={deleteSize} onReorder={reorderSize}
                placeholder="nueva talla" transform={v => v.toUpperCase()} />
            </SectionCard>

            <SectionCard id="tarifas" title="tarifas manuales"
              desc="se usan cuando skydropx está desactivado.">
              <ShippingSection settings={settings} />
            </SectionCard>

            <SectionCard id="politicas" title="políticas"
              desc="texto que aparece en checkout y en ayuda.">
              <PoliciesSection settings={settings} />
            </SectionCard>

          </div>
        </main>
      </div>
    </AdminShell>
  )
}
