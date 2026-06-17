import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { archivoService, BajaDocumental, Expediente } from '@/services/archivo.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  Trash2, Plus, X, FileText, AlertTriangle,
  CheckCircle, Clock, Search
} from 'lucide-react'

const ESTADO_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  borrador:           { bg: '#f9fafb', text: '#6b7280', label: 'Borrador' },
  valorada:           { bg: '#eff6ff', text: '#1d4ed8', label: 'Valorada' },
  enviada_validacion: { bg: '#fff7ed', text: '#c2410c', label: 'Enviada a validación' },
  dictaminada:        { bg: '#f0fdf4', text: '#15803d', label: 'Dictaminada' },
  rechazada:          { bg: '#fef2f2', text: '#dc2626', label: 'Rechazada' },
  ejecutada:          { bg: '#374151', text: '#fff',    label: 'Ejecutada' },
}

const CARACTER_PROCESO: Record<string, string> = {
  gobernante: 'Gobernante',
  sustantivo: 'Sustantivo',
  adjetivo:   'Adjetivo',
}

function ModalNuevaBaja({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [paso, setPaso] = useState(1)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [form, setForm] = useState<Record<string, any>>({
    caracter_proceso: 'adjetivo',
    justificacion: '',
    normativa_legal: '',
  })
  const [error, setError] = useState('')

  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  // Expedientes elegibles: en Archivo Central, con disposición final = eliminación, y plazo cumplido
  const { data: expedientesData } = useQuery({
    queryKey: ['expedientes-elegibles-baja'],
    queryFn:  () => archivoService.expedientes({ categoria_actual: 'central' }),
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const baja = await archivoService.crearBaja(data)
      return baja
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bajas-documentales'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const expedientes = (expedientesData?.results ?? []).filter(
    (e: Expediente) => true // el backend ya filtra por categoria_actual=central; aquí podrías filtrar disposicion_final
  )

  const toggleExp = (id: number) => setSeleccionados(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  const handleSubmit = () => {
    if (!form.unidad)        { setError('Selecciona la unidad responsable'); return }
    if (!form.justificacion) { setError('La justificación es obligatoria'); return }
    if (seleccionados.size === 0) { setError('Selecciona al menos un expediente'); return }

    mutation.mutate({
      ...form,
      numero_expedientes: seleccionados.size,
      expedientes_ids: Array.from(seleccionados),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Nueva baja documental</h3>
            <p className="text-xs text-gray-400 mt-0.5">Ficha Técnica de Prevaloración — Paso {paso} de 2</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              La baja documental requiere aprobación del equipo de valoración (Art. 42) y validación de la Dirección de Archivo del ente rector antes de su ejecución.
            </p>
          </div>

          {paso === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad responsable *</label>
                  <select className={cls} value={form.unidad ?? ''} onChange={e => setForm(f => ({ ...f, unidad: Number(e.target.value) }))}>
                    <option value="">— Selecciona —</option>
                    {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Carácter del proceso</label>
                  <select className={cls} value={form.caracter_proceso} onChange={e => setForm(f => ({ ...f, caracter_proceso: e.target.value }))}>
                    {Object.entries(CARACTER_PROCESO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Justificación *</label>
                <textarea className={cls + ' resize-none'} rows={3}
                  placeholder="Indica por qué los expedientes deben darse de baja (plazo cumplido, sin valor histórico, etc.)"
                  value={form.justificacion} onChange={e => setForm(f => ({ ...f, justificacion: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Normativa legal aplicable</label>
                <input className={cls} placeholder="Ley y artículo que justifica la eliminación"
                  value={form.normativa_legal} onChange={e => setForm(f => ({ ...f, normativa_legal: e.target.value }))} />
              </div>
            </>
          )}

          {paso === 2 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Selecciona los expedientes a eliminar ({seleccionados.size} seleccionados)
              </p>
              <div className="space-y-1.5 max-h-80 overflow-y-auto border border-gray-100 rounded-xl p-2">
                {expedientes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No hay expedientes elegibles en Archivo Central</p>
                ) : expedientes.map(exp => (
                  <div key={exp.id} onClick={() => toggleExp(exp.id)}
                    className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                    style={{ background: seleccionados.has(exp.id) ? '#fef2f2' : '#fff', border: '1px solid', borderColor: seleccionados.has(exp.id) ? '#dc2626' : '#f0f0f0' }}>
                    <input type="checkbox" checked={seleccionados.has(exp.id)} onChange={() => {}}
                      className="w-4 h-4" style={{ accentColor: '#dc2626' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{exp.codigo_expediente}</p>
                      <p className="text-sm text-gray-900 truncate">{exp.titulo}</p>
                      <p className="text-xs text-gray-400">{exp.serie_nombre}</p>
                    </div>
                    <span className="text-xs text-gray-400">{exp.num_fojas} fojas</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button onClick={() => paso > 1 ? setPaso(1) : onClose()}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            {paso === 1 ? 'Cancelar' : '← Anterior'}
          </button>
          {paso === 1 ? (
            <button onClick={() => {
              if (!form.unidad || !form.justificacion) { setError('Completa los campos obligatorios'); return }
              setError(''); setPaso(2)
            }}
              className="px-4 py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: '#002f6c' }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={mutation.isPending}
              className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2" style={{ background: '#dc2626' }}>
              <Trash2 size={14} /> Solicitar baja documental
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BajaDocumentalPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['bajas-documentales', filtroEstado],
    queryFn:  () => archivoService.listarBajas(filtroEstado ? { estado: filtroEstado } : {}),
  })

  const avanzarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      archivoService.actualizarBaja(id, { estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bajas-documentales'] }),
  })

  const bajas = data?.results ?? []

  const siguienteEstado: Record<string, string> = {
    borrador: 'valorada',
    valorada: 'enviada_validacion',
    enviada_validacion: 'dictaminada',
    dictaminada: 'ejecutada',
  }

  const labelAccion: Record<string, string> = {
    borrador: 'Marcar como valorada',
    valorada: 'Enviar a validación',
    enviada_validacion: 'Registrar dictamen',
    dictaminada: 'Ejecutar baja',
  }

  return (
    <div>
      {modal && <ModalNuevaBaja onClose={() => setModal(false)} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Baja documental</h1>
          <p className="text-sm text-gray-400 mt-0.5">Eliminación controlada conforme al Art. 53 de la Regla Técnica Nacional</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: '#dc2626' }}>
          <Plus size={15} /> Nueva baja documental
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setFiltroEstado('')}
          className="px-3 py-1.5 text-xs font-semibold rounded-full"
          style={{ background: !filtroEstado ? '#002f6c' : '#f3f4f6', color: !filtroEstado ? '#fff' : '#6b7280' }}>
          Todos
        </button>
        {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
          <button key={k} onClick={() => setFiltroEstado(k)}
            className="px-3 py-1.5 text-xs font-semibold rounded-full"
            style={{ background: filtroEstado === k ? v.text : v.bg, color: filtroEstado === k ? '#fff' : v.text }}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Cargando...</div>
        ) : bajas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Trash2 size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No hay procesos de baja documental registrados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidad</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Carácter</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expedientes</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Solicitado por</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bajas.map((b: BajaDocumental) => {
                const est = ESTADO_CONFIG[b.estado] ?? ESTADO_CONFIG.borrador
                const siguiente = siguienteEstado[b.estado]
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{b.unidad_nombre}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{CARACTER_PROCESO[b.caracter_proceso]}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{b.numero_expedientes} expedientes</td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{b.solicitado_por_nombre}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: est.bg, color: est.text }}>
                        {est.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {siguiente && (
                        <button
                          onClick={() => avanzarEstado.mutate({ id: b.id, estado: siguiente })}
                          disabled={avanzarEstado.isPending}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                          {labelAccion[b.estado]}
                        </button>
                      )}
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