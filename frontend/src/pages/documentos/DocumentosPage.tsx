import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bandejaService, BandejaItem } from '@/services/bandeja.service'
import { documentosService, CrearDocumento } from '@/services/documentos.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  Inbox, Edit3, Send, Clock, CheckSquare, Archive,
  Folder, Printer, Search, Plus, X, Eye, Download,
  ArrowRightLeft, Info, MessageSquare, Signature,
  CheckCircle, Shield, Filter, ClipboardPlus, RefreshCw
} from 'lucide-react'

const BANDEJAS = [
  { key: 'recibidos',        label: 'Recibidos',         icon: Inbox,       seccion: 'bandejas' },
  { key: 'en_elaboracion',   label: 'En elaboración',    icon: Edit3,       seccion: 'bandejas' },
  { key: 'enviados',         label: 'Enviados',          icon: Send,        seccion: 'bandejas' },
  { key: 'no_enviados',      label: 'No enviados',       icon: Clock,       seccion: 'bandejas' },
  { key: 'tareas_recibidas', label: 'Tareas recibidas',  icon: CheckSquare, seccion: 'bandejas' },
  { key: 'tareas_enviadas',  label: 'Tareas enviadas',   icon: CheckSquare, seccion: 'bandejas' },
  { key: 'archivados',       label: 'Archivados',        icon: Archive,     seccion: 'otras' },
  { key: 'carpetas',         label: 'Carpetas virtuales',icon: Folder,      seccion: 'otras' },
  { key: 'por_imprimir',     label: 'Por imprimir',      icon: Printer,     seccion: 'otras' },
]

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  OFI: { bg: '#e8f1fd', text: '#002f6c' },
  MEM: { bg: '#faeeda', text: '#854f0b' },
  CIR: { bg: '#fef2f2', text: '#da291c' },
  RES: { bg: '#f0ebf9', text: '#534ab7' },
  INF: { bg: '#e1f5ee', text: '#0f6e56' },
  CON: { bg: '#f0fdf4', text: '#15803d' },
  CER: { bg: '#fffbeb', text: '#92400e' },
  ACT: { bg: '#f0f9ff', text: '#0369a1' },
}

const ESTADO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  borrador:    { bg: '#f9fafb', text: '#6b7280', label: 'Borrador' },
  en_revision: { bg: '#faf5ff', text: '#7e22ce', label: 'En revisión' },
  aprobado:    { bg: '#f0fdf4', text: '#15803d', label: 'Aprobado' },
  enviado:     { bg: '#eff6ff', text: '#1d4ed8', label: 'Enviado' },
  recibido:    { bg: '#f0f9ff', text: '#0369a1', label: 'Recibido' },
  archivado:   { bg: '#f9fafb', text: '#374151', label: 'Archivado' },
  anulado:     { bg: '#fef2f2', text: '#dc2626', label: 'Anulado' },
  firmado:     { bg: '#f0fdf4', text: '#0f6e56', label: 'Firmado' },
}

