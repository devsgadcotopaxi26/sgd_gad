import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { archivoService } from '@/services/archivo.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  Archive, Search, Plus, X, FolderOpen,
  FolderClosed, FileText, Calendar, Building2,
  CheckCircle, ArrowRight, AlertTriangle, Database
} from 'lucide-react'

const ESTADOS: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  abierto:     { bg: '#f0fdf4', text: '#15803d', label: 'Abierto',     icon: FolderOpen },
  cerrado:     { bg: '#f9fafb', text: '#374151', label: 'Cerrado',     icon: FolderClosed },
  transferido: { bg: '#eff6ff', text: '#1d4ed8', label: 'Transferido', icon: ArrowRight },
  eliminado:   { bg: '#fef2f2', text: '#dc2626', label: 'Eliminado',   icon: X },
}

const SOPORTE: Record<string, { bg: string; text: string }> = {
  digital: { bg: '#e8f1fd', text: '#002f6c' },
  fisico:  { bg: '#faeeda', text: '#854f0b' },
  mixto:   { bg: '#f0fdf4', text: '#0f6e56' },
}

const DISPOSICION: Record<string, { label: string; color: string }> = {
  conservacion:   { label: 'Conservación',   color: '#0f6e56' },
  eliminacion:    { label: 'Eliminación',    color: '#dc2626' },
  digitalizacion: { label: 'Digitalización', color: '#002f6c' },
  muestreo:       { label: 'Muestreo',       color: '#854f0b' },
}

