import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import {
  BookOpen, FileCheck, Plus, X, Search, RefreshCw,
  CheckCircle, Clock, AlertTriangle, XCircle,
  ArrowLeftRight, Stamp, Eye, Calendar, User
} from 'lucide-react'

type PagedResult = { results: any[]; count: number }

const prestamosService = {
  listar: (params?: Record<string, string>): Promise<PagedResult> =>
    api.get('/archivo/prestamos/', { params }).then(r => r.data as PagedResult),
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
  listar: (params?: Record<string, string>): Promise<PagedResult> =>
    api.get('/archivo/copias-certificadas/', { params }).then(r => r.data as PagedResult),
  crear: (data: any) =>
    api.post('/archivo/copias-certificadas/', data).then(r => r.data),
}

const expedientesService = {
  listar: (search?: string): Promise<any[]> =>
    api.get('/archivo/expedientes/', {
      params: { search, estado: 'abierto' }
    }).then(r => { const d = r.data as any; return Array.isArray(d) ? d : (d.results ?? []) }),
}

// Colores semánticos fijos de estados de préstamo
const ESTADO_PRESTAMO: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  activo:     { bg: '#eff6ff', text: '#1d4ed8', label: 'Activo',     icon: Clock },
  devuelto:   { bg: '#f0fdf4', text: '#15803d', label: 'Devuelto',   icon: CheckCircle },
  vencido:    { bg: '#fef2f2', text: '#dc2626', label: 'Vencido',    icon: AlertTriangle },
  extraviado: { bg: '#faf5ff', text: '#7e22ce', label: 'Extraviado', icon: XCircle },
}

function useTheme() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const inputStyle: React.CSSProperties = { background: T.rowBg, color: T.rowTxt, border: `0.5px solid ${T.rowBd}`, outline: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 6 }
  return { T, inputStyle, labelStyle }
}

