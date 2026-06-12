import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tramitesService, Tramite } from '@/services/tramites.service'
import { organizacionService } from '@/services/organizacion.service'
import AdjuntosPanel from '@/components/ui/AdjuntosPanel'
import {
  ClipboardList, Search, Plus, X,
  Clock, CheckCircle, AlertTriangle,
  User, Building2, Calendar, ChevronRight
} from 'lucide-react'

const ESTADOS: Record<string, { bg: string; text: string; label: string }> = {
  ingresado:     { bg: '#f0f9ff', text: '#0369a1', label: 'Ingresado' },
  asignado:      { bg: '#faf5ff', text: '#7e22ce', label: 'Asignado' },
  en_proceso:    { bg: '#eff6ff', text: '#1d4ed8', label: 'En proceso' },
  en_inspeccion: { bg: '#fff7ed', text: '#c2410c', label: 'En inspección' },
  resuelto:      { bg: '#f0fdf4', text: '#15803d', label: 'Resuelto' },
  rechazado:     { bg: '#fef2f2', text: '#dc2626', label: 'Rechazado' },
  desistido:     { bg: '#f9fafb', text: '#6b7280', label: 'Desistido' },
  archivado:     { bg: '#f9fafb', text: '#6b7280', label: 'Archivado' },
}

const PRIORIDAD: Record<string, { color: string; label: string }> = {
  normal:      { color: '#9ca3af', label: 'Normal' },
  urgente:     { color: '#f59e0b', label: 'Urgente' },
  muy_urgente: { color: '#ef4444', label: 'Muy urgente' },
}

function DiasRestantes({ dias }: { dias: number | null }) {
  if (dias === null) return null
  if (dias < 0)   return <span className="text-xs font-bold text-red-600">Vencido {Math.abs(dias)}d</span>
  if (dias === 0) return <span className="text-xs font-bold text-red-500">Vence hoy</span>
  if (dias <= 3)  return <span className="text-xs font-bold text-amber-600">{dias}d restantes</span>
  return <span className="text-xs text-gray-400">{dias}d restantes</span>
}

