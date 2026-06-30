import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import {
  BookOpen, FileCheck, Plus, X, Search, RefreshCw,
  CheckCircle, Clock, AlertTriangle, XCircle,
  ArrowLeftRight, Stamp, Eye, Calendar, User
} from 'lucide-react'

// ── Servicios ─────────────────────────────────────────────────────────

const prestamosService = {
  listar: (params?: Record<string, string>) =>
    api.get<{ results: any[]; count: number }>('/archivo/prestamos/', { params }).then(r => r.data),
  crear: (data: any) =>
    api.post('/archivo/prestamos/', data).then(r => r.data),
  devolver: (id: number, observaciones?: string) =>
    api.patch(`/archivo/prestamos/${id}/`, {
      estado: 'devuelto',
      fecha_devolucion_real: new Date().toISOString().split('T')[0],
      observaciones,
    }).then(r => r.data),
}

const copiasCertificadasService = {
  listar: (params?: Record<string, string>) =>
    api.get<{ results: any[]; count: number }>('/archivo/copias-certificadas/', { params }).then(r => r.data),
  crear: (data: any) =>
    api.post('/archivo/copias-certificadas/', data).then(r => r.data),
}

const expedientesService = {
  listar: (search?: string) =>
    api.get<any[]>('/archivo/expedientes/', {
      params: { search, estado: 'abierto' }
    }).then(r => Array.isArray(r.data) ? r.data : r.data.results ?? []),
}

// ── Constantes ────────────────────────────────────────────────────────

const ESTADO_PRESTAMO: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  activo:     { bg: '#eff6ff', text: '#1d4ed8', label: 'Activo',     icon: Clock },
  devuelto:   { bg: '#f0fdf4', text: '#15803d', label: 'Devuelto',   icon: CheckCircle },
  vencido:    { bg: '#fef2f2', text: '#dc2626', label: 'Vencido',    icon: AlertTriangle },
  extraviado: { bg: '#faf5ff', text: '#7e22ce', label: 'Extraviado', icon: XCircle },
}

// ── Modal nuevo préstamo ──────────────────────────────────────────────