function ModalNuevoPrestamo({ onClose }: { onClose: () => void }) {
  const { T, inputStyle, labelStyle } = useTheme()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `0.5px solid ${T.rowBd}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.rowSel }}>
              <BookOpen size={15} style={{ color: T.accentDk }} />
            </div>
            <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>Nuevo préstamo documental</h3>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: T.rowHv, border: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#dc2626' }}>{error}</div>}

          <div>
            <label style={labelStyle}>Buscar expediente *</label>
            <input style={inputStyle} placeholder="Código o título del expediente..."
              value={busqExp} onChange={e => setBusqExp(e.target.value)} />
            {expedientes && expedientes.length > 0 && !form.expediente && (
              <div style={{ marginTop: 4, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, overflow: 'hidden' }}>
                {(expedientes as any[]).slice(0, 5).map((exp: any) => (
                  <div key={exp.id}
                    onClick={() => { set('expediente', exp.id); setBusqExp(exp.codigo_expediente + ' — ' + exp.titulo) }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: `0.5px solid ${T.rowBd}`, background: T.ctHdrBg, color: T.rowTxt }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.rowSel)}
                    onMouseLeave={e => (e.currentTarget.style.background = T.ctHdrBg)}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.accentDk, fontWeight: 700 }}>{exp.codigo_expediente}</span>
                    <span style={{ marginLeft: 8 }}>{exp.titulo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Fecha de devolución esperada *</label>
            <input type="date" style={inputStyle} value={form.fecha_devolucion_esperada ?? ''} onChange={e => set('fecha_devolucion_esperada', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Observaciones</label>
            <textarea style={{ ...inputStyle, resize: 'none' }} rows={3}
              placeholder="Motivo del préstamo, condiciones especiales..."
              value={form.observaciones ?? ''} onChange={e => set('observaciones', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: `0.5px solid ${T.rowBd}` }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: T.rowSub, background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>
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
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: mutation.isPending ? '#94a3b8' : T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
            {mutation.isPending
              ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Registrando...</>
              : <><Plus size={15} /> Registrar préstamo</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalNuevaCopia({ onClose }: { onClose: () => void }) {
  const { T, inputStyle, labelStyle } = useTheme()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `0.5px solid ${T.rowBd}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
              <Stamp size={15} style={{ color: '#15803d' }} />
            </div>
            <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>Emitir copia certificada</h3>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: T.rowHv, border: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#dc2626' }}>{error}</div>}

          <div>
            <label style={labelStyle}>Buscar expediente *</label>
            <input style={inputStyle} placeholder="Código o título del expediente..."
              value={busqExp} onChange={e => setBusqExp(e.target.value)} />
            {expedientes && expedientes.length > 0 && !form.expediente && (
              <div style={{ marginTop: 4, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, overflow: 'hidden' }}>
                {(expedientes as any[]).slice(0, 5).map((exp: any) => (
                  <div key={exp.id}
                    onClick={() => { set('expediente', exp.id); setBusqExp(exp.codigo_expediente + ' — ' + exp.titulo) }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: `0.5px solid ${T.rowBd}`, background: T.ctHdrBg, color: T.rowTxt }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                    onMouseLeave={e => (e.currentTarget.style.background = T.ctHdrBg)}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#15803d', fontWeight: 700 }}>{exp.codigo_expediente}</span>
                    <span style={{ marginLeft: 8 }}>{exp.titulo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nombre solicitante *</label>
              <input style={inputStyle} placeholder="Nombre completo"
                value={form.solicitante_nombre ?? ''} onChange={e => set('solicitante_nombre', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Cédula / RUC</label>
              <input style={inputStyle} placeholder="0000000000"
                value={form.solicitante_cedula ?? ''} onChange={e => set('solicitante_cedula', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Número de fojas *</label>
            <input type="number" style={inputStyle} placeholder="Ej: 5"
              value={form.numero_fojas ?? ''} onChange={e => set('numero_fojas', Number(e.target.value))} />
          </div>

          <div>
            <label style={labelStyle}>Motivo de la solicitud</label>
            <textarea style={{ ...inputStyle, resize: 'none' }} rows={3}
              placeholder="¿Para qué se necesita la copia certificada?"
              value={form.motivo ?? ''} onChange={e => set('motivo', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: `0.5px solid ${T.rowBd}` }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: T.rowSub, background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>
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
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: mutation.isPending ? '#94a3b8' : '#15803d', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
            {mutation.isPending
              ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Emitiendo...</>
              : <><Stamp size={15} /> Emitir copia</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabPrestamos() {
  const { T } = useTheme()
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: T.accentDk, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
          <Plus size={14} /> Nuevo préstamo
        </button>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
          <input placeholder="Buscar por expediente o solicitante..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 26px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, background: T.rowBg, color: T.rowTxt, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: '7px 10px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, background: T.rowBg, color: T.rowTxt, outline: 'none' }}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_PRESTAMO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => refetch()}
          style={{ width: 30, height: 30, borderRadius: 8, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub }}>
          <RefreshCw size={13} />
        </button>
      </div>

      <div style={{ fontSize: 11, color: T.rowSub, marginBottom: 8 }}>
        {data?.count ?? 0} préstamos registrados
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: T.rowSub, fontSize: 12 }}>Cargando...</div>
      ) : prestamos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: T.rowSub }}>
          <BookOpen size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
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
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `0.5px solid ${vencido ? '#fecaca' : T.rowBd}`, background: vencido ? '#fef9f9' : T.ctHdrBg }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: est.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EstIcon size={16} style={{ color: est.text }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: 0 }}>
                    {p.expediente_codigo || p.expediente}
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: T.rowSub, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <User size={9} /> {p.solicitante_nombre || '—'}
                    </span>
                    <span style={{ fontSize: 10, color: T.rowSub, display: 'flex', alignItems: 'center', gap: 3 }}>
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
                          style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDevolviendo(p.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: T.accentDk, background: T.rowSel, border: `0.5px solid ${T.accentDk}50`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
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

function TabCopias() {
  const { T } = useTheme()
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
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
          <input placeholder="Buscar por expediente o solicitante..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 26px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, background: T.rowBg, color: T.rowTxt, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => refetch()}
          style={{ width: 30, height: 30, borderRadius: 8, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub }}>
          <RefreshCw size={13} />
        </button>
      </div>

      <div style={{ fontSize: 11, color: T.rowSub, marginBottom: 8 }}>
        {data?.count ?? 0} copias certificadas emitidas
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: T.rowSub, fontSize: 12 }}>Cargando...</div>
      ) : copias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: T.rowSub }}>
          <FileCheck size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
          <p style={{ fontSize: 12 }}>No hay copias certificadas emitidas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {copias.map((c: any) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `0.5px solid ${T.rowBd}`, background: T.ctHdrBg }}
              onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
              onMouseLeave={e => (e.currentTarget.style.background = T.ctHdrBg)}>
              <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stamp size={16} style={{ color: '#15803d' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: 0 }}>
                  {c.expediente_codigo || c.expediente}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: T.rowSub, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <User size={9} /> {c.solicitante_nombre}
                    {c.solicitante_cedula && ` · ${c.solicitante_cedula}`}
                  </span>
                  <span style={{ fontSize: 10, color: T.rowSub, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Eye size={9} /> {c.numero_fojas} {c.numero_fojas === 1 ? 'foja' : 'fojas'}
                  </span>
                  <span style={{ fontSize: 10, color: T.rowSub, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Calendar size={9} /> {new Date(c.fecha_emision).toLocaleDateString('es-EC')}
                  </span>
                </div>
                {c.motivo && (
                  <p style={{ fontSize: 10, color: T.rowSub, marginTop: 2, fontStyle: 'italic' }}>{c.motivo}</p>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#15803d', flexShrink: 0 }}>
                Emitida
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PrestamosCopiasCertificadasPage() {
  const { T } = useTheme()
  const [tab, setTab] = useState<'prestamos' | 'copias'>('prestamos')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: T.rowTxt, margin: 0 }}>
          Préstamo documental y copias certificadas
        </h1>
        <p style={{ fontSize: 12, color: T.rowSub, marginTop: 4 }}>
          Gestión de préstamos y emisión de copias conforme Art. 60-63 de la Regla Técnica Nacional
        </p>
      </div>

      <div style={{ display: 'flex', background: T.ctHdrBg, borderRadius: 14, border: `0.5px solid ${T.rowBd}`, overflow: 'hidden', marginBottom: 16 }}>
        {[
          { key: 'prestamos', label: 'Préstamo documental', icon: BookOpen,  color: T.accentDk },
          { key: 'copias',    label: 'Copias certificadas', icon: FileCheck, color: '#15803d' },
        ].map(({ key, label, icon: Icon, color }) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === key ? T.ctHdrBg : T.rowHv,
              color: tab === key ? color : T.rowSub,
              borderBottom: `2px solid ${tab === key ? color : 'transparent'}`,
              transition: 'all .15s',
            }}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: T.ctHdrBg, borderRadius: 14, border: `0.5px solid ${T.rowBd}`, padding: 20 }}>
        {tab === 'prestamos' ? <TabPrestamos /> : <TabCopias />}
      </div>
    </div>
  )
}
