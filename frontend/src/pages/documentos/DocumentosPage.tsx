import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentosService, Documento, CrearDocumento } from '@/services/documentos.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  FileText, Search, Plus, X, Eye, Send,
  Archive, AlertCircle, ChevronDown, Shield
} from 'lucide-react'

const ESTADOS: Record<string, { bg: string; text: string; label: string }> = {
  borrador:    { bg: '#f9fafb', text: '#6b7280', label: 'Borrador' },
  en_revision: { bg: '#faf5ff', text: '#7e22ce', label: 'En revisión' },
  aprobado:    { bg: '#f0fdf4', text: '#15803d', label: 'Aprobado' },
  enviado:     { bg: '#eff6ff', text: '#1d4ed8', label: 'Enviado' },
  recibido:    { bg: '#f0f9ff', text: '#0369a1', label: 'Recibido' },
  archivado:   { bg: '#f9fafb', text: '#374151', label: 'Archivado' },
  anulado:     { bg: '#fef2f2', text: '#dc2626', label: 'Anulado' },
}

const PRIORIDAD: Record<string, { color: string }> = {
  normal:      { color: '#9ca3af' },
  urgente:     { color: '#f59e0b' },
  muy_urgente: { color: '#ef4444' },
}

function ModalNuevoDocumento({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<CrearDocumento>>({ prioridad: 'normal', confidencial: false })
  const [error, setError] = useState('')

  const { data: tipos }    = useQuery({ queryKey: ['tipos-doc'],     queryFn: documentosService.tipos })
  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const mutation = useMutation({
    mutationFn: (data: CrearDocumento) => documentosService.crear(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documentos'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al crear'),
  })

  const set = (k: keyof CrearDocumento, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.tipo_documento || !form.asunto || !form.unidad_origen) {
      setError('Completa los campos obligatorios.'); return
    }
    mutation.mutate(form as CrearDocumento)
  }

  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#e8f1fd' }}>
              <FileText size={15} style={{ color: '#002f6c' }} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Nuevo documento</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Tipo de documento *</label>
              <select className={inputCls} value={form.tipo_documento ?? ''}
                onChange={e => set('tipo_documento', Number(e.target.value))}>
                <option value="">— Selecciona —</option>
                {tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Prioridad</label>
              <select className={inputCls} value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
                <option value="muy_urgente">Muy urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Asunto *</label>
            <input className={inputCls} placeholder="Asunto del documento"
              value={form.asunto ?? ''} onChange={e => set('asunto', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Cuerpo del documento</label>
            <textarea className={inputCls + ' resize-none'} rows={5}
              placeholder="Redacta el contenido del documento..."
              value={form.cuerpo ?? ''} onChange={e => set('cuerpo', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad de origen *</label>
              <select className={inputCls} value={form.unidad_origen ?? ''}
                onChange={e => set('unidad_origen', Number(e.target.value))}>
                <option value="">— Selecciona —</option>
                {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad destinataria</label>
              <select className={inputCls} value={form.unidad_destino ?? ''}
                onChange={e => set('unidad_destino', e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">— Sin destinatario específico —</option>
                {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.confidencial ?? false}
                onChange={e => set('confidencial', e.target.checked)}
                className="w-4 h-4" style={{ accentColor: '#002f6c' }} />
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Shield size={13} className="text-gray-400" /> Confidencial
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requiere_respuesta ?? false}
                onChange={e => set('requiere_respuesta', e.target.checked)}
                className="w-4 h-4" style={{ accentColor: '#002f6c' }} />
              <span className="text-sm text-gray-600">Requiere respuesta</span>
            </label>
          </div>

          {form.requiere_respuesta && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Fecha límite de respuesta</label>
              <input type="date" className={inputCls}
                value={form.fecha_limite_resp ?? ''}
                onChange={e => set('fecha_limite_resp', e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
            style={{ background: mutation.isPending ? '#4a90e2' : '#002f6c' }}>
            {mutation.isPending
              ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Guardando...</>
              : <><Plus size={15} /> Crear documento</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentosPage() {
  const [busqueda, setBusqueda]   = useState('')
  const [filtroEstado, setFiltro] = useState('')
  const [filtroTipo, setTipoF]    = useState('')
  const [modal, setModal]         = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['documentos', busqueda, filtroEstado, filtroTipo],
    queryFn: () => documentosService.listar({
      ...(busqueda     ? { search: busqueda }          : {}),
      ...(filtroEstado ? { estado: filtroEstado }       : {}),
      ...(filtroTipo   ? { tipo_documento: filtroTipo } : {}),
    }),
  })

  const { data: tipos } = useQuery({ queryKey: ['tipos-doc'], queryFn: documentosService.tipos })

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      documentosService.cambiarEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos'] }),
  })

  const documentos = data?.results ?? []

  return (
    <div>
      {modal && <ModalNuevoDocumento onClose={() => setModal(false)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documentos institucionales</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.count ?? 0} documentos registrados</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl"
          style={{ background: '#002f6c' }}>
          <Plus size={15} /> Nuevo documento
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por número, asunto..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10" />
        </div>
        <select value={filtroTipo} onChange={e => setTipoF(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] bg-white">
          <option value="">Todos los tipos</option>
          {tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] bg-white">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Cargando documentos...</div>
        ) : documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No se encontraron documentos</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Origen → Destino</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Elaborado por</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documentos.map(doc => {
                const est = ESTADOS[doc.estado] ?? ESTADOS.borrador
                const pri = PRIORIDAD[doc.prioridad]
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pri.color }} />
                        <div>
                          <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>
                            {doc.numero_documento ?? 'Sin número'}
                          </p>
                          <p className="text-sm font-medium text-gray-900 max-w-[220px] truncate mt-0.5">{doc.asunto}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                              {doc.tipo_nombre}
                            </span>
                            {doc.confidencial && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#fef2f2', color: '#dc2626' }}>
                                Confidencial
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-gray-700">{doc.unidad_origen_siglas || doc.unidad_origen_nombre}</p>
                      {doc.unidad_destino_siglas && (
                        <p className="text-xs text-gray-400 mt-0.5">→ {doc.unidad_destino_siglas}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-700">{doc.creado_por_nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(doc.creado_en).toLocaleDateString('es-EC')}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: est.bg, color: est.text }}>
                        {est.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        {doc.estado === 'borrador' && (
                          <button
                            onClick={() => cambiarEstado.mutate({ id: doc.id, estado: 'enviado' })}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Enviar documento">
                            <Send size={14} className="text-blue-600" />
                          </button>
                        )}
                        {doc.estado === 'enviado' && (
                          <button
                            onClick={() => cambiarEstado.mutate({ id: doc.id, estado: 'archivado' })}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Archivar">
                            <Archive size={14} className="text-gray-500" />
                          </button>
                        )}
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Ver detalle">
                          <Eye size={14} className="text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}