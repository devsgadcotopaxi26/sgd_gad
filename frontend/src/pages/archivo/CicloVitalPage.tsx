import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { archivoService, Expediente, Transferencia } from '@/services/archivo.service'
import {
  Inbox, Building2, Archive, Landmark,
  ArrowRight, X, FileText,
  Clock, CheckCircle, AlertTriangle, Send
} from 'lucide-react'

const CATEGORIAS = [
  { key: 'gestion',    label: 'Archivo de Gestión',    icon: Inbox,    color: '#002f6c', desc: '0-2 años · documentación de uso continuo' },
  { key: 'central',    label: 'Archivo Central',       icon: Building2,color: '#0f6e56', desc: '2-15 años · custodia institucional' },
  { key: 'intermedio', label: 'Archivo Intermedio',    icon: Archive,  color: '#854f0b', desc: '15+ años · Dirección de Archivo del ente rector' },
  { key: 'historico',  label: 'Archivo Histórico',     icon: Landmark, color: '#7e22ce', desc: 'Permanente · Archivo Nacional del Ecuador' },
]

const TIPO_TRANSFERENCIA: Record<string, { from: string; to: string; label: string }> = {
  primaria:   { from: 'gestion',    to: 'central',    label: 'Primaria (Gestión → Central)' },
  secundaria: { from: 'central',    to: 'intermedio', label: 'Secundaria (Central → Intermedio)' },
  final:      { from: 'intermedio', to: 'historico',  label: 'Final (Intermedio → Histórico)' },
}

const ESTADO_TRANSFERENCIA: Record<string, { bg: string; text: string; label: string }> = {
  borrador:   { bg: '#f9fafb', text: '#6b7280', label: 'Borrador' },
  solicitada: { bg: '#fff7ed', text: '#c2410c', label: 'Solicitada' },
  revisada:   { bg: '#eff6ff', text: '#1d4ed8', label: 'Revisada' },
  aceptada:   { bg: '#f0fdf4', text: '#15803d', label: 'Aceptada' },
  rechazada:  { bg: '#fef2f2', text: '#dc2626', label: 'Rechazada' },
}

