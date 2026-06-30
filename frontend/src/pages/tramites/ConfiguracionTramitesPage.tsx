import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tramitesService, Categoria, TipoTramite } from '@/services/tramites.service'
import { organizacionService } from '@/services/organizacion.service'
import { Settings, Plus, X, Edit3, Tag, ClipboardList } from 'lucide-react'

function ModalCategoria({ categoria, onClose }: { categoria?: Categoria; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Categoria>>(categoria ?? { codigo: '', nombre: '', activo: true })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: Partial<Categoria>) =>
      categoria ? tramitesService.actualizarCategoria(categoria.id, data) : tramitesService.crearCategoria(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">{categoria ? 'Editar categoría' : 'Nueva categoría'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Código *</label>
            <input className={cls} placeholder="Ej: ADM" value={form.codigo ?? ''} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nombre *</label>
            <input className={cls} placeholder="Nombre de la categoría" value={form.nombre ?? ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => { if (!form.codigo || !form.nombre) { setError('Completa los campos obligatorios'); return }; mutation.mutate(form) }}
            disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: '#002f6c' }}>
            {categoria ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalTipo({ tipo, onClose }: { tipo?: TipoTramite; onClose: () => void }) {
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

  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">{tipo ? 'Editar tipo de trámite' : 'Nuevo tipo de trámite'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Código *</label>
              <input className={cls} placeholder="Ej: ADM-001" value={form.codigo ?? ''} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Categoría *</label>
              <select className={cls} value={form.categoria ?? ''} onChange={e => setForm(f => ({ ...f, categoria: Number(e.target.value) }))}>
                <option value="">— Selecciona —</option>
                {categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nombre *</label>
            <input className={cls} placeholder="Nombre del tipo de trámite" value={form.nombre ?? ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Descripción</label>
            <textarea className={cls + ' resize-none'} rows={2} value={form.descripcion ?? ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Días de plazo *</label>
              <input type="number" className={cls} value={form.dias_plazo ?? 15} onChange={e => setForm(f => ({ ...f, dias_plazo: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Costo (USD)</label>
              <input type="number" step="0.01" className={cls} value={form.costo ?? 0} onChange={e => setForm(f => ({ ...f, costo: Number(e.target.value) }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad responsable *</label>
            <select className={cls} value={form.unidad_responsable ?? ''} onChange={e => setForm(f => ({ ...f, unidad_responsable: Number(e.target.value) }))}>
              <option value="">— Selecciona —</option>
              {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input type="checkbox" checked={form.requiere_inspeccion ?? false}
                onChange={e => setForm(f => ({ ...f, requiere_inspeccion: e.target.checked }))}
                className="w-4 h-4" style={{ accentColor: '#002f6c' }} />
              Requiere inspección
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input type="checkbox" checked={form.en_linea ?? false}
                onChange={e => setForm(f => ({ ...f, en_linea: e.target.checked }))}
                className="w-4 h-4" style={{ accentColor: '#002f6c' }} />
              Disponible en línea
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => {
              if (!form.codigo || !form.nombre || !form.categoria || !form.unidad_responsable) { setError('Completa los campos obligatorios'); return }
              mutation.mutate(form)
            }}
            disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: '#002f6c' }}>
            {tipo ? 'Guardar cambios' : 'Crear tipo de trámite'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracionTramitesPage() {
  const [tab, setTab] = useState<'tipos' | 'categorias'>('tipos')
  const [modalCategoria, setModalCategoria] = useState<{ open: boolean; categoria?: Categoria }>({ open: false })
  const [modalTipo, setModalTipo]           = useState<{ open: boolean; tipo?: TipoTramite }>({ open: false })

  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: tramitesService.categorias })
  const { data: tipos }      = useQuery({ queryKey: ['tipos'], queryFn: () => tramitesService.tipos() })

  return (
    <div>
      {modalCategoria.open && <ModalCategoria categoria={modalCategoria.categoria} onClose={() => setModalCategoria({ open: false })} />}
      {modalTipo.open && <ModalTipo tipo={modalTipo.tipo} onClose={() => setModalTipo({ open: false })} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuración de trámites</h1>
          <p className="text-sm text-gray-400 mt-0.5">Administra categorías y tipos de trámite disponibles</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('tipos')}
            className="px-3 py-2 text-xs font-semibold rounded-xl"
            style={{ background: tab === 'tipos' ? '#002f6c' : '#f3f4f6', color: tab === 'tipos' ? '#fff' : '#6b7280' }}>
            Tipos de trámite
          </button>
          <button onClick={() => setTab('categorias')}
            className="px-3 py-2 text-xs font-semibold rounded-xl"
            style={{ background: tab === 'categorias' ? '#002f6c' : '#f3f4f6', color: tab === 'categorias' ? '#fff' : '#6b7280' }}>
            Categorías
          </button>
        </div>
      </div>

      {tab === 'categorias' ? (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">{categorias?.length ?? 0} categorías</span>
            <button onClick={() => setModalCategoria({ open: true })}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white rounded-xl" style={{ background: '#002f6c' }}>
              <Plus size={13} /> Nueva categoría
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {categorias?.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Tag size={14} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{c.codigo}</p>
                  </div>
                </div>
                <button onClick={() => setModalCategoria({ open: true, categoria: c })}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
                  <Edit3 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">{tipos?.length ?? 0} tipos de trámite</span>
            <button onClick={() => setModalTipo({ open: true })}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white rounded-xl" style={{ background: '#002f6c' }}>
              <Plus size={13} /> Nuevo tipo de trámite
            </button>
          </div>
          {(tipos ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ClipboardList size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No hay tipos de trámite configurados todavía</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tipos?.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.categoria_nombre} · {t.unidad_responsable_siglas} · {t.dias_plazo} días
                      {t.costo > 0 && ` · $${t.costo}`}
                    </p>
                  </div>
                  <button onClick={() => setModalTipo({ open: true, tipo: t })}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
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