function ModalNuevoDocumento({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<CrearDocumento>>({ prioridad: 'normal', confidencial: false })
  const [error, setError] = useState('')

  const { data: tipos }    = useQuery({ queryKey: ['tipos-doc'],       queryFn: documentosService.tipos })
  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const mutation = useMutation({
    mutationFn: (data: CrearDocumento) => documentosService.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
      onClose()
    },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const set = (k: keyof CrearDocumento, v: any) => setForm(f => ({ ...f, [k]: v }))
  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#e8f1fd' }}>
              <Edit3 size={15} style={{ color: '#002f6c' }} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Nuevo documento</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Tipo *</label>
              <select className={cls} value={form.tipo_documento ?? ''} onChange={e => set('tipo_documento', Number(e.target.value))}>
                <option value="">— Selecciona —</option>
                {tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
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
            <input className={cls} placeholder="Asunto del documento"
              value={form.asunto ?? ''} onChange={e => set('asunto', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Cuerpo del documento</label>
            <textarea className={cls + ' resize-none'} rows={5} placeholder="Redacta el contenido..."
              value={form.cuerpo ?? ''} onChange={e => set('cuerpo', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad de origen *</label>
              <select className={cls} value={form.unidad_origen ?? ''} onChange={e => set('unidad_origen', Number(e.target.value))}>
                <option value="">— Selecciona —</option>
                {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Unidad destinataria</label>
              <select className={cls} value={form.unidad_destino ?? ''} onChange={e => set('unidad_destino', e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">— Sin destinatario —</option>
                {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input type="checkbox" checked={form.confidencial ?? false}
                onChange={e => set('confidencial', e.target.checked)}
                className="w-4 h-4" style={{ accentColor: '#002f6c' }} />
              <Shield size={13} className="text-gray-400" /> Confidencial
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input type="checkbox" checked={form.requiere_respuesta ?? false}
                onChange={e => set('requiere_respuesta', e.target.checked)}
                className="w-4 h-4" style={{ accentColor: '#002f6c' }} />
              Requiere respuesta
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!form.tipo_documento || !form.asunto || !form.unidad_origen) {
                setError('Completa los campos obligatorios'); return
              }
              mutation.mutate(form as CrearDocumento)
            }}
            disabled={mutation.isPending}
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

function PanelDetalle({ item, onClose }: { item: BandejaItem; onClose: () => void }) {
  const qc = useQueryClient()
  const [comentario, setComentario] = useState('')

  const archivar = useMutation({
    mutationFn: () => bandejaService.archivar(item.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bandeja'] }); onClose() },
  })

  const comentar = useMutation({
    mutationFn: () => bandejaService.comentar(item.id, comentario),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bandeja'] }); setComentario('') },
  })

  const ETAPAS = [
    { key: 'elaborado',  label: 'Elaborado' },
    { key: 'firmado',    label: 'Firmado' },
    { key: 'enviado',    label: 'Enviado' },
    { key: 'recibido',   label: 'Recibido' },
    { key: 'reasignado', label: 'Reasignado' },
    { key: 'respondido', label: 'Respondido' },
  ]

  const etapaActual = item.estado_documento === 'enviado' ? 'enviado'
    : item.estado_documento === 'firmado'   ? 'firmado'
    : item.estado_documento === 'borrador'  ? 'elaborado'
    : 'recibido'

  const etapaIdx = ETAPAS.findIndex(e => e.key === etapaActual)

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
            {item.numero_documento || 'Sin número'}
          </span>
          {item.numero_referencia && (
            <span style={{ fontSize: 10, color: '#9ca3af' }}>Ref: {item.numero_referencia}</span>
          )}
          {item.es_urgente && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#da291c', background: '#fef2f2', padding: '1px 6px', borderRadius: 10 }}>
              Urgente
            </span>
          )}
          <button onClick={onClose}
            style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <X size={14} />
          </button>
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', lineHeight: 1.3, marginBottom: 10 }}>{item.asunto}</p>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[
            { label: 'Reasignar',   icon: ArrowRightLeft, primary: true },
            { label: 'Informar',    icon: Info },
            { label: 'Archivar',    icon: Archive, action: () => archivar.mutate() },
            { label: 'Comentar',    icon: MessageSquare },
            { label: 'Nueva Tarea', icon: ClipboardPlus },
            { label: 'Firmar',      icon: Signature },
            { label: 'Enviar',      icon: Send },
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
          { label: 'De:',           value: item.unidad_origen_siglas || item.unidad_origen_nombre },
          { label: 'Elaborado por:',value: item.creado_por_nombre },
          { label: 'Fecha:',        value: new Date(item.fecha_documento).toLocaleString('es-EC') },
          ...(item.fecha_limite ? [{ label: 'Vence:', value: new Date(item.fecha_limite).toLocaleDateString('es-EC'), danger: true }] : []),
        ].map(({ label, value, danger }: any) => (
          <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 11 }}>
            <span style={{ color: '#9ca3af', minWidth: 80, flexShrink: 0 }}>{label}</span>
            <span style={{ fontWeight: 500, color: danger ? '#da291c' : '#374151' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Timeline seguimiento */}
      <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Seguimiento del documento</p>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {ETAPAS.map((etapa, i) => {
            const done   = i <= etapaIdx
            const active = i === etapaIdx + 1
            const isLast = i === ETAPAS.length - 1
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
                <p style={{ fontSize: 9, marginTop: 3, textAlign: 'center', color: done ? '#0f6e56' : active ? '#002f6c' : '#9ca3af', fontWeight: done || active ? 600 : 400 }}>
                  {etapa.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Vista previa */}
      <div style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Eye size={13} style={{ color: '#002f6c' }} /> Vista previa
        </p>
        <div style={{ background: '#f8faff', border: '0.5px solid #e5e7eb', borderRadius: 8, padding: 16, minHeight: 160 }}>
          <div style={{ borderBottom: '2px solid #002f6c', paddingBottom: 8, marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#002f6c' }}>{item.unidad_origen_nombre?.toUpperCase()}</p>
            <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>GAD Provincia de Cotopaxi</p>
          </div>
          <p style={{ fontSize: 10, color: '#374151', lineHeight: 1.7 }}>
            <strong>{item.tipo_nombre} No. {item.numero_documento || '(por asignar)'}</strong>
          </p>
          <p style={{ fontSize: 10, color: '#374151', lineHeight: 1.7, marginTop: 6 }}>
            <strong>Asunto:</strong> {item.asunto}
          </p>
          <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 10, fontStyle: 'italic' }}>
            — Contenido completo disponible al descargar el PDF —
          </p>
        </div>
      </div>

      {/* Caja de comentario */}
      <div style={{ padding: '10px 14px', borderTop: '0.5px solid #f0f0f0' }}>
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder="Escribir comentario u observación..."
          rows={2}
          style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#374151', background: '#fafbfc' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => documentosService.descargarPDF(item.id, item.numero_documento || `doc_${item.id}`)}
              title="Descargar PDF"
              style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <Download size={13} />
            </button>
            <button title="Imprimir"
              style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <Printer size={13} />
            </button>
          </div>
          <button
            onClick={() => comentario.trim() && comentar.mutate()}
            disabled={!comentario.trim() || comentar.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px',
              background: comentario.trim() ? '#002f6c' : '#e5e7eb',
              color: comentario.trim() ? '#fff' : '#9ca3af',
              border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
              cursor: comentario.trim() ? 'pointer' : 'not-allowed',
            }}>
            <Signature size={13} /> Firmar y enviar respuesta
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentosPage() {
  const qc = useQueryClient()
  const [bandejaActiva, setBandeja]   = useState('recibidos')
  const [selected, setSelected]       = useState<BandejaItem | null>(null)
  const [modal, setModal]             = useState(false)
  const [busqueda, setBusqueda]       = useState('')
  const [filtroLeido, setFiltroLeido] = useState('')
  const [filtroTipo, setFiltroTipo]   = useState('')

  const { data: conteos, refetch: refetchConteos } = useQuery({
    queryKey: ['bandeja-conteos'],
    queryFn:  bandejaService.conteos,
    refetchInterval: 30000,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bandeja', bandejaActiva, busqueda, filtroLeido, filtroTipo],
    queryFn: () => bandejaService.porBandeja(bandejaActiva, {
      ...(busqueda    ? { search: busqueda }   : {}),
      ...(filtroLeido ? { leido: filtroLeido } : {}),
      ...(filtroTipo  ? { tipo: filtroTipo }   : {}),
    }),
  })

  const marcarLeido = useMutation({
    mutationFn: (id: number) => bandejaService.marcarLeido(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
    },
  })

  const handleSelect = (item: BandejaItem) => {
    setSelected(item)
    if (!item.leido) marcarLeido.mutate(item.id)
  }

  const items = data?.results ?? []

  const SECCIONES = [
    { key: 'bandejas', label: 'Bandejas' },
    { key: 'otras',    label: 'Otras bandejas' },
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '200px 1fr',
      height: 'calc(100vh - 96px)', borderRadius: 14,
      overflow: 'hidden', border: '0.5px solid #e5e7eb',
      background: '#fff', position: 'relative',
    }}>
      {modal && <ModalNuevoDocumento onClose={() => setModal(false)} />}

      {/* ── SIDEBAR ── */}
      <div style={{ background: '#f8faff', borderRight: '0.5px solid #eef0f5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 10px 4px' }}>
          <button onClick={() => setModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 12px', borderRadius: 10, background: '#002f6c', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', marginBottom: 4 }}>
            <Plus size={14} /> Nuevo documento
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {SECCIONES.map(sec => (
            <div key={sec.key}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#b8bfc9', textTransform: 'uppercase', letterSpacing: '.08em', padding: '10px 12px 4px' }}>
                {sec.label}
              </p>
              {BANDEJAS.filter(b => b.seccion === sec.key).map(({ key, label, icon: Icon }) => {
                const c        = conteos?.[key]
                const noLeidos = c?.no_leidos ?? 0
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
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    {noLeidos > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: '#da291c', color: '#fff', flexShrink: 0 }}>
                        {noLeidos}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          <p style={{ fontSize: 9, fontWeight: 700, color: '#b8bfc9', textTransform: 'uppercase', letterSpacing: '.08em', padding: '10px 12px 4px' }}>Herramientas</p>
          {[
            { label: 'Búsqueda avanzada', icon: Search },
            { label: 'Seguimiento',       icon: CheckCircle },
            { label: 'Reportes',          icon: Filter },
          ].map(({ label, icon: Icon }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: '#4b5563' }}>
              <Icon size={14} style={{ flexShrink: 0 }} /> {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '0.5px solid #f5f6f8', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0a1628', flexShrink: 0 }}>
            {BANDEJAS.find(b => b.key === bandejaActiva)?.label ?? 'Documentos'}
          </span>
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
            <input placeholder="Asunto, número de documento, número de referencia..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 26px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }} />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }}>
            <option value="">Todos los tipos</option>
            {['OFI','MEM','CIR','RES','INF','CON','CER','ACT'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => { refetch(); refetchConteos() }}
            style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Barra de acciones Quipux */}
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
            { label: 'Firmar',       icon: Signature },
            { label: 'Enviar',       icon: Send },
            { label: 'Vista previa', icon: Eye },
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
            {['Todos','No leídos','Urgentes'].map((f, i) => (
              <button key={f} onClick={() => setFiltroLeido(i === 1 ? 'false' : '')}
                style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: (i === 1 && filtroLeido === 'false') || (i === 0 && !filtroLeido) ? '#002f6c' : 'transparent', color: (i === 1 && filtroLeido === 'false') || (i === 0 && !filtroLeido) ? '#fff' : '#9ca3af' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Info count */}
        <div style={{ padding: '5px 14px', background: '#fafbfc', borderBottom: '0.5px solid #f5f6f8', fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
          No. de registros encontrados: <strong style={{ color: '#374151' }}>{data?.count ?? 0}</strong>
          &nbsp;|&nbsp; Bandeja: {BANDEJAS.find(b => b.key === bandejaActiva)?.label}
        </div>

        {/* Lista documentos */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 24px 64px 1fr 120px 140px 120px 100px', gap: 8, padding: '6px 12px', background: '#f9fafb', borderBottom: '0.5px solid #f5f6f8', position: 'sticky', top: 0, zIndex: 1 }}>
            {['','','De','Asunto','Fecha Doc.','N° Documento','N° Referencia','Estado'].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: '#9ca3af' }}>Cargando...</div>
          ) : items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, color: '#9ca3af' }}>
              <Inbox size={28} style={{ opacity: .3, marginBottom: 8 }} />
              <p style={{ fontSize: 12 }}>Esta bandeja está vacía</p>
            </div>
          ) : items.map(item => {
            const tc  = TIPO_COLORS[item.tipo_prefijo] ?? TIPO_COLORS.OFI
            const est = ESTADO_COLORS[item.estado_documento] ?? ESTADO_COLORS.borrador
            const isOn = selected?.id === item.id
            return (
              <div key={item.id} onClick={() => handleSelect(item)}
                style={{
                  display: 'grid', gridTemplateColumns: '24px 24px 64px 1fr 120px 140px 120px 100px',
                  gap: 8, padding: '8px 12px', borderBottom: '0.5px solid #f9fafb',
                  cursor: 'pointer', alignItems: 'center',
                  background: isOn ? '#e8f1fd' : 'transparent',
                  borderLeft: `2px solid ${!item.leido ? '#002f6c' : 'transparent'}`,
                }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: !item.leido ? '#002f6c' : 'transparent' }} />
                <input type="checkbox" onClick={e => e.stopPropagation()} style={{ width: 13, height: 13, accentColor: '#002f6c', cursor: 'pointer' }} />
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 4, background: tc.bg, color: tc.text, textAlign: 'center' }}>
                  {item.tipo_prefijo}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: item.leido ? 400 : 600, color: '#0a1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.asunto}
                    {item.es_urgente && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#da291c', background: '#fef2f2', padding: '1px 5px', borderRadius: 10 }}>Urgente</span>}
                  </p>
                  <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{item.unidad_origen_siglas || item.unidad_origen_nombre}</p>
                </div>
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  {new Date(item.fecha_documento).toLocaleDateString('es-EC')}
                </span>
                <span style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace', fontWeight: 500 }}>
                  {item.numero_documento || '—'}
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  {item.numero_referencia || '—'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: est.bg, color: est.text, whiteSpace: 'nowrap' }}>
                  {est.label}
                </span>
              </div>
            )
          })}
        </div>

        {selected && <PanelDetalle item={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}