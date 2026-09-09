import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { archivoService, Expediente, Serie } from '@/services/archivo.service'
import { X, FolderTree, Plus, Search, FileText } from 'lucide-react'

interface Props {
  documentoId?: number
  tramiteId?: number
  onClose: () => void
  onVinculado?: () => void
}

export default function VincularExpedienteModal({ documentoId, tramiteId, onClose, onVinculado }: Props) {
  const qc = useQueryClient()
  const [modo, setModo] = useState<'existente' | 'nuevo'>('existente')
  const [busqueda, setBusqueda] = useState('')
  const [expedienteSel, setExpedienteSel] = useState<Expediente | null>(null)
  const [error, setError] = useState('')

  const [formNuevo, setFormNuevo] = useState<Record<string, any>>({
    soporte: 'digital',
  })

  const { data: expedientes } = useQuery({
    queryKey: ['expedientes-elegibles', busqueda],
    queryFn:  () => archivoService.expedientesElegibles({ search: busqueda }),
  })

  const { data: seriesData } = useQuery({
    queryKey: ['series-select'],
    queryFn:  () => archivoService.listarSeries(),
  })

  const vincularMutation = useMutation({
    mutationFn: (expedienteId: number) =>
      archivoService.agregarDocumento(expedienteId, {
        documento_id: documentoId, tramite_id: tramiteId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['expedientes'] })
      onVinculado?.()
      onClose()
    },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al vincular'),
  })

  const crearYVincularMutation = useMutation({
    mutationFn: async () => {
      const expediente = await archivoService.crear(formNuevo)
      return archivoService.agregarDocumento(expediente.id, {
        documento_id: documentoId, tramite_id: tramiteId,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['expedientes'] })
      onVinculado?.()
      onClose()
    },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al crear expediente'),
  })

  const series = seriesData?.results ?? []
  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#e8f1fd' }}>
              <FolderTree size={15} style={{ color: '#002f6c' }} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Archivar en expediente</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          <button onClick={() => setModo('existente')}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl"
            style={{ background: modo === 'existente' ? '#002f6c' : '#f3f4f6', color: modo === 'existente' ? '#fff' : '#6b7280' }}>
            Expediente existente
          </button>
          <button onClick={() => setModo('nuevo')}
            className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl"
            style={{ background: modo === 'nuevo' ? '#002f6c' : '#f3f4f6', color: modo === 'nuevo' ? '#fff' : '#6b7280' }}>
            Crear expediente nuevo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          {modo === 'existente' ? (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className={cls + ' pl-9'} placeholder="Buscar expediente por título..."
                  value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {(expedientes ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No hay expedientes abiertos disponibles</p>
                ) : expedientes!.map(exp => (
                  <div key={exp.id} onClick={() => setExpedienteSel(exp)}
                    className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                    style={{ background: expedienteSel?.id === exp.id ? '#e8f1fd' : '#fff', border: '1px solid', borderColor: expedienteSel?.id === exp.id ? '#002f6c' : '#f0f0f0' }}>
                    <FileText size={14} style={{ color: '#002f6c', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{exp.codigo_expediente}</p>
                      <p className="text-sm text-gray-900 truncate">{exp.titulo}</p>
                      <p className="text-xs text-gray-400">{exp.serie_nombre} · {exp.total_documentos} documentos</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Serie documental *</label>
                <select className={cls} value={formNuevo.serie ?? ''} onChange={e => setFormNuevo(f => ({ ...f, serie: Number(e.target.value) }))}>
                  <option value="">— Selecciona —</option>
                  {series.map((s: Serie) => <option key={s.id} value={s.id}>{s.codigo} — {s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Título del expediente *</label>
                <input className={cls} placeholder="Título descriptivo"
                  value={formNuevo.titulo ?? ''} onChange={e => setFormNuevo(f => ({ ...f, titulo: e.target.value }))} />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          {modo === 'existente' ? (
            <button
              onClick={() => { if (!expedienteSel) { setError('Selecciona un expediente'); return }; vincularMutation.mutate(expedienteSel.id) }}
              disabled={vincularMutation.isPending}
              className="px-4 py-2.5 text-sm font-bold text-white rounded-xl"
              style={{ background: '#002f6c' }}>
              Vincular y archivar
            </button>
          ) : (
            <button
              onClick={() => { if (!formNuevo.serie || !formNuevo.titulo) { setError('Completa los campos obligatorios'); return }; crearYVincularMutation.mutate() }}
              disabled={crearYVincularMutation.isPending}
              className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
              style={{ background: '#002f6c' }}>
              <Plus size={14} /> Crear y archivar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}