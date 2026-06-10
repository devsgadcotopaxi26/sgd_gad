import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { correosService } from '@/services/correos.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  Inbox, Send, File, Archive, AlertCircle, Clock,
  Search, Plus, X, CornerUpLeft, CornerUpRight,
  ClipboardPlus, FilePlus, UserCheck, Flag,
  CheckCircle, Paperclip, Bold, Italic, Link,
  RefreshCw, SlidersHorizontal, Circle, BarChart2,
} from 'lucide-react'

const ESTADOS: Record<string, { bg: string; text: string; label: string }> = {
  nuevo:      { bg: '#eff6ff', text: '#1d4ed8', label: 'Nuevo' },
  registrado: { bg: '#f0f9ff', text: '#0369a1', label: 'Registrado' },
  asignado:   { bg: '#faf5ff', text: '#7e22ce', label: 'Asignado' },
  en_proceso: { bg: '#fff7ed', text: '#c2410c', label: 'En proceso' },
  respondido: { bg: '#f0fdf4', text: '#15803d', label: 'Respondido' },
  archivado:  { bg: '#f9fafb', text: '#6b7280', label: 'Archivado' },
}

const ETAPAS = [
  { key: 'recibido',   label: 'Recibido' },
  { key: 'registrado', label: 'Registrado' },
  { key: 'asignado',   label: 'Asignado' },
  { key: 'respuesta',  label: 'Respuesta' },
  { key: 'archivado',  label: 'Archivado' },
]

const ETIQUETA_COLORS: Record<string, { bg: string; text: string }> = {
  'Contraloría':   { bg: '#fef2f2', text: '#dc2626' },
  'Ministerios':   { bg: '#f0fdf4', text: '#15803d' },
  'Municipios':    { bg: '#faeeda', text: '#854f0b' },
  'Interno GAD':   { bg: '#f3f4f6', text: '#534ab7' },
  'Planificación': { bg: '#f0fdf4', text: '#0f6e56' },
  'Financiero':    { bg: '#faeeda', text: '#854f0b' },
}

const PRIORIDAD_COLOR: Record<string, string> = {
  normal:      '#9ca3af',
  urgente:     '#f59e0b',
  muy_urgente: '#ef4444',
}

function Avatar({ texto, bg, color }: { texto: string; bg: string; color: string }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      background: bg, color, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, flexShrink: 0,
    }}>
      {texto}
    </div>
  )
}