function ModalNuevaTransferencia({ categoria, onClose }: { categoria: string; onClose: () => void }) {
  const qc = useQueryClient()
  const tipoSugerido = categoria === 'gestion' ? 'primaria' : categoria === 'central' ? 'secundaria' : 'final'
  const [form, setForm] = useState<Record<string, any>>({ tipo: tipoSugerido, numero_memorando: '' })
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  const { data: expedientesData } = useQuery({
    queryKey: ['expedientes-categoria', categoria],
    queryFn:  () => archivoService.expedientes({ categoria_actual: categoria }),
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const transferencia = await archivoService.crearTransferencia(data)
      return transferencia
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transferencias'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const expedientes = expedientesData?.results ?? []
  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  const toggleExp = (id: number) => setSeleccionados(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Nueva transferencia documental</h3>
            <p className="text-xs text-gray-400 mt-0.5">{TIPO_TRANSFERENCIA[tipoSugerido].label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">N° de memorando</label>
            <input className={cls} placeholder="Ej: MEM-DAD-2026-0034"
              value={form.numero_memorando} onChange={e => setForm(f => ({ ...f, numero_memorando: e.target.value }))} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Selecciona los expedientes a transferir ({seleccionados.size} seleccionados)
            </p>
            <div className="space-y-1.5 max-h-80 overflow-y-auto border border-gray-100 rounded-xl p-2">
              {expedientes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No hay expedientes en esta categoría listos para transferir</p>
              ) : expedientes.map(exp => (
                <div key={exp.id} onClick={() => toggleExp(exp.id)}
                  className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                  style={{ background: seleccionados.has(exp.id) ? '#e8f1fd' : '#fff', border: '1px solid', borderColor: seleccionados.has(exp.id) ? '#002f6c' : '#f0f0f0' }}>
                  <input type="checkbox" checked={seleccionados.has(exp.id)} onChange={() => {}}
                    className="w-4 h-4" style={{ accentColor: '#002f6c' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{exp.codigo_expediente}</p>
                    <p className="text-sm text-gray-900 truncate">{exp.titulo}</p>
                  </div>
                  <span className="text-xs text-gray-400">{exp.num_fojas} fojas</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => {
              if (seleccionados.size === 0) { setError('Selecciona al menos un expediente'); return }
              mutation.mutate({ tipo: tipoSugerido, numero_memorando: form.numero_memorando, expedientes_ids: Array.from(seleccionados) })
            }}
            disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
            style={{ background: '#002f6c' }}>
            <Send size={14} /> Solicitar transferencia
          </button>
        </div>
      </div>
    </div>
  )
}

function ExpurgarButton({ expediente, onDone }: { expediente: Expediente; onDone: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => archivoService.expurgar(expediente.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expedientes-categoria'] }); onDone() },
  })
  return (
    <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
      className="px-4 py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: '#854f0b' }}>
      {mutation.isPending ? 'Procesando...' : 'Marcar expurgo realizado'}
    </button>
  )
}

function FoliarButton({ expediente, onDone }: { expediente: Expediente; onDone: () => void }) {
  const qc = useQueryClient()
  const [numFojas, setNumFojas] = useState(expediente.num_fojas || 0)
  const mutation = useMutation({
    mutationFn: () => archivoService.foliar(expediente.id, numFojas),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expedientes-categoria'] }); onDone() },
  })
  return (
    <div className="flex items-center gap-2">
      <input type="number" value={numFojas} onChange={e => setNumFojas(Number(e.target.value))}
        className="w-20 px-2 py-2 text-sm border border-gray-200 rounded-xl outline-none" placeholder="Fojas" />
      <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
        className="px-4 py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: '#0f6e56' }}>
        {mutation.isPending ? 'Procesando...' : 'Marcar foliación realizada'}
      </button>
    </div>
  )
}

function CerrarButton({ expediente, onDone }: { expediente: Expediente; onDone: () => void }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => archivoService.cerrar(expediente.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expedientes-categoria'] }); onDone() },
  })
  return (
    <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
      className="px-4 py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: '#002f6c' }}>
      {mutation.isPending ? 'Procesando...' : 'Cerrar expediente'}
    </button>
  )
}

export default function CicloVitalPage() {
  const [categoriaActiva, setCategoriaActiva] = useState('gestion')
  const [modalTransferencia, setModalTransferencia] = useState(false)
  const [vista, setVista] = useState<'expedientes' | 'transferencias'>('expedientes')
  const [selectedExp, setSelectedExp] = useState<Expediente | null>(null)

  const { data: expedientesData, isLoading } = useQuery({
    queryKey: ['expedientes-categoria', categoriaActiva],
    queryFn:  () => archivoService.expedientes({ categoria_actual: categoriaActiva }),
  })

  const { data: transferenciasData } = useQuery({
    queryKey: ['transferencias'],
    queryFn:  () => archivoService.listarTransferencias(),
  })

  const expedientes    = expedientesData?.results ?? []
  const transferencias = transferenciasData?.results ?? []
  const catActual       = CATEGORIAS.find(c => c.key === categoriaActiva)!

  return (
    <div>
      {modalTransferencia && <ModalNuevaTransferencia categoria={categoriaActiva} onClose={() => setModalTransferencia(false)} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ciclo vital del documento</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión → Central → Intermedio → Histórico</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setVista('expedientes')}
            className="px-3 py-2 text-xs font-semibold rounded-xl"
            style={{ background: vista === 'expedientes' ? '#002f6c' : '#f3f4f6', color: vista === 'expedientes' ? '#fff' : '#6b7280' }}>
            Por categoría
          </button>
          <button onClick={() => setVista('transferencias')}
            className="px-3 py-2 text-xs font-semibold rounded-xl"
            style={{ background: vista === 'transferencias' ? '#002f6c' : '#f3f4f6', color: vista === 'transferencias' ? '#fff' : '#6b7280' }}>
            Transferencias
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        {CATEGORIAS.map((cat, i) => {
          const Icon = cat.icon
          const isActive = categoriaActiva === cat.key
          return (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 4 }}>
              <div onClick={() => setCategoriaActiva(cat.key)}
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                  background: isActive ? cat.color : '#fff',
                  border: `1.5px solid ${isActive ? cat.color : '#e5e7eb'}`,
                  transition: 'all .15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon size={16} style={{ color: isActive ? '#fff' : cat.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : '#0a1628' }}>{cat.label}</span>
                </div>
                <p style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,.8)' : '#9ca3af' }}>{cat.desc}</p>
              </div>
              {i < CATEGORIAS.length - 1 && <ArrowRight size={16} style={{ color: '#d1d5db', flexShrink: 0 }} />}
            </div>
          )
        })}
      </div>

      {vista === 'expedientes' ? (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">
              {catActual.label} — {expedientes.length} expedientes
            </span>
            <button onClick={() => setModalTransferencia(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white rounded-xl"
              style={{ background: '#002f6c' }}>
              <Send size={13} /> Solicitar transferencia
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Cargando...</div>
          ) : expedientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No hay expedientes en esta categoría</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expediente</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Serie</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Próxima transferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expedientes.map(exp => (
                  <tr key={exp.id} onClick={() => setSelectedExp(exp)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{exp.codigo_expediente}</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{exp.titulo}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-600">{exp.serie_nombre}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {exp.foliado && exp.expurgado ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                            <CheckCircle size={12} /> Listo para transferir
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                            <AlertTriangle size={12} /> Falta {!exp.expurgado ? 'expurgo' : 'foliación'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock size={12} />
                        {exp.fecha_limite_categoria ? new Date(exp.fecha_limite_categoria).toLocaleDateString('es-EC') : 'Sin definir'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">Historial de transferencias documentales</span>
          </div>
          {transferencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Send size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No hay transferencias registradas</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Memorando</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expedientes</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transferencias.map((t: Transferencia) => {
                  const est = ESTADO_TRANSFERENCIA[t.estado] ?? ESTADO_TRANSFERENCIA.borrador
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-xs font-medium text-gray-700">
                        {TIPO_TRANSFERENCIA[t.tipo]?.label ?? t.tipo}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">{t.unidad_nombre}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-600">{t.numero_memorando || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{t.total_expedientes}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: est.bg, color: est.text }}>
                          {est.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{selectedExp.codigo_expediente}</p>
                <h3 className="font-bold text-gray-900 text-sm mt-0.5">{selectedExp.titulo}</h3>
              </div>
              <button onClick={() => setSelectedExp(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: selectedExp.expurgado ? '#f0fdf4' : '#fef2f2' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: selectedExp.expurgado ? '#15803d' : '#dc2626' }}>
                    Expurgo
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedExp.expurgado ? `Realizado el ${new Date(selectedExp.fecha_expurgo!).toLocaleDateString('es-EC')}` : 'Pendiente'}
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: selectedExp.foliado ? '#f0fdf4' : '#fef2f2' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: selectedExp.foliado ? '#15803d' : '#dc2626' }}>
                    Foliación
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedExp.foliado ? `${selectedExp.num_fojas} fojas — ${new Date(selectedExp.fecha_foliacion!).toLocaleDateString('es-EC')}` : 'Pendiente'}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-800">
                  Conforme al Art. 33-35 de la Regla Técnica, el expediente debe expurgarse y foliarse antes de cerrarse o transferirse.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              {!selectedExp.expurgado && (
                <ExpurgarButton expediente={selectedExp} onDone={() => setSelectedExp(null)} />
              )}
              {selectedExp.expurgado && !selectedExp.foliado && (
                <FoliarButton expediente={selectedExp} onDone={() => setSelectedExp(null)} />
              )}
              {selectedExp.expurgado && selectedExp.foliado && selectedExp.estado === 'abierto' && (
                <CerrarButton expediente={selectedExp} onDone={() => setSelectedExp(null)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}