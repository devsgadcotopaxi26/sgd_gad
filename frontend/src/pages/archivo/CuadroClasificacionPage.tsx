import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { archivoService, Seccion, Serie } from '@/services/archivo.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  ChevronRight, ChevronDown, FolderTree, FileText,
  Plus, X, Edit3, Trash2, Search, Lock, Globe, EyeOff
} from 'lucide-react'

const ACCESO_CONFIG: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  publico:      { bg: '#f0fdf4', text: '#15803d', icon: Globe,  label: 'Público' },
  confidencial: { bg: '#fef9c3', text: '#854f0b', icon: EyeOff, label: 'Confidencial' },
  reservado:    { bg: '#fef2f2', text: '#dc2626', icon: Lock,   label: 'Reservado' },
}

function ModalSeccion({ seccion, onClose }: { seccion?: Seccion; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Seccion>>(seccion ?? { codigo: '', nombre: '' })
  const [error, setError] = useState('')

  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })
  const { data: fondos }   = useQuery({ queryKey: ['fondos'], queryFn: archivoService.listarFondos })

  const mutation = useMutation({
    mutationFn: (data: Partial<Seccion>) =>
      seccion ? archivoService.actualizarSeccion(seccion.id, data) : archivoService.crearSeccion(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['secciones-arbol'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const set = (k: keyof Seccion, v: any) => setForm(f => ({ ...f, [k]: v }))
  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">{seccion ? 'Editar sección' : 'Nueva sección'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Código *</label>
              <input className={cls} placeholder="Ej: DAD" value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Fondo</label>
              <select className={cls} value={form.fondo ?? ''} onChange={e => set('fondo', Number(e.target.value))}>
                <option value="">— Selecciona —</option>
                {fondos?.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nombre *</label>
            <input className={cls} placeholder="Nombre de la sección" value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad administrativa</label>
            <select className={cls} value={form.unidad ?? ''} onChange={e => set('unidad', Number(e.target.value))}>
              <option value="">— Selecciona —</option>
              {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => { if (!form.codigo || !form.nombre) { setError('Completa los campos obligatorios'); return }; mutation.mutate(form) }}
            disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl"
            style={{ background: '#002f6c' }}>
            {seccion ? 'Guardar cambios' : 'Crear sección'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalSerie({ serie, seccionId, onClose }: { serie?: Serie; seccionId?: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Serie>>(serie ?? {
    seccion: seccionId, codigo: '', nombre: '',
    origen_documentacion: 'digital', condicion_acceso: 'publico',
    anos_gestion: 2, anos_central: 13, disposicion_final: 'conservacion', tecnica_seleccion: 'na',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: Partial<Serie>) =>
      serie ? archivoService.actualizarSerie(serie.id, data) : archivoService.crearSerie(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['secciones-arbol'] }); qc.invalidateQueries({ queryKey: ['series'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const set = (k: keyof Serie, v: any) => setForm(f => ({ ...f, [k]: v }))
  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">{serie ? 'Editar serie documental' : 'Nueva serie documental'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Código *</label>
              <input className={cls} placeholder="Ej: SER-013" value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Condición de acceso</label>
              <select className={cls} value={form.condicion_acceso} onChange={e => set('condicion_acceso', e.target.value)}>
                <option value="publico">Público</option>
                <option value="confidencial">Confidencial</option>
                <option value="reservado">Reservado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nombre *</label>
            <input className={cls} placeholder="Nombre de la serie documental" value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Descripción</label>
            <textarea className={cls + ' resize-none'} rows={2} placeholder="Breve explicación del contenido de la serie"
              value={form.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Origen de la documentación</label>
            <div className="flex gap-2">
              {[['digital','Digital'],['fisico','Físico'],['hibrido','Híbrido']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('origen_documentacion', v)}
                  className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border transition-all"
                  style={{
                    borderColor: form.origen_documentacion === v ? '#002f6c' : '#e5e7eb',
                    background: form.origen_documentacion === v ? '#e8f1fd' : '#fff',
                    color: form.origen_documentacion === v ? '#002f6c' : '#6b7280',
                  }}>{l}</button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: '#f8faff', border: '1px solid #e8f1fd' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Tabla de plazos de conservación</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Años en Archivo de Gestión</label>
                <input type="number" className={cls} value={form.anos_gestion ?? 2}
                  onChange={e => set('anos_gestion', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Años en Archivo Central</label>
                <input type="number" className={cls} value={form.anos_central ?? 13}
                  onChange={e => set('anos_central', Number(e.target.value))} />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Base legal</label>
              <input className={cls} placeholder="Ley y artículo que determina el plazo"
                value={form.base_legal ?? ''} onChange={e => set('base_legal', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Disposición final</label>
                <select className={cls} value={form.disposicion_final} onChange={e => set('disposicion_final', e.target.value)}>
                  <option value="conservacion">Conservación permanente</option>
                  <option value="eliminacion">Eliminación</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Técnica de selección</label>
                <select className={cls} value={form.tecnica_seleccion} onChange={e => set('tecnica_seleccion', e.target.value)}>
                  <option value="na">No aplica</option>
                  <option value="completa">Conservación completa</option>
                  <option value="parcial">Conservación parcial / muestreo</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => { if (!form.codigo || !form.nombre) { setError('Completa los campos obligatorios'); return }; mutation.mutate(form) }}
            disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl"
            style={{ background: '#002f6c' }}>
            {serie ? 'Guardar cambios' : 'Crear serie'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NodoSeccion({ nodo, nivel, expandidos, onToggle, onSelect, selected }: any) {
  const isExp   = expandidos.has(`s-${nodo.id}`)
  const hasKids = (nodo.hijos ?? []).length > 0
  const isSel   = selected?.tipo === 'seccion' && selected?.id === nodo.id

  return (
    <>
      <div
        onClick={() => onSelect({ tipo: 'seccion', id: nodo.id, data: nodo })}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', paddingLeft: 14 + nivel * 22,
          background: isSel ? '#e8f1fd' : 'transparent',
          borderLeft: `3px solid ${isSel ? '#002f6c' : 'transparent'}`,
          borderBottom: '0.5px solid #f5f6f8', cursor: 'pointer',
        }}
        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f8faff' }}
        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
        <div onClick={e => { e.stopPropagation(); if (hasKids) onToggle(`s-${nodo.id}`) }}
          style={{ width: 16, display: 'flex', color: hasKids ? '#9ca3af' : 'transparent', cursor: hasKids ? 'pointer' : 'default' }}>
          {hasKids ? (isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : null}
        </div>
        <FolderTree size={14} style={{ color: '#002f6c', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: isSel ? 600 : 500, color: isSel ? '#002f6c' : '#0a1628', flex: 1 }}>
          {nodo.nombre}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', fontFamily: 'monospace' }}>{nodo.codigo}</span>
        {nodo.total_series > 0 && (
          <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>
            {nodo.total_series} series
          </span>
        )}
      </div>
      {isExp && hasKids && nodo.hijos.map((h: any) => (
        <NodoSeccion key={h.id} nodo={h} nivel={nivel + 1} expandidos={expandidos} onToggle={onToggle} onSelect={onSelect} selected={selected} />
      ))}
    </>
  )
}

export default function CuadroClasificacionPage() {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [selected, setSelected]     = useState<any>(null)
  const [busqueda, setBusqueda]     = useState('')
  const [modalSeccion, setModalSeccion] = useState<{ open: boolean; seccion?: Seccion }>({ open: false })
  const [modalSerie, setModalSerie]     = useState<{ open: boolean; serie?: Serie }>({ open: false })

  const { data: arbol, isLoading } = useQuery({
    queryKey: ['secciones-arbol'],
    queryFn:  archivoService.arbolSecciones,
  })

  const { data: seriesData } = useQuery({
    queryKey: ['series', selected?.id],
    queryFn:  () => archivoService.listarSeries({ seccion: selected?.id }),
    enabled:  selected?.tipo === 'seccion',
  })

  const toggle = (key: string) => setExpandidos(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const expandirTodo = () => {
    const keys = new Set<string>()
    const rec = (ns: any[]) => ns.forEach(n => { keys.add(`s-${n.id}`); if (n.hijos) rec(n.hijos) })
    if (arbol) rec(arbol)
    setExpandidos(keys)
  }

  const series = seriesData?.results ?? []

  return (
    <div>
      {modalSeccion.open && <ModalSeccion seccion={modalSeccion.seccion} onClose={() => setModalSeccion({ open: false })} />}
      {modalSerie.open && <ModalSerie serie={modalSerie.serie} seccionId={selected?.id} onClose={() => setModalSerie({ open: false })} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cuadro General de Clasificación Documental</h1>
          <p className="text-sm text-gray-400 mt-0.5">Fondo → Sección → Serie/Subserie, conforme a la Regla Técnica Nacional de Archivos</p>
        </div>
        <button onClick={() => setModalSeccion({ open: true })}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl"
          style={{ background: '#002f6c' }}>
          <Plus size={15} /> Nueva sección
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 220px)' }}>

        {/* Árbol secciones */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
              <input placeholder="Buscar sección..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '6px 10px 6px 26px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }} />
            </div>
            <button onClick={expandirTodo}
              style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Expandir todo
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: 40, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>Cargando...</div>
            ) : (arbol ?? []).map((nodo: any) => (
              <NodoSeccion key={nodo.id} nodo={nodo} nivel={0} expandidos={expandidos} onToggle={toggle} onSelect={setSelected} selected={selected} />
            ))}
          </div>
        </div>

        {/* Panel detalle / series */}
        {selected?.tipo === 'seccion' && (
          <div style={{ width: 420, flexShrink: 0, background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px', borderBottom: '0.5px solid #f5f6f8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628' }}>{selected.data.nombre}</p>
                  <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{selected.data.unidad_siglas} · Código: {selected.data.codigo}</p>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setModalSeccion({ open: true, seccion: selected.data })}
                    style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => setSelected(null)}
                    style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Series documentales ({series.length})</span>
              <button onClick={() => setModalSerie({ open: true })}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: '#002f6c', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                <Plus size={12} /> Nueva serie
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              {series.length === 0 ? (
                <p style={{ fontSize: 11, color: '#c4c9d4', textAlign: 'center', padding: 20 }}>Sin series documentales en esta sección</p>
              ) : series.map(serie => {
                const acceso = ACCESO_CONFIG[serie.condicion_acceso]
                const AccesoIcon = acceso.icon
                return (
                  <div key={serie.id} style={{ padding: '10px 12px', borderRadius: 10, border: '0.5px solid #f0f0f0', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={12} style={{ color: '#002f6c', flexShrink: 0 }} />
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#0a1628' }}>{serie.nombre}</p>
                        </div>
                        <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' }}>{serie.codigo}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button onClick={() => setModalSerie({ open: true, serie })}
                          style={{ width: 24, height: 24, borderRadius: 6, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                          <Edit3 size={11} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: acceso.bg, color: acceso.text }}>
                        <AccesoIcon size={9} /> {acceso.label}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>
                        {serie.anos_gestion}a gestión + {serie.anos_central}a central
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: serie.disposicion_final === 'conservacion' ? '#f0fdf4' : '#fef2f2', color: serie.disposicion_final === 'conservacion' ? '#15803d' : '#dc2626' }}>
                        {serie.disposicion_final === 'conservacion' ? 'Conservación' : 'Eliminación'}
                      </span>
                      {serie.total_expedientes > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: '#e8f1fd', color: '#002f6c' }}>
                          {serie.total_expedientes} expedientes
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}