function TimelineCorreo({ seguimientos }: { seguimientos: any[] }) {
  const etapasCompletadas = new Set(seguimientos.map(s => s.etapa))
  const etapaActual = seguimientos[seguimientos.length - 1]?.etapa ?? ''

  return (
    <div style={{ padding: '10px 18px', borderBottom: '1px solid #f5f6f8', background: '#fafbfc' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={13} style={{ color: '#002f6c' }} /> Seguimiento del correo
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        {ETAPAS.map((etapa, i) => {
          const done    = etapasCompletadas.has(etapa.key)
          const active  = etapaActual === etapa.key
          const seg     = seguimientos.find(s => s.etapa === etapa.key)
          const isLast  = i === ETAPAS.length - 1
          return (
            <div key={etapa.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {!isLast && (
                <div style={{
                  position: 'absolute', top: 10, left: '50%', width: '100%', height: 2,
                  background: done ? '#0f6e56' : '#e5e7eb', zIndex: 0,
                }} />
              )}
              <div style={{
                width: 22, height: 22, borderRadius: '50%', zIndex: 1, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                background: done ? '#0f6e56' : active ? '#002f6c' : '#fff',
                border: `2px solid ${done ? '#0f6e56' : active ? '#002f6c' : '#e5e7eb'}`,
                color: done || active ? '#fff' : '#d1d5db',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <p style={{
                fontSize: 9, marginTop: 4, textAlign: 'center', fontWeight: active ? 700 : 500,
                color: done ? '#0f6e56' : active ? '#002f6c' : '#9ca3af',
              }}>
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
  )
}

function ModalNuevoCorreo({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, any>>({ tipo: 'recibido', prioridad: 'normal', etiquetas: [] })
  const [error, setError] = useState('')

  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const mutation = useMutation({
    mutationFn: (data: any) => correosService.crear(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['correos'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al registrar'),
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

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
              <select className={inputCls} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="recibido">Recibido</option>
                <option value="enviado">Enviado</option>
                <option value="interno">Interno</option>
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
            <input className={inputCls} placeholder="Asunto del correo institucional"
              value={form.asunto ?? ''} onChange={e => set('asunto', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Remitente</label>
              <input className={inputCls} placeholder="Nombre del remitente"
                value={form.remitente_nombre ?? ''} onChange={e => set('remitente_nombre', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email remitente</label>
              <input className={inputCls} type="email" placeholder="correo@entidad.gob.ec"
                value={form.remitente_email ?? ''} onChange={e => set('remitente_email', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Institución remitente</label>
            <input className={inputCls} placeholder="Ej: Contraloría General del Estado"
              value={form.remitente_entidad ?? ''} onChange={e => set('remitente_entidad', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad destinataria</label>
            <select className={inputCls} value={form.unidad_destino ?? ''}
              onChange={e => set('unidad_destino', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">— Sin asignar —</option>
              {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Cuerpo del correo</label>
            <textarea className={inputCls + ' resize-none'} rows={4}
              placeholder="Contenido del correo..."
              value={form.cuerpo ?? ''} onChange={e => set('cuerpo', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Fecha límite de respuesta</label>
            <input type="date" className={inputCls}
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
                    style={{
                      background: sel ? c.bg : '#f9fafb',
                      color: sel ? c.text : '#9ca3af',
                      borderColor: sel ? c.text : '#e5e7eb',
                    }}>
                    {et}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { if (!form.asunto) { setError('El asunto es obligatorio'); return }; mutation.mutate(form) }}
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

export default function CorreosPage() {
  const qc = useQueryClient()
  const [bandeja, setBandeja]       = useState('recibidos')
  const [selected, setSelected]     = useState<any>(null)
  const [modal, setModal]           = useState(false)
  const [busqueda, setBusqueda]     = useState('')
  const [tabLista, setTabLista]     = useState('todos')
  const [respuestaText, setRespuesta] = useState('')

  const params: Record<string, string> = { ...(busqueda ? { search: busqueda } : {}) }
  if (bandeja === 'recibidos') params.tipo = 'recibido'
  if (bandeja === 'enviados')  params.tipo = 'enviado'
  if (bandeja === 'internos')  params.tipo = 'interno'
  if (tabLista === 'no_leidos') params.leido = 'false'
  if (tabLista === 'urgentes')  params.prioridad = 'urgente'

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['correos', bandeja, busqueda, tabLista],
    queryFn: () => correosService.listar(params),
  })

  const { data: stats } = useQuery({
    queryKey: ['correos-stats'],
    queryFn: correosService.estadisticas,
    refetchInterval: 30000,
  })

  const { data: detalle } = useQuery({
    queryKey: ['correo-detalle', selected?.id],
    queryFn: () => correosService.obtener(selected!.id),
    enabled: !!selected?.id,
  })

  const marcarLeido = useMutation({
    mutationFn: (id: number) => correosService.marcarLeido(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['correos'] }); qc.invalidateQueries({ queryKey: ['correo-detalle', selected?.id] }) },
  })

  const responder = useMutation({
    mutationFn: ({ id, obs }: { id: number; obs: string }) => correosService.responder(id, obs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['correos'] })
      qc.invalidateQueries({ queryKey: ['correo-detalle', selected?.id] })
      setRespuesta('')
    },
  })

  const archivar = useMutation({
    mutationFn: (id: number) => correosService.archivar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['correos'] }); setSelected(null) },
  })

  const correos = data?.results ?? []

  const handleSelect = (c: any) => {
    setSelected(c)
    if (!c.leido) marcarLeido.mutate(c.id)
  }

  const SB_ITEMS = [
    { key: 'recibidos', label: 'Recibidos',    icon: Inbox,         badge: stats?.nuevos,        badgeRed: true },
    { key: 'enviados',  label: 'Enviados',     icon: Send,          badge: null },
    { key: 'borradores',label: 'Borradores',   icon: File,          badge: null },
    { key: 'archivados',label: 'Archivados',   icon: Archive,       badge: null },
    { key: 'por_vencer',label: 'Por vencer',   icon: AlertCircle,   badge: stats?.por_vencer,    badgeRed: true },
    { key: 'sin_resp',  label: 'Sin responder',icon: Clock,         badge: stats?.sin_responder, badgeRed: true },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '210px 320px 1fr', height: 'calc(100vh - 96px)', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff' }}>
      {modal && <ModalNuevoCorreo onClose={() => setModal(false)} />}

      {/* ── SIDEBAR ── */}
      <div style={{ background: '#f8faff', borderRight: '1px solid #eef0f5', display: 'flex', flexDirection: 'column', padding: '12px 8px' }}>
        <button onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: '#002f6c', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 14, border: 'none', width: '100%' }}>
          <Plus size={15} /> Registrar correo
        </button>

        <p style={{ fontSize: 9, fontWeight: 700, color: '#b8bfc9', textTransform: 'uppercase', letterSpacing: '.09em', padding: '8px 10px 4px' }}>Bandeja</p>
        {SB_ITEMS.map(({ key, label, icon: Icon, badge, badgeRed }: any) => (
          <div key={key} onClick={() => setBandeja(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: bandeja === key ? 700 : 500, color: bandeja === key ? '#002f6c' : '#4b5563', background: bandeja === key ? '#e8f1fd' : 'transparent', marginBottom: 1 }}>
            <Icon size={15} style={{ flexShrink: 0 }} />
            {label}
            {badge > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: badgeRed ? '#da291c' : '#e5e7eb', color: badgeRed ? '#fff' : '#6b7280' }}>
                {badge}
              </span>
            )}
          </div>
        ))}

        <p style={{ fontSize: 9, fontWeight: 700, color: '#b8bfc9', textTransform: 'uppercase', letterSpacing: '.09em', padding: '12px 10px 4px' }}>Etiquetas</p>
        {Object.entries(ETIQUETA_COLORS).map(([label, c]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#4b5563' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.text, flexShrink: 0 }} />
            {label}
          </div>
        ))}

        <p style={{ fontSize: 9, fontWeight: 700, color: '#b8bfc9', textTransform: 'uppercase', letterSpacing: '.09em', padding: '12px 10px 4px' }}>Acciones rápidas</p>
        {[
          { label: 'Nuevo trámite',   icon: ClipboardPlus },
          { label: 'Generar oficio',  icon: FilePlus },
          { label: 'Reporte correos', icon: BarChart2 },
        ].map(({ label, icon: Icon }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#4b5563', marginBottom: 1 }}>
            <Icon size={15} style={{ flexShrink: 0 }} /> {label}
          </div>
        ))}
      </div>

      {/* ── LISTA ── */}
      <div style={{ borderRight: '1px solid #eef0f5', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f5f6f8' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0a1628' }}>
            {SB_ITEMS.find(i => i.key === bandeja)?.label ?? 'Correos'}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => refetch()} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
              <RefreshCw size={13} />
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
              <SlidersHorizontal size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid #f5f6f8' }}>
          <Search size={13} style={{ color: '#c4c9d4', flexShrink: 0 }} />
          <input placeholder="Buscar por número, remitente..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, color: '#374151', background: 'transparent' }} />
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #f5f6f8' }}>
          {[['todos','Todos'],['no_leidos','No leídos'],['urgentes','Urgentes']].map(([k,l]) => (
            <div key={k} onClick={() => setTabLista(k)}
              style={{ flex: 1, textAlign: 'center', padding: '8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: tabLista === k ? '#002f6c' : '#9ca3af', borderBottom: `2px solid ${tabLista === k ? '#002f6c' : 'transparent'}` }}>
              {l}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: '#9ca3af' }}>Cargando...</div>
          ) : correos.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, color: '#9ca3af' }}>
              <Inbox size={24} style={{ marginBottom: 8, opacity: .4 }} />
              <p style={{ fontSize: 12 }}>Sin correos en esta bandeja</p>
            </div>
          ) : correos.map((c: any) => {
            const est = ESTADOS[c.estado] ?? ESTADOS.nuevo
            const isOn = selected?.id === c.id
            return (
              <div key={c.id} onClick={() => handleSelect(c)}
                style={{ padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', background: isOn ? '#e8f1fd' : 'transparent', position: 'relative', borderLeft: !c.leido ? '3px solid #002f6c' : '3px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: c.leido ? 500 : 700, color: '#0a1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                    {c.remitente_nombre || c.remitente_email || 'Sin remitente'}
                  </span>
                  <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
                    {new Date(c.fecha_recepcion).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#002f6c', fontFamily: 'monospace', marginTop: 2 }}>{c.numero_registro || '—'}</p>
                <p style={{ fontSize: 11, fontWeight: 500, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{c.asunto}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                  {(c.etiquetas ?? []).slice(0, 2).map((et: string) => {
                    const ec = ETIQUETA_COLORS[et] ?? { bg: '#f3f4f6', text: '#6b7280' }
                    return <span key={et} style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: ec.bg, color: ec.text }}>{et}</span>
                  })}
                  {c.prioridad !== 'normal' && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: '#fef2f2', color: '#dc2626' }}>
                      {c.prioridad === 'urgente' ? 'Urgente' : 'Muy urgente'}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: est.bg, color: est.text }}>
                    {est.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── DETALLE ── */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <Inbox size={36} style={{ marginBottom: 12, opacity: .3 }} />
            <p style={{ fontSize: 13, fontWeight: 500 }}>Selecciona un correo para ver el detalle</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>{data?.count ?? 0} correos en esta bandeja</p>
          </div>
        ) : (
          <>
            {/* Header detalle */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f5f6f8' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0a1628', marginBottom: 4 }}>{selected.asunto}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#002f6c' }}>{selected.numero_registro}</span>
                {selected.prioridad !== 'normal' && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#fef2f2', color: '#dc2626' }}>Urgente</span>
                )}
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: ESTADOS[selected.estado]?.bg, color: ESTADOS[selected.estado]?.text }}>
                  {ESTADOS[selected.estado]?.label}
                </span>
                {selected.fecha_limite_resp && (
                  <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>
                    Vence: {new Date(selected.fecha_limite_resp).toLocaleDateString('es-EC')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[
                  { label: 'Responder',      icon: CornerUpLeft,   primary: true },
                  { label: 'Reenviar',       icon: CornerUpRight,  primary: false },
                  { label: 'Crear trámite',  icon: ClipboardPlus,  primary: false },
                  { label: 'Generar oficio', icon: FilePlus,        primary: false },
                  { label: 'Asignar',        icon: UserCheck,       primary: false },
                  { label: 'Archivar',       icon: Archive,         primary: false, action: () => archivar.mutate(selected.id) },
                  { label: 'Urgente',        icon: Flag,            danger: true },
                ].map(({ label, icon: Icon, primary, danger, action }: any) => (
                  <button key={label} onClick={action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
                      borderRadius: 9, border: `1px solid ${primary ? '#002f6c' : danger ? '#fecaca' : '#e5e7eb'}`,
                      background: primary ? '#002f6c' : '#fff', color: primary ? '#fff' : danger ? '#da291c' : '#374151',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    }}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div style={{ padding: '10px 18px', background: '#fafbfc', borderBottom: '1px solid #f5f6f8' }}>
              {[
                { label: 'De:', av: (selected.remitente_nombre || 'R')[0], avBg: '#fef2f2', avC: '#dc2626', val: selected.remitente_email || '—', extra: selected.remitente_entidad },
                { label: 'Para:', av: selected.unidad_destino_siglas?.[0] ?? 'G', avBg: '#e8f1fd', avC: '#002f6c', val: selected.unidad_destino_nombre || 'Sin asignar', badge: selected.unidad_destino_siglas },
                { label: 'Asignado:', av: selected.usuario_asignado_nombre?.[0] ?? '?', avBg: '#e1f5ee', avC: '#0f6e56', val: selected.usuario_asignado_nombre || 'Sin asignar' },
              ].map(({ label, av, avBg, avC, val, extra, badge }: any) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12 }}>
                  <span style={{ color: '#9ca3af', minWidth: 64, fontSize: 11 }}>{label}</span>
                  <Avatar texto={av} bg={avBg} color={avC} />
                  <span style={{ fontWeight: 600, color: '#374151' }}>{val}</span>
                  {extra && <span style={{ color: '#9ca3af', fontSize: 11 }}>— {extra}</span>}
                  {badge && <span style={{ fontSize: 11, background: '#e8f1fd', color: '#002f6c', padding: '1px 8px', borderRadius: 20, fontWeight: 600 }}>{badge}</span>}
                </div>
              ))}
            </div>

            {/* Timeline */}
            {detalle?.seguimientos && <TimelineCorreo seguimientos={detalle.seguimientos} />}

            {/* Cuerpo */}
            <div style={{ flex: 1, padding: 18, overflowY: 'auto', fontSize: 13, color: '#374151', lineHeight: 1.75 }}>
              {detalle?.cuerpo
                ? <div style={{ whiteSpace: 'pre-wrap' }}>{detalle.cuerpo}</div>
                : <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin contenido registrado.</p>
              }
            </div>

            {/* Reply box */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f0f0', background: '#fafbfc' }}>
              <textarea
                value={respuestaText}
                onChange={e => setRespuesta(e.target.value)}
                placeholder="Redacta tu respuesta institucional..."
                rows={2}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 12, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#374151', background: '#fff' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[Paperclip, Bold, Italic, Link].map((Icon, i) => (
                    <button key={i} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => responder.mutate({ id: selected.id, obs: respuestaText })}
                  disabled={!respuestaText.trim() || responder.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: respuestaText.trim() ? '#002f6c' : '#e5e7eb', color: respuestaText.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: respuestaText.trim() ? 'pointer' : 'not-allowed' }}>
                  <Send size={13} /> Enviar respuesta
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}