function ModalNuevoTramite({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [paso, setPaso]                   = useState(1)
  const [cedula, setCedula]               = useState('')
  const [persona, setPersona]             = useState<any>(null)
  const [personaNueva, setPersonaNueva]   = useState(false)
  const [formPersona, setFormPersona]     = useState<Record<string, any>>({})
  const [formTramite, setFormTramite]     = useState<Record<string, any>>({ canal_ingreso: 'ventanilla', prioridad: 'normal' })
  const [error, setError]                 = useState('')
  const [buscando, setBuscando]           = useState(false)

  const { data: categorias } = useQuery({ queryKey: ['categorias'],       queryFn: tramitesService.categorias })
  const { data: unidades }   = useQuery({ queryKey: ['unidades-select'],  queryFn: () => organizacionService.select() })
  const { data: tipos }      = useQuery({
    queryKey: ['tipos', formTramite.categoria],
    queryFn:  () => tramitesService.tipos({ categoria: formTramite.categoria }),
    enabled:  !!formTramite.categoria,
  })

  const crearMutation = useMutation({
    mutationFn: tramitesService.crear,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['tramites'] }); onClose() },
    onError:    (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al crear'),
  })

  const buscarPersona = async () => {
    if (!cedula.trim()) return
    setBuscando(true); setError('')
    try {
      const p = await tramitesService.buscarPersona(cedula)
      setPersona(p); setPersonaNueva(false)
    } catch {
      setPersonaNueva(true); setPersona(null)
      setFormPersona({ numero_identificacion: cedula })
    } finally { setBuscando(false) }
  }

  const handleSubmit = async () => {
    setError('')
    try {
      let personaId = persona?.id
      if (personaNueva) {
        const p = await tramitesService.crearPersona(formPersona)
        personaId = p.id
      }
      await crearMutation.mutateAsync({
        ...formTramite,
        persona:             personaId,
        unidad_receptora:    formTramite.unidad_receptora,
        unidad_responsable:  formTramite.unidad_responsable,
      })
    } catch {}
  }

  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#e8f1fd' }}>
              <ClipboardList size={15} style={{ color: '#002f6c' }} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Ingresar nuevo trámite</h3>
              <p className="text-xs text-gray-400">Paso {paso} de 3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-0 px-6 py-3 border-b border-gray-50">
          {['Ciudadano', 'Tipo de trámite', 'Datos del trámite'].map((label, i) => (
            <div key={label} className="flex items-center gap-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: paso > i + 1 ? '#0f6e56' : paso === i + 1 ? '#002f6c' : '#f3f4f6',
                    color: paso >= i + 1 ? '#fff' : '#9ca3af',
                  }}>
                  {paso > i + 1 ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium" style={{ color: paso === i + 1 ? '#002f6c' : '#9ca3af' }}>
                  {label}
                </span>
              </div>
              {i < 2 && <ChevronRight size={12} className="text-gray-300 mx-2 flex-shrink-0" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
          )}

          {paso === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Número de cédula / RUC
                </label>
                <div className="flex gap-2">
                  <input className={cls} placeholder="Ej: 0501234567"
                    value={cedula} onChange={e => setCedula(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buscarPersona()} />
                  <button onClick={buscarPersona} disabled={buscando}
                    className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex-shrink-0"
                    style={{ background: '#002f6c' }}>
                    {buscando ? '...' : 'Buscar'}
                  </button>
                </div>
              </div>

              {persona && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-800">
                      {persona.nombres[0]}{persona.apellidos[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">{persona.nombre_completo}</p>
                      <p className="text-xs text-green-700">{persona.numero_identificacion} · {persona.email}</p>
                    </div>
                    <CheckCircle size={18} className="text-green-600 ml-auto" />
                  </div>
                </div>
              )}

              {personaNueva && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs font-bold text-blue-800">Ciudadano no registrado — completa los datos:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Nombres *</label>
                      <input className={cls} placeholder="Nombres"
                        onChange={e => setFormPersona(f => ({ ...f, nombres: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Apellidos *</label>
                      <input className={cls} placeholder="Apellidos"
                        onChange={e => setFormPersona(f => ({ ...f, apellidos: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                      <input className={cls} type="email" placeholder="correo@ejemplo.com"
                        onChange={e => setFormPersona(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono</label>
                      <input className={cls} placeholder="0999999999"
                        onChange={e => setFormPersona(f => ({ ...f, telefono_movil: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Categoría</label>
                <select className={cls}
                  value={formTramite.categoria ?? ''}
                  onChange={e => setFormTramite(f => ({ ...f, categoria: e.target.value, tipo_tramite: '' }))}>
                  <option value="">— Selecciona una categoría —</option>
                  {categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {formTramite.categoria && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Tipo de trámite</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {tipos?.results?.map(t => (
                      <div key={t.id}
                        onClick={() => setFormTramite(f => ({ ...f, tipo_tramite: t.id }))}
                        className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                        style={{
                          borderColor: formTramite.tipo_tramite === t.id ? '#002f6c' : '#e5e7eb',
                          background:  formTramite.tipo_tramite === t.id ? '#e8f1fd' : '#fff',
                        }}>
                        <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5"
                          style={{
                            borderColor: formTramite.tipo_tramite === t.id ? '#002f6c' : '#d1d5db',
                            background:  formTramite.tipo_tramite === t.id ? '#002f6c' : '#fff',
                          }} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{t.nombre}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {t.unidad_responsable_siglas} · {t.dias_plazo} días hábiles
                            {t.costo > 0 && ` · $${t.costo}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {paso === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Asunto *</label>
                <input className={cls} placeholder="Descripción breve del trámite"
                  value={formTramite.asunto ?? ''}
                  onChange={e => setFormTramite(f => ({ ...f, asunto: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Detalle</label>
                <textarea className={cls + ' resize-none'} rows={3}
                  placeholder="Información adicional del trámite..."
                  value={formTramite.detalle ?? ''}
                  onChange={e => setFormTramite(f => ({ ...f, detalle: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Canal</label>
                  <select className={cls}
                    value={formTramite.canal_ingreso}
                    onChange={e => setFormTramite(f => ({ ...f, canal_ingreso: e.target.value }))}>
                    <option value="ventanilla">Ventanilla</option>
                    <option value="web">Portal web</option>
                    <option value="email">Correo</option>
                    <option value="oficio">Oficio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Prioridad</label>
                  <select className={cls}
                    value={formTramite.prioridad}
                    onChange={e => setFormTramite(f => ({ ...f, prioridad: e.target.value }))}>
                    <option value="normal">Normal</option>
                    <option value="urgente">Urgente</option>
                    <option value="muy_urgente">Muy urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad receptora</label>
                <select className={cls}
                  value={formTramite.unidad_receptora ?? ''}
                  onChange={e => setFormTramite(f => ({ ...f, unidad_receptora: e.target.value }))}>
                  <option value="">— Selecciona —</option>
                  {unidades?.map(u => (
                    <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => paso > 1 ? setPaso(p => p - 1) : onClose()}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            {paso === 1 ? 'Cancelar' : '← Anterior'}
          </button>
          {paso < 3 ? (
            <button
              onClick={() => {
                if (paso === 1 && !persona && !personaNueva) { setError('Busca un ciudadano primero.'); return }
                if (paso === 2 && !formTramite.tipo_tramite) { setError('Selecciona un tipo de trámite.'); return }
                setError(''); setPaso(p => p + 1)
              }}
              className="px-4 py-2.5 text-sm font-bold text-white rounded-xl"
              style={{ background: '#002f6c' }}>
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={crearMutation.isPending}
              className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
              style={{ background: crearMutation.isPending ? '#4a90e2' : '#002f6c' }}>
              {crearMutation.isPending
                ? <><span className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Guardando...</>
                : <><Plus size={15} /> Registrar trámite</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TramitesPage() {
  const [busqueda, setBusqueda]               = useState('')
  const [filtroEstado, setFiltro]             = useState('')
  const [modalAbierto, setModal]              = useState(false)
  const [selectedTramite, setSelectedTramite] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['tramites', busqueda, filtroEstado],
    queryFn: () => tramitesService.listar({
      ...(busqueda     ? { search: busqueda }     : {}),
      ...(filtroEstado ? { estado: filtroEstado } : {}),
    }),
  })

  const tramites = data?.results ?? []

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* Contenido principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {modalAbierto && <ModalNuevoTramite onClose={() => setModal(false)} />}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trámites ciudadanos</h1>
            <p className="text-sm text-gray-400 mt-0.5">{data?.count ?? 0} trámites registrados</p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl"
            style={{ background: '#002f6c' }}>
            <Plus size={15} /> Nuevo trámite
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por número, nombre, cédula..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10" />
          </div>
          <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] bg-white">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Cargando trámites...</div>
          ) : tramites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ClipboardList size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No se encontraron trámites</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trámite</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ciudadano</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plazo</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tramites.map(t => {
                  const est   = ESTADOS[t.estado] ?? ESTADOS.ingresado
                  const pri   = PRIORIDAD[t.prioridad]
                  const isSel = selectedTramite?.id === t.id
                  return (
                    <tr key={t.id}
                      onClick={() => setSelectedTramite(isSel ? null : t)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      style={{ background: isSel ? '#e8f1fd' : 'transparent' }}>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-bold font-mono" style={{ color: '#002f6c' }}>{t.numero_tramite}</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5 max-w-[220px] truncate">{t.asunto}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: '#f3f4f6', color: '#6b7280' }}>
                            {t.categoria_nombre}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: pri.color }} title={pri.label} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-900 font-medium">{t.persona_nombre}</p>
                            <p className="text-xs text-gray-400">{t.persona_identificacion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-600 font-medium">{t.unidad_responsable_siglas}</span>
                        </div>
                        {t.analista_nombre && (
                          <p className="text-xs text-gray-400 mt-0.5">{t.analista_nombre}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{new Date(t.fecha_limite).toLocaleDateString('es-EC')}</span>
                        </div>
                        <div className="mt-0.5">
                          <DiasRestantes dias={t.dias_restantes} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: est.bg, color: est.text }}>
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
      </div>

      {/* Panel adjuntos lateral */}
      {selectedTramite && (
        <div style={{
          width: 280, flexShrink: 0,
          background: '#fff', borderRadius: 14,
          border: '0.5px solid #e5e7eb',
          padding: 16, position: 'sticky', top: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#002f6c', fontFamily: 'monospace', margin: 0 }}>
                {selectedTramite.numero_tramite}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0a1628', margin: '3px 0 0', lineHeight: 1.3 }}>
                {selectedTramite.asunto}
              </p>
            </div>
            <button onClick={() => setSelectedTramite(null)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, flexShrink: 0, marginLeft: 8 }}>
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: (ESTADOS[selectedTramite.estado] ?? ESTADOS.ingresado).bg,
              color: (ESTADOS[selectedTramite.estado] ?? ESTADOS.ingresado).text,
            }}>
              {(ESTADOS[selectedTramite.estado] ?? ESTADOS.ingresado).label}
            </span>
          </div>

          <div style={{ borderTop: '0.5px solid #f5f6f8', paddingTop: 12 }}>
            <AdjuntosPanel tramiteId={selectedTramite.id} />
          </div>
        </div>
      )}
    </div>
  )
}