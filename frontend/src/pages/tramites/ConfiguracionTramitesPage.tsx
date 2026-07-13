import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import { tramitesService, Categoria, TipoTramite } from '@/services/tramites.service'
import { organizacionService } from '@/services/organizacion.service'
import { Plus, X, Edit3, Tag, ClipboardList } from 'lucide-react'

function ModalCategoria({ categoria, onClose }: { categoria?: Categoria; onClose: () => void }) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Categoria>>(categoria ?? { codigo: '', nombre: '', activo: true })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: Partial<Categoria>) =>
      categoria ? tramitesService.actualizarCategoria(categoria.id, data) : tramitesService.crearCategoria(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.rowSub, marginBottom: 6 }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 16, width: '100%', maxWidth: 448, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: `1px solid ${T.rowBd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${T.rowBd}` }}>
          <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>{categoria ? 'Editar categoría' : 'Nueva categoría'}</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}><X size={16} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
          <div>
            <label style={labelStyle}>Código *</label>
            <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
              placeholder="Ej: ADM" value={form.codigo ?? ''} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
              placeholder="Nombre de la categoría" value={form.nombre ?? ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: `1px solid ${T.rowBd}` }}>
          <button onClick={onClose} style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => { if (!form.codigo || !form.nombre) { setError('Completa los campos obligatorios'); return }; mutation.mutate(form) }}
            disabled={mutation.isPending}
            style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
            {categoria ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalTipo({ tipo, onClose }: { tipo?: TipoTramite; onClose: () => void }) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, any>>(tipo ?? {
    dias_plazo: 15, costo: 0, requiere_inspeccion: false, en_linea: false, activo: true,
  })
  const [error, setError] = useState('')

  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: tramitesService.categorias })
  const { data: unidades }   = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const mutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      tipo ? tramitesService.actualizarTipo(tipo.id, data) : tramitesService.crearTipo(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tipos'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.rowSub, marginBottom: 6 }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 16, width: '100%', maxWidth: 512, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: `1px solid ${T.rowBd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${T.rowBd}`, flexShrink: 0 }}>
          <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>{tipo ? 'Editar tipo de trámite' : 'Nuevo tipo de trámite'}</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}><X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Código *</label>
              <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                placeholder="Ej: ADM-001" value={form.codigo ?? ''} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Categoría *</label>
              <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                value={form.categoria ?? ''} onChange={e => setForm(f => ({ ...f, categoria: Number(e.target.value) }))}>
                <option value="">— Selecciona —</option>
                {categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nombre *</label>
            <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
              placeholder="Nombre del tipo de trámite" value={form.nombre ?? ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>

          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea className="w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none" style={inputStyle}
              rows={2} value={form.descripcion ?? ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Días de plazo *</label>
              <input type="number" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                value={form.dias_plazo ?? 15} onChange={e => setForm(f => ({ ...f, dias_plazo: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={labelStyle}>Costo (USD)</label>
              <input type="number" step="0.01" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                value={form.costo ?? 0} onChange={e => setForm(f => ({ ...f, costo: Number(e.target.value) }))} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Unidad responsable *</label>
            <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
              value={form.unidad_responsable ?? ''} onChange={e => setForm(f => ({ ...f, unidad_responsable: Number(e.target.value) }))}>
              <option value="">— Selecciona —</option>
              {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {[['requiere_inspeccion', 'Requiere inspección'], ['en_linea', 'Disponible en línea']].map(([k, l]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: T.rowTxt }}>
                <input type="checkbox" checked={form[k] ?? false} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))}
                  className="w-4 h-4" style={{ accentColor: T.accentDk }} />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: `1px solid ${T.rowBd}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => { if (!form.codigo || !form.nombre || !form.categoria || !form.unidad_responsable) { setError('Completa los campos obligatorios'); return }; mutation.mutate(form) }}
            disabled={mutation.isPending}
            style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
            {tipo ? 'Guardar cambios' : 'Crear tipo de trámite'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracionTramitesPage() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const [tab, setTab] = useState<'tipos' | 'categorias'>('tipos')
  const [modalCategoria, setModalCategoria] = useState<{ open: boolean; categoria?: Categoria }>({ open: false })
  const [modalTipo, setModalTipo]           = useState<{ open: boolean; tipo?: TipoTramite }>({ open: false })

  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: tramitesService.categorias })
  const { data: tipos }      = useQuery({ queryKey: ['tipos'],      queryFn: () => tramitesService.tipos() })

  return (
    <div>
      {modalCategoria.open && <ModalCategoria categoria={modalCategoria.categoria} onClose={() => setModalCategoria({ open: false })} />}
      {modalTipo.open && <ModalTipo tipo={modalTipo.tipo} onClose={() => setModalTipo({ open: false })} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.rowTxt }}>Configuración de trámites</h1>
          <p style={{ fontSize: 14, color: T.rowSub, marginTop: 2 }}>Administra categorías y tipos de trámite disponibles</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[['tipos','Tipos de trámite'],['categorias','Categorías']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: tab === k ? T.accentDk : T.rowHv,
                color: tab === k ? '#fff' : T.rowSub }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === 'categorias' ? (
        <div style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.rowBd}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.rowTxt }}>{categorias?.length ?? 0} categorías</span>
            <button onClick={() => setModalCategoria({ open: true })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
              <Plus size={13} /> Nueva categoría
            </button>
          </div>
          <div>
            {categorias?.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.rowBd}`, transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tag size={14} style={{ color: T.rowSub }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: T.rowTxt, margin: 0 }}>{c.nombre}</p>
                    <p style={{ fontSize: 11, color: T.rowSub, fontFamily: 'monospace', margin: 0 }}>{c.codigo}</p>
                  </div>
                </div>
                <button onClick={() => setModalCategoria({ open: true, categoria: c })}
                  style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub, background: T.rowBg, cursor: 'pointer' }}>
                  <Edit3 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.rowBd}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.rowTxt }}>{tipos?.length ?? 0} tipos de trámite</span>
            <button onClick={() => setModalTipo({ open: true })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
              <Plus size={13} /> Nuevo tipo de trámite
            </button>
          </div>
          {(tipos ?? []).length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: T.rowSub }}>
              <ClipboardList size={28} style={{ opacity: .4, marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>No hay tipos de trámite configurados todavía</p>
            </div>
          ) : (
            <div>
              {tipos?.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.rowBd}`, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: T.rowTxt, margin: 0 }}>{t.nombre}</p>
                    <p style={{ fontSize: 11, color: T.rowSub, marginTop: 2 }}>
                      {t.categoria_nombre} · {t.unidad_responsable_siglas} · {t.dias_plazo} días
                      {t.costo > 0 && ` · $${t.costo}`}
                    </p>
                  </div>
                  <button onClick={() => setModalTipo({ open: true, tipo: t })}
                    style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub, background: T.rowBg, cursor: 'pointer' }}>
                    <Edit3 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
