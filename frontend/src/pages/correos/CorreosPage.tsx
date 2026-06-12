import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { correosService } from '@/services/correos.service'
import { organizacionService } from '@/services/organizacion.service'
import AdjuntosPanel from '@/components/ui/AdjuntosPanel'
import {
  Inbox, Send, Archive, Clock, AlertCircle,
  Search, Plus, X, Eye, Download, Printer,
  ArrowRightLeft, Info, MessageSquare, ClipboardPlus,
  Signature, RefreshCw, CheckCircle, BarChart2,
  FilePlus, Mail
} from 'lucide-react'

const BANDEJAS = [
  { key: 'recibidos',  label: 'Recibidos',    icon: Inbox,       seccion: 'bandejas' },
  { key: 'enviados',   label: 'Enviados',      icon: Send,        seccion: 'bandejas' },
  { key: 'borradores', label: 'Borradores',    icon: Mail,        seccion: 'bandejas' },
  { key: 'archivados', label: 'Archivados',    icon: Archive,     seccion: 'bandejas' },
  { key: 'por_vencer', label: 'Por vencer',    icon: AlertCircle, seccion: 'otras' },
  { key: 'sin_resp',   label: 'Sin responder', icon: Clock,       seccion: 'otras' },
]

const ETIQUETA_COLORS: Record<string, { bg: string; text: string }> = {
  'Contraloría':  { bg: '#fef2f2', text: '#dc2626' },
  'Ministerios':  { bg: '#f0fdf4', text: '#15803d' },
  'Municipios':   { bg: '#faeeda', text: '#854f0b' },
  'Interno GAD':  { bg: '#f3f4f6', text: '#534ab7' },
  'Planificación':{ bg: '#e1f5ee', text: '#0f6e56' },
  'Financiero':   { bg: '#faeeda', text: '#854f0b' },
}

const ESTADOS: Record<string, { bg: string; text: string; label: string }> = {
  nuevo:      { bg: '#eff6ff', text: '#1d4ed8', label: 'Nuevo' },
  registrado: { bg: '#f0f9ff', text: '#0369a1', label: 'Registrado' },
  asignado:   { bg: '#faf5ff', text: '#7e22ce', label: 'Asignado' },
  en_proceso: { bg: '#fff7ed', text: '#c2410c', label: 'En proceso' },
  respondido: { bg: '#f0fdf4', text: '#15803d', label: 'Respondido' },
  archivado:  { bg: '#f9fafb', text: '#6b7280', label: 'Archivado' },
}

const ETAPAS_SEGUIMIENTO = [
  { key: 'recibido',   label: 'Recibido' },
  { key: 'registrado', label: 'Registrado' },
  { key: 'asignado',   label: 'Asignado' },
  { key: 'respuesta',  label: 'Respuesta' },
  { key: 'archivado',  label: 'Archivado' },
]