function ModalNuevoExpediente({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, any>>({ soporte: 'digital' })
  const [error, setError] = useState('')

  const { data: series }   = useQuery({ queryKey: ['series'],          queryFn: () => archivoService.series() })
  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const mutation = useMutation({
    mutationFn: (data: any) => archivoService.crear(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expedientes'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al crear'),
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#e8f1fd' }}>
              <Archive size={15} style={{ color: '#002f6c' }} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Nuevo expediente</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Título del expediente *</label>
            <input className={inputCls} placeholder="Título descriptivo del expediente"
              value={form.titulo ?? ''} onChange={e => set('titulo', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Serie documental *</label>
              <select className={inputCls} value={form.serie ?? ''}
                onChange={e => set('serie', Number(e.target.value))}>
                <option value="">— Selecciona —</option>
                {series?.results?.map(s => (
                  <option key={s.id} value={s.id}>[{s.codigo}] {s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Soporte</label>
              <select className={inputCls} value={form.soporte}
                onChange={e => set('soporte', e.target.value)}>
                <option value="digital">Digital</option>
                <option value="fisico">Físico</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad productora *</label>
            <select className={inputCls} value={form.unidad ?? ''}
              onChange={e => set('unidad', Number(e.target.value))}>
              <option value="">— Selecciona —</option>
              {unidades?.map(u => (
                <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Descripción</label>
            <textarea className={inputCls + ' resize-none'} rows={3}
              placeholder="Descripción del contenido del expediente..."
              value={form.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Fecha inicio</label>
              <input type="date" className={inputCls}
                value={form.fecha_inicio ?? ''} onChange={e => set('fecha_inicio', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Ubicación física</label>
              <input className={inputCls} placeholder="Ej: Estante 3, Caja 12"
                value={form.ubicacion_fisica ?? ''} onChange={e => set('ubicacion_fisica', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => {
              if (!form.titulo || !form.serie || !form.unidad) { setError('Completa los campos obligatorios.'); return }
              mutation.mutate(form)
            }}
            disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
            style={{ background: mutation.isPending ? '#4a90e2' : '#002f6c' }}>
            {mutation.isPending
              ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Creando...</>
              : <><Plus size={15} /> Crear expediente</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ArchivoPage() {
  const [busqueda, setBusqueda]   = useState('')
  const [filtroEstado, setFiltro] = useState('')
  const [filtroSerie, setSerie]   = useState('')
  const [modal, setModal]         = useState(false)
  const [vista, setVista]         = useState<'expedientes' | 'series'>('expedientes')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['expedientes', busqueda, filtroEstado, filtroSerie],
    queryFn: () => archivoService.expedientes({
      ...(busqueda     ? { search: busqueda }  : {}),
      ...(filtroEstado ? { estado: filtroEstado } : {}),
      ...(filtroSerie  ? { serie: filtroSerie }   : {}),
    }),
  })

  const { data: stats } = useQuery({
    queryKey: ['archivo-stats'],
    queryFn: archivoService.estadisticas,
  })

  const { data: seriesData } = useQuery({
    queryKey: ['series'],
    queryFn: () => archivoService.series(),
  })

  const cerrar = useMutation({
    mutationFn: (id: number) => archivoService.cerrar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expedientes'] }),
  })

  const transferir = useMutation({
    mutationFn: (id: number) => archivoService.transferir(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expedientes'] }),
  })

  const expedientes = data?.results ?? []

  return (
    <div>
      {modal && <ModalNuevoExpediente onClose={() => setModal(false)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Archivo documental central</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de expedientes y series documentales</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl"
          style={{ background: '#002f6c' }}>
          <Plus size={15} /> Nuevo expediente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total expedientes', value: stats?.total ?? '—',       bg: '#e8f1fd', color: '#002f6c', icon: Archive },
          { label: 'Abiertos',          value: stats?.abiertos ?? '—',    bg: '#f0fdf4', color: '#15803d', icon: FolderOpen },
          { label: 'Cerrados',          value: stats?.cerrados ?? '—',    bg: '#f9fafb', color: '#374151', icon: FolderClosed },
          { label: 'Por vencer',        value: stats?.por_vencer ?? '—',  bg: '#fef2f2', color: '#dc2626', icon: AlertTriangle },
        ].map(({ label, value, bg, color, icon: Icon }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Soporte breakdown */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Digital',  value: stats.digital,  ...SOPORTE.digital },
            { label: 'Físico',   value: stats.fisico,   ...SOPORTE.fisico },
            { label: 'Mixto',    value: stats.mixto,    ...SOPORTE.mixto },
          ].map(({ label, value, bg, text }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Database size={15} style={{ color: text }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: text }}>{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {[['expedientes','Expedientes'],['series','Series documentales']].map(([k,l]) => (
          <button key={k} onClick={() => setVista(k as any)}
            className="px-4 py-2 text-sm font-semibold rounded-xl transition-all"
            style={{ background: vista === k ? '#002f6c' : '#f3f4f6', color: vista === k ? '#fff' : '#6b7280' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Vista expedientes */}
      {vista === 'expedientes' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar por código, título..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10" />
            </div>
            <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] bg-white">
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filtroSerie} onChange={e => setSerie(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] bg-white">
              <option value="">Todas las series</option>
              {seriesData?.results?.map(s => <option key={s.id} value={s.id}>[{s.codigo}] {s.nombre}</option>)}
            </select>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">Cargando expedientes...</div>
            ) : expedientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Archive size={28} className="mb-2 opacity-40" />
                <p className="text-sm">No se encontraron expedientes</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expediente</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Serie</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidad</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documentos</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expedientes.map(exp => {
                    const est  = ESTADOS[exp.estado] ?? ESTADOS.abierto
                    const EIcon = est.icon
                    const sop  = SOPORTE[exp.soporte]
                    return (
                      <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{exp.codigo_expediente}</p>
                          <p className="text-sm font-medium text-gray-900 mt-0.5 max-w-[220px] truncate">{exp.titulo}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: sop.bg, color: sop.text }}>
                              {exp.soporte}
                            </span>
                            {exp.fecha_inicio && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Calendar size={10} /> {new Date(exp.fecha_inicio).toLocaleDateString('es-EC')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-bold text-gray-700">{exp.serie_codigo}</p>
                          <p className="text-xs text-gray-400 mt-0.5 max-w-[140px] truncate">{exp.serie_nombre}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={13} className="text-gray-400" />
                            <span className="text-xs font-semibold text-gray-700">{exp.unidad_siglas}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{exp.creado_por_nombre}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <FileText size={13} className="text-gray-400" />
                            <span className="text-sm font-semibold text-gray-700">{exp.num_documentos}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{exp.num_fojas} fojas</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: est.bg, color: est.text }}>
                            <EIcon size={11} /> {est.label}
                          </span>
                          {exp.dias_para_expurgo !== null && exp.dias_para_expurgo <= 30 && (
                            <p className="text-[10px] text-red-500 mt-1 flex items-center gap-0.5">
                              <AlertTriangle size={10} /> Expurgo en {exp.dias_para_expurgo}d
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            {exp.estado === 'abierto' && (
                              <button onClick={() => cerrar.mutate(exp.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Cerrar expediente">
                                <FolderClosed size={14} className="text-gray-500" />
                              </button>
                            )}
                            {exp.estado === 'cerrado' && (
                              <button onClick={() => transferir.mutate(exp.id)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Transferir al archivo central">
                                <ArrowRight size={14} className="text-blue-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Vista series */}
      {vista === 'series' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {seriesData?.results?.map(serie => {
            const disp = DISPOSICION[serie.disposicion_final]
            return (
              <div key={serie.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{serie.codigo}</span>
                    <h3 className="text-sm font-bold text-gray-900 mt-1">{serie.nombre}</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: '#f3f4f6', color: disp.color }}>
                    {disp.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[
                    { label: 'Retención',    value: `${serie.anos_retencion} años` },
                    { label: 'Archivo central', value: `${serie.anos_central} años` },
                    { label: 'Expedientes', value: serie.num_expedientes },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-2 rounded-xl" style={{ background: '#f9fafb' }}>
                      <p className="text-sm font-bold text-gray-900">{value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}