function ModalNuevoPrestamo({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const [busqExp, setBusqExp] = useState('')

  const { data: expedientes } = useQuery({
    queryKey: ['expedientes-selector', busqExp],
    queryFn: () => expedientesService.listar(busqExp),
    enabled: busqExp.length >= 2 || busqExp.length === 0,
  })

  const mutation = useMutation({
    mutationFn: (data: any) => prestamosService.crear(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prestamos'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al registrar préstamo'),
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#e8f1fd' }}>
              <BookOpen size={15} style={{ color: '#002f6c' }} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Nuevo préstamo documental</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Buscar expediente *</label>
            <input className={cls} placeholder="Código o título del expediente..."
              value={busqExp} onChange={e => setBusqExp(e.target.value)} />
            {expedientes && expedientes.length > 0 && !form.expediente && (
              <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {expedientes.slice(0, 5).map((exp: any) => (
                  <div key={exp.id}
                    onClick={() => { set('expediente', exp.id); setBusqExp(exp.codigo_expediente + ' — ' + exp.titulo) }}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-0">
                    <span className="font-mono text-xs text-[#002f6c] font-bold">{exp.codigo_expediente}</span>
                    <span className="ml-2 text-gray-600">{exp.titulo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Fecha de devolución esperada *</label>
            <input type="date" className={cls}
              value={form.fecha_devolucion_esperada ?? ''}
              onChange={e => set('fecha_devolucion_esperada', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Observaciones</label>
            <textarea className={cls + ' resize-none'} rows={3}
              placeholder="Motivo del préstamo, condiciones especiales..."
              value={form.observaciones ?? ''} onChange={e => set('observaciones', e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!form.expediente || !form.fecha_devolucion_esperada) {
                setError('Selecciona un expediente y la fecha de devolución'); return
              }
              mutation.mutate(form)
            }}
            disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
            style={{ background: mutation.isPending ? '#4a90e2' : '#002f6c' }}>
            {mutation.isPending
              ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Registrando...</>
              : <><Plus size={15} /> Registrar préstamo</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal nueva copia certificada ─────────────────────────────────────

function ModalNuevaCopia({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const [busqExp, setBusqExp] = useState('')

  const { data: expedientes } = useQuery({
    queryKey: ['expedientes-selector-copia', busqExp],
    queryFn: () => expedientesService.listar(busqExp),
    enabled: busqExp.length >= 2 || busqExp.length === 0,
  })

  const mutation = useMutation({
    mutationFn: (data: any) => copiasCertificadasService.crear(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['copias'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al registrar copia'),
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
              <Stamp size={15} style={{ color: '#15803d' }} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Emitir copia certificada</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Buscar expediente *</label>
            <input className={cls} placeholder="Código o título del expediente..."
              value={busqExp} onChange={e => setBusqExp(e.target.value)} />
            {expedientes && expedientes.length > 0 && !form.expediente && (
              <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {expedientes.slice(0, 5).map((exp: any) => (
                  <div key={exp.id}
                    onClick={() => { set('expediente', exp.id); setBusqExp(exp.codigo_expediente + ' — ' + exp.titulo) }}
                    className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm border-b border-gray-100 last:border-0">
                    <span className="font-mono text-xs text-[#15803d] font-bold">{exp.codigo_expediente}</span>
                    <span className="ml-2 text-gray-600">{exp.titulo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nombre solicitante *</label>
              <input className={cls} placeholder="Nombre completo"
                value={form.solicitante_nombre ?? ''} onChange={e => set('solicitante_nombre', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Cédula / RUC</label>
              <input className={cls} placeholder="0000000000"
                value={form.solicitante_cedula ?? ''} onChange={e => set('solicitante_cedula', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Número de fojas *</label>
            <input type="number" className={cls} placeholder="Ej: 5"
              value={form.numero_fojas ?? ''} onChange={e => set('numero_fojas', Number(e.target.value))} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Motivo de la solicitud</label>
            <textarea className={cls + ' resize-none'} rows={3}
              placeholder="¿Para qué se necesita la copia certificada?"
              value={form.motivo ?? ''} onChange={e => set('motivo', e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!form.expediente || !form.solicitante_nombre || !form.numero_fojas) {
                setError('Completa los campos obligatorios'); return
              }
              mutation.mutate(form)
            }}
            disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
            style={{ background: mutation.isPending ? '#4a90e2' : '#15803d' }}>
            {mutation.isPending
              ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Emitiendo...</>
              : <><Stamp size={15} /> Emitir copia</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab Préstamos ─────────────────────────────────────────────────────

function TabPrestamos() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [devolviendo, setDevolviendo] = useState<number | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['prestamos', busqueda, filtroEstado],
    queryFn: () => prestamosService.listar({
      ...(busqueda ? { search: busqueda } : {}),
      ...(filtroEstado ? { estado: filtroEstado } : {}),
    }),
  })

  const devolver = useMutation({
    mutationFn: (id: number) => prestamosService.devolver(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prestamos'] }); setDevolviendo(null) },
  })

  const prestamos = data?.results ?? []

  return (
    <div>
      {modal && <ModalNuevoPrestamo onClose={() => setModal(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#002f6c', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
          <Plus size={14} /> Nuevo préstamo
        </button>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
          <input placeholder="Buscar por expediente o solicitante..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 26px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }} />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '7px 10px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_PRESTAMO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => refetch()}
          style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          <RefreshCw size={13} />
        </button>
      </div>

      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
        {data?.count ?? 0} préstamos registrados
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 12 }}>Cargando...</div>
      ) : prestamos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#c4c9d4' }}>
          <BookOpen size={32} style={{ opacity: .3, margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12 }}>No hay préstamos registrados</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {prestamos.map((p: any) => {
            const est = ESTADO_PRESTAMO[p.estado] ?? ESTADO_PRESTAMO.activo
            const EstIcon = est.icon
            const hoy = new Date().toISOString().split('T')[0]
            const vencido = p.estado === 'activo' && p.fecha_devolucion_esperada < hoy
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                border: `0.5px solid ${vencido ? '#fecaca' : '#f0f0f0'}`,
                background: vencido ? '#fef9f9' : '#fff',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: est.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <EstIcon size={16} style={{ color: est.text }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0a1628', margin: 0 }}>
                    {p.expediente_codigo || p.expediente}
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <User size={9} /> {p.solicitante_nombre || '—'}
                    </span>
                    <span style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={9} /> Vence: {p.fecha_devolucion_esperada}
                    </span>
                    {p.fecha_devolucion_real && (
                      <span style={{ fontSize: 10, color: '#15803d', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle size={9} /> Devuelto: {p.fecha_devolucion_real}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: est.bg, color: est.text }}>
                    {est.label}
                  </span>
                  {p.estado === 'activo' && (
                    devolviendo === p.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => devolver.mutate(p.id)}
                          style={{ fontSize: 11, fontWeight: 600, color: '#15803d', background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
                          Confirmar
                        </button>
                        <button onClick={() => setDevolviendo(null)}
                          style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDevolviendo(p.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#002f6c', background: '#e8f1fd', border: '0.5px solid #93c5fd', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
                        <ArrowLeftRight size={11} /> Devolver
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab Copias Certificadas ───────────────────────────────────────────

function TabCopias() {
  const [modal, setModal] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['copias', busqueda],
    queryFn: () => copiasCertificadasService.listar(busqueda ? { search: busqueda } : {}),
  })

  const copias = data?.results ?? []

  return (
    <div>
      {modal && <ModalNuevaCopia onClose={() => setModal(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#15803d', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
          <Stamp size={14} /> Emitir copia certificada
        </button>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
          <input placeholder="Buscar por expediente o solicitante..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 26px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }} />
        </div>
        <button onClick={() => refetch()}
          style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          <RefreshCw size={13} />
        </button>
      </div>

      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
        {data?.count ?? 0} copias certificadas emitidas
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 12 }}>Cargando...</div>
      ) : copias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#c4c9d4' }}>
          <FileCheck size={32} style={{ opacity: .3, margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12 }}>No hay copias certificadas emitidas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {copias.map((c: any) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 10,
              border: '0.5px solid #f0f0f0', background: '#fff',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Stamp size={16} style={{ color: '#15803d' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0a1628', margin: 0 }}>
                  {c.expediente_codigo || c.expediente}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <User size={9} /> {c.solicitante_nombre}
                    {c.solicitante_cedula && ` · ${c.solicitante_cedula}`}
                  </span>
                  <span style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Eye size={9} /> {c.numero_fojas} {c.numero_fojas === 1 ? 'foja' : 'fojas'}
                  </span>
                  <span style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Calendar size={9} /> {new Date(c.fecha_emision).toLocaleDateString('es-EC')}
                  </span>
                </div>
                {c.motivo && (
                  <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, fontStyle: 'italic' }}>
                    {c.motivo}
                  </p>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#15803d' }}>
                  Emitida
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────

export default function PrestamosCopiasCertificadasPage() {
  const [tab, setTab] = useState<'prestamos' | 'copias'>('prestamos')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0 }}>
          Préstamo documental y copias certificadas
        </h1>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          Gestión de préstamos y emisión de copias conforme Art. 60-63 de la Regla Técnica Nacional
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', background: '#fff', borderRadius: 14,
        border: '0.5px solid #e5e7eb', overflow: 'hidden', marginBottom: 16,
      }}>
        {[
          { key: 'prestamos', label: 'Préstamo documental', icon: BookOpen, color: '#002f6c' },
          { key: 'copias',    label: 'Copias certificadas', icon: FileCheck, color: '#15803d' },
        ].map(({ key, label, icon: Icon, color }) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === key ? '#fff' : '#f9fafb',
              color: tab === key ? color : '#9ca3af',
              borderBottom: `2px solid ${tab === key ? color : 'transparent'}`,
              transition: 'all .15s',
            }}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{
        background: '#fff', borderRadius: 14,
        border: '0.5px solid #e5e7eb', padding: '20px 20px',
      }}>
        {tab === 'prestamos' ? <TabPrestamos /> : <TabCopias />}
      </div>
    </div>
  )
}