function ModalNuevoCorreo({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, any>>({ tipo: 'recibido', prioridad: 'normal', etiquetas: [] })
  const [error, setError] = useState('')

  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const mutation = useMutation({
    mutationFn: (data: any) => correosService.crear(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['correos'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#e8f1fd' }}>
              <Inbox size={15} style={{ color: '#002f6c' }} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Registrar correo institucional</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Tipo</label>
              <select className={cls} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="recibido">Recibido</option>
                <option value="enviado">Enviado</option>
                <option value="interno">Interno</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Prioridad</label>
              <select className={cls} value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
                <option value="muy_urgente">Muy urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Asunto *</label>
            <input className={cls} placeholder="Asunto del correo institucional"
              value={form.asunto ?? ''} onChange={e => set('asunto', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Remitente</label>
              <input className={cls} placeholder="Nombre del remitente"
                value={form.remitente_nombre ?? ''} onChange={e => set('remitente_nombre', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email remitente</label>
              <input className={cls} type="email" placeholder="correo@entidad.gob.ec"
                value={form.remitente_email ?? ''} onChange={e => set('remitente_email', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Institución remitente</label>
            <input className={cls} placeholder="Ej: Contraloría General del Estado"
              value={form.remitente_entidad ?? ''} onChange={e => set('remitente_entidad', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad destinataria</label>
            <select className={cls} value={form.unidad_destino ?? ''}
              onChange={e => set('unidad_destino', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">— Sin asignar —</option>
              {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Cuerpo del correo</label>
            <textarea className={cls + ' resize-none'} rows={4} placeholder="Contenido del correo..."
              value={form.cuerpo ?? ''} onChange={e => set('cuerpo', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Fecha límite de respuesta</label>
            <input type="date" className={cls}
              value={form.fecha_limite_resp ?? ''} onChange={e => set('fecha_limite_resp', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Etiqueta</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(ETIQUETA_COLORS).map(et => {
                const sel = form.etiquetas?.includes(et)
                const c   = ETIQUETA_COLORS[et]
                return (
                  <button key={et} type="button"
                    onClick={() => set('etiquetas', sel ? form.etiquetas.filter((e: string) => e !== et) : [...(form.etiquetas ?? []), et])}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full border transition-all"
                    style={{ background: sel ? c.bg : '#f9fafb', color: sel ? c.text : '#9ca3af', borderColor: sel ? c.text : '#e5e7eb' }}>
                    {et}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => { if (!form.asunto) { setError('El asunto es obligatorio'); return }; mutation.mutate(form) }}
            disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2"
            style={{ background: mutation.isPending ? '#4a90e2' : '#002f6c' }}>
            {mutation.isPending
              ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Registrando...</>
              : <><Plus size={15} /> Registrar correo</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function PanelDetalleCorreo({ correo, onClose }: { correo: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [respuesta, setRespuesta]         = useState('')
  const [tabCorreo, setTabCorreo]         = useState<'contenido' | 'adjuntos'>('contenido')

  const { data: detalle } = useQuery({
    queryKey: ['correo-detalle', correo.id],
    queryFn: () => correosService.obtener(correo.id),
  })

  const archivar = useMutation({
    mutationFn: () => correosService.archivar(correo.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['correos'] }); onClose() },
  })

  const responder = useMutation({
    mutationFn: () => correosService.responder(correo.id, respuesta),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['correos'] }); setRespuesta('') },
  })

  const est      = ESTADOS[correo.estado] ?? ESTADOS.nuevo
  const etapaActual = correo.estado === 'respondido' ? 'respuesta'
    : correo.estado === 'asignado'   ? 'asignado'
    : correo.estado === 'registrado' ? 'registrado'
    : correo.estado === 'archivado'  ? 'archivado'
    : 'recibido'
  const etapaIdx = ETAPAS_SEGUIMIENTO.findIndex(e => e.key === etapaActual)

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 420,
      background: '#fff', borderLeft: '0.5px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#002f6c' }}>
            {correo.numero_registro || '—'}
          </span>
          {correo.prioridad !== 'normal' && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#da291c', background: '#fef2f2', padding: '1px 6px', borderRadius: 10 }}>Urgente</span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: est.bg, color: est.text }}>{est.label}</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <X size={14} />
          </button>
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', lineHeight: 1.3, marginBottom: 10 }}>{correo.asunto}</p>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[
            { label: 'Reasignar',      icon: ArrowRightLeft, primary: true },
            { label: 'Informar',       icon: Info },
            { label: 'Archivar',       icon: Archive, action: () => archivar.mutate() },
            { label: 'Comentar',       icon: MessageSquare },
            { label: 'Nueva Tarea',    icon: ClipboardPlus },
            { label: 'Generar oficio', icon: FilePlus },
            { label: 'Crear trámite',  icon: ClipboardPlus },
          ].map(({ label, icon: Icon, primary, action }: any) => (
            <button key={label} onClick={action}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 8px', borderRadius: 8,
                border: `0.5px solid ${primary ? '#002f6c' : '#e5e7eb'}`,
                background: primary ? '#002f6c' : '#fff',
                color: primary ? '#fff' : '#374151',
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
              }}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Meta */}
      <div style={{ padding: '10px 14px', background: '#fafbfc', borderBottom: '0.5px solid #f5f6f8' }}>
        {[
          { label: 'De:',         value: correo.remitente_nombre || correo.remitente_email || '—' },
          { label: 'Institución:',value: correo.remitente_entidad || '—' },
          { label: 'Para:',       value: correo.unidad_destino_nombre || 'Sin asignar' },
          { label: 'Asignado a:', value: correo.usuario_asignado_nombre || 'Sin asignar' },
          { label: 'Fecha:',      value: new Date(correo.fecha_recepcion).toLocaleString('es-EC') },
          ...(correo.fecha_limite_resp ? [{ label: 'Vence:', value: new Date(correo.fecha_limite_resp).toLocaleDateString('es-EC'), danger: true }] : []),
        ].map(({ label, value, danger }: any) => (
          <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 11 }}>
            <span style={{ color: '#9ca3af', minWidth: 80, flexShrink: 0 }}>{label}</span>
            <span style={{ fontWeight: 500, color: danger ? '#da291c' : '#374151' }}>{value}</span>
          </div>
        ))}
        {(correo.etiquetas ?? []).length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {correo.etiquetas.map((et: string) => {
              const c = ETIQUETA_COLORS[et] ?? { bg: '#f3f4f6', text: '#6b7280' }
              return <span key={et} style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10, background: c.bg, color: c.text }}>{et}</span>
            })}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Seguimiento del correo</p>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {ETAPAS_SEGUIMIENTO.map((etapa, i) => {
            const done   = i <= etapaIdx
            const active = i === etapaIdx + 1
            const isLast = i === ETAPAS_SEGUIMIENTO.length - 1
            const seg    = detalle?.seguimientos?.find((s: any) => s.etapa === etapa.key)
            return (
              <div key={etapa.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {!isLast && (
                  <div style={{ position: 'absolute', top: 10, left: '50%', width: '100%', height: 1.5, background: done ? '#0f6e56' : '#e5e7eb', zIndex: 0 }} />
                )}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', zIndex: 1, position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                  background: done ? '#0f6e56' : active ? '#002f6c' : '#fff',
                  border: `1.5px solid ${done ? '#0f6e56' : active ? '#002f6c' : '#e5e7eb'}`,
                  color: done || active ? '#fff' : '#d1d5db',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <p style={{ fontSize: 9, marginTop: 3, textAlign: 'center', color: done ? '#0f6e56' : active ? '#002f6c' : '#9ca3af', fontWeight: done || active ? 600 : 400, lineHeight: 1.3 }}>
                  {etapa.label}
                  {seg && <><br /><span style={{ fontSize: 8, color: '#9ca3af', fontWeight: 400 }}>
                    {new Date(seg.creado_en).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                  </span></>}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid #f5f6f8', flexShrink: 0 }}>
        {[['contenido','Contenido'],['adjuntos','Adjuntos']].map(([k, l]) => (
          <button key={k} onClick={() => setTabCorreo(k as any)}
            style={{
              flex: 1, padding: '8px', fontSize: 11, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: tabCorreo === k ? '#fff' : '#fafbfc',
              color: tabCorreo === k ? '#002f6c' : '#9ca3af',
              borderBottom: `2px solid ${tabCorreo === k ? '#002f6c' : 'transparent'}`,
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Contenido tab */}
      <div style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
        {tabCorreo === 'contenido' ? (
          <div style={{ background: '#f8faff', border: '0.5px solid #e5e7eb', borderRadius: 8, padding: 14, minHeight: 120 }}>
            {detalle?.cuerpo
              ? <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{detalle.cuerpo}</p>
              : <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Sin contenido registrado.</p>
            }
          </div>
        ) : (
          <AdjuntosPanel correoId={correo.id} />
        )}
      </div>

      {/* Caja respuesta */}
      <div style={{ padding: '10px 14px', borderTop: '0.5px solid #f0f0f0' }}>
        <textarea
          value={respuesta}
          onChange={e => setRespuesta(e.target.value)}
          placeholder="Redacta tu respuesta institucional..."
          rows={2}
          style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#374151', background: '#fafbfc' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[Download, Printer].map((Icon, i) => (
              <button key={i} style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <Icon size={13} />
              </button>
            ))}
          </div>
          <button
            onClick={() => respuesta.trim() && responder.mutate()}
            disabled={!respuesta.trim() || responder.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px',
              background: respuesta.trim() ? '#002f6c' : '#e5e7eb',
              color: respuesta.trim() ? '#fff' : '#9ca3af',
              border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
              cursor: respuesta.trim() ? 'pointer' : 'not-allowed',
            }}>
            <Send size={13} /> Enviar respuesta
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CorreosPage() {
  const qc = useQueryClient()
  const [bandejaActiva, setBandeja]   = useState('recibidos')
  const [selected, setSelected]       = useState<any>(null)
  const [modal, setModal]             = useState(false)
  const [busqueda, setBusqueda]       = useState('')
  const [filtroLeido, setFiltroLeido] = useState('')

  const params: Record<string, string> = { ...(busqueda ? { search: busqueda } : {}) }
  if (bandejaActiva === 'recibidos') params.tipo  = 'recibido'
  if (bandejaActiva === 'enviados')  params.tipo  = 'enviado'
  if (filtroLeido)                   params.leido = filtroLeido

  const { data: stats } = useQuery({
    queryKey: ['correos-stats'],
    queryFn:  correosService.estadisticas,
    refetchInterval: 30000,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['correos', bandejaActiva, busqueda, filtroLeido],
    queryFn:  () => correosService.listar(params),
  })

  const marcarLeido = useMutation({
    mutationFn: (id: number) => correosService.marcarLeido(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['correos'] }),
  })

  const handleSelect = (c: any) => {
    setSelected(c)
    if (!c.leido) marcarLeido.mutate(c.id)
  }

  const correos = data?.results ?? []

  const getBadge = (key: string) => {
    if (key === 'recibidos')  return stats?.nuevos      ?? 0
    if (key === 'por_vencer') return stats?.por_vencer  ?? 0
    if (key === 'sin_resp')   return stats?.sin_responder ?? 0
    return 0
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '200px 1fr',
      height: 'calc(100vh - 96px)', borderRadius: 14,
      overflow: 'hidden', border: '0.5px solid #e5e7eb',
      background: '#fff', position: 'relative',
    }}>
      {modal && <ModalNuevoCorreo onClose={() => setModal(false)} />}

      {/* SIDEBAR */}
      <div style={{ background: '#f8faff', borderRight: '0.5px solid #eef0f5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 10px 4px' }}>
          <button onClick={() => setModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 12px', borderRadius: 10, background: '#002f6c', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', marginBottom: 4 }}>
            <Plus size={14} /> Registrar correo
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#b8bfc9', textTransform: 'uppercase', letterSpacing: '.08em', padding: '10px 12px 4px' }}>Bandejas</p>
          {BANDEJAS.map(({ key, label, icon: Icon }) => {
            const badge    = getBadge(key)
            const isActive = bandejaActiva === key
            return (
              <div key={key} onClick={() => { setBandeja(key); setSelected(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px',
                  cursor: 'pointer', fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#002f6c' : '#4b5563',
                  background: isActive ? '#e8f1fd' : 'transparent',
                  borderLeft: `2px solid ${isActive ? '#002f6c' : 'transparent'}`,
                }}>
                <Icon size={14} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: '#da291c', color: '#fff' }}>
                    {badge}
                  </span>
                )}
              </div>
            )
          })}

          <p style={{ fontSize: 9, fontWeight: 700, color: '#b8bfc9', textTransform: 'uppercase', letterSpacing: '.08em', padding: '10px 12px 4px' }}>Etiquetas</p>
          {Object.entries(ETIQUETA_COLORS).map(([label, c]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#4b5563' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.text, flexShrink: 0 }} />
              {label}
            </div>
          ))}

          <p style={{ fontSize: 9, fontWeight: 700, color: '#b8bfc9', textTransform: 'uppercase', letterSpacing: '.08em', padding: '10px 12px 4px' }}>Acciones rápidas</p>
          {[
            { label: 'Crear trámite',  icon: ClipboardPlus },
            { label: 'Generar oficio', icon: FilePlus },
            { label: 'Reportes',       icon: BarChart2 },
          ].map(({ label, icon: Icon }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: '#4b5563' }}>
              <Icon size={14} style={{ flexShrink: 0 }} /> {label}
            </div>
          ))}
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '0.5px solid #f5f6f8', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0a1628', flexShrink: 0 }}>
            {BANDEJAS.find(b => b.key === bandejaActiva)?.label ?? 'Correos'}
          </span>
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
            <input placeholder="Buscar por número, remitente, asunto..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 26px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }} />
          </div>
          <button onClick={() => refetch()}
            style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <RefreshCw size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderBottom: '0.5px solid #f5f6f8', background: '#fafbfc', flexShrink: 0, flexWrap: 'wrap' }}>
          {[
            { label: 'Reasignar',   icon: ArrowRightLeft },
            { label: 'Informar',    icon: Info },
            { label: 'Archivar',    icon: Archive },
            { label: 'Comentar',    icon: MessageSquare },
            { label: 'Nueva Tarea', icon: ClipboardPlus },
          ].map(({ label, icon: Icon }) => (
            <button key={label}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '5px 9px', borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', minWidth: 58 }}>
              <Icon size={17} />
              <span style={{ fontSize: 9, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
          <div style={{ width: 0.5, height: 36, background: '#e5e7eb', margin: '0 2px' }} />
          {[
            { label: 'Generar oficio', icon: FilePlus },
            { label: 'Crear trámite',  icon: ClipboardPlus },
            { label: 'Vista previa',   icon: Eye },
          ].map(({ label, icon: Icon }) => (
            <button key={label}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '5px 9px', borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', minWidth: 58 }}>
              <Icon size={17} />
              <span style={{ fontSize: 9, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
          <div style={{ width: 0.5, height: 36, background: '#e5e7eb', margin: '0 2px' }} />
          {[
            { label: 'Imprimir',  icon: Printer },
            { label: 'Descargar', icon: Download },
          ].map(({ label, icon: Icon }) => (
            <button key={label}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '5px 9px', borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', minWidth: 58 }}>
              <Icon size={17} />
              <span style={{ fontSize: 9, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {[['Todos',''], ['No leídos','false'], ['Urgentes','urgente']].map(([label, val]) => (
              <button key={label} onClick={() => setFiltroLeido(val)}
                style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: filtroLeido === val ? '#002f6c' : 'transparent', color: filtroLeido === val ? '#fff' : '#9ca3af' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '5px 14px', background: '#fafbfc', borderBottom: '0.5px solid #f5f6f8', fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
          No. de registros encontrados: <strong style={{ color: '#374151' }}>{data?.count ?? 0}</strong>
          &nbsp;|&nbsp; Bandeja: {BANDEJAS.find(b => b.key === bandejaActiva)?.label}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '20px 80px 1fr 120px 140px 110px', gap: 8, padding: '6px 12px', background: '#f9fafb', borderBottom: '0.5px solid #f5f6f8', position: 'sticky', top: 0, zIndex: 1 }}>
            {['','De','Asunto','Fecha','N° Registro','Estado'].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: '#9ca3af' }}>Cargando...</div>
          ) : correos.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, color: '#9ca3af' }}>
              <Mail size={28} style={{ opacity: .3, marginBottom: 8 }} />
              <p style={{ fontSize: 12 }}>Esta bandeja está vacía</p>
            </div>
          ) : correos.map((c: any) => {
            const est  = ESTADOS[c.estado] ?? ESTADOS.nuevo
            const isOn = selected?.id === c.id
            return (
              <div key={c.id} onClick={() => handleSelect(c)}
                style={{
                  display: 'grid', gridTemplateColumns: '20px 80px 1fr 120px 140px 110px',
                  gap: 8, padding: '8px 12px', borderBottom: '0.5px solid #f9fafb',
                  cursor: 'pointer', alignItems: 'center',
                  background: isOn ? '#e8f1fd' : 'transparent',
                  borderLeft: `2px solid ${!c.leido ? '#002f6c' : 'transparent'}`,
                }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: !c.leido ? '#002f6c' : 'transparent' }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.remitente_nombre || '—'}
                  </p>
                  <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.remitente_entidad || c.remitente_email || '—'}
                  </p>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: !c.leido ? 600 : 400, color: '#0a1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.asunto}
                    {c.prioridad !== 'normal' && (
                      <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#da291c', background: '#fef2f2', padding: '1px 5px', borderRadius: 10 }}>Urgente</span>
                    )}
                  </p>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                    {(c.etiquetas ?? []).slice(0, 2).map((et: string) => {
                      const ec = ETIQUETA_COLORS[et] ?? { bg: '#f3f4f6', text: '#6b7280' }
                      return <span key={et} style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 10, background: ec.bg, color: ec.text }}>{et}</span>
                    })}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  {new Date(c.fecha_recepcion).toLocaleDateString('es-EC')}
                </span>
                <span style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace', fontWeight: 500 }}>
                  {c.numero_registro || '—'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: est.bg, color: est.text, whiteSpace: 'nowrap' }}>
                  {est.label}
                </span>
              </div>
            )
          })}
        </div>

        {selected && <PanelDetalleCorreo correo={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}