import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bandejaService, BandejaItem } from '@/services/bandeja.service'
import { documentosService } from '@/services/documentos.service'
import { usuariosService } from '@/services/usuarios.service'
import AdjuntosPanel from '@/components/ui/AdjuntosPanel'
import VincularExpedienteModal from '@/components/ui/VincularExpedienteModal'
import ModalFirmaElectronica from '@/components/ui/ModalFirmaElectronica'
import ModalEnviarEmail from '@/components/ui/ModalEnviarEmail'
import EditorDocumento from '@/components/ui/EditorDocumento'
import {
  Inbox, Edit3, Send, Clock, CheckSquare, Archive,
  Folder, Printer, Search, Plus, X, Eye, Download,
  ArrowRightLeft, Info, MessageSquare, Signature,
  CheckCircle, Filter, ClipboardPlus, RefreshCw,
  Globe2
} from 'lucide-react'

const BANDEJAS = [
  { key: 'recibidos',        label: 'Recibidos',         icon: Inbox,       seccion: 'bandejas' },
  { key: 'en_elaboracion',   label: 'En elaboracion',    icon: Edit3,       seccion: 'bandejas' },
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
  en_revision: { bg: '#faf5ff', text: '#7e22ce', label: 'En revision' },
  aprobado:    { bg: '#f0fdf4', text: '#15803d', label: 'Aprobado' },
  enviado:     { bg: '#eff6ff', text: '#1d4ed8', label: 'Enviado' },
  recibido:    { bg: '#f0f9ff', text: '#0369a1', label: 'Recibido' },
  archivado:   { bg: '#f9fafb', text: '#374151', label: 'Archivado' },
  anulado:     { bg: '#fef2f2', text: '#dc2626', label: 'Anulado' },
  firmado:     { bg: '#f0fdf4', text: '#0f6e56', label: 'Firmado' },
}

function PanelDetalle({ item, onClose, onEditar }: { item: BandejaItem; onClose: () => void; onEditar?: () => void }) {
  const qc = useQueryClient()
  const [comentario, setComentario] = useState('')
  const [tabActiva, setTab] = useState<'preview' | 'adjuntos' | 'seguimiento'>('preview')
  const [mostrarVincular, setMostrarVincular] = useState(false)
  const [mostrarFirma, setMostrarFirma] = useState(false)
  const [mostrarEmail, setMostrarEmail] = useState(false)
  const [mostrarReasignar, setMostrarReasignar] = useState(false)
  const [reasignarUsuarioId, setReasignarUsuarioId] = useState<number | null>(null)
  const [reasignarInstrucciones, setReasignarInstrucciones] = useState('')
  const [busquedaUsuario, setBusquedaUsuario] = useState('')
  const [mostrarEnviar, setMostrarEnviar] = useState(false)
  const [enviarDestinatarios, setEnviarDestinatarios] = useState<number[]>([])
  const [enviarInstrucciones, setEnviarInstrucciones] = useState('')
  const [enviarUrgente, setEnviarUrgente] = useState(false)

  const { data: docDetalle } = useQuery({
    queryKey: ['doc-detalle', item.documento_id],
    queryFn: () => documentosService.obtener(item.documento_id),
  })

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-reasignar', busquedaUsuario],
    queryFn: () => usuariosService.listar(busquedaUsuario ? { search: busquedaUsuario } : {}),
    enabled: mostrarReasignar || mostrarEnviar,
  })

  const archivar = useMutation({
    mutationFn: () => bandejaService.archivar(item.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bandeja'] }); onClose() },
  })

  const comentar = useMutation({
    mutationFn: () => bandejaService.comentar(item.id, comentario),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['doc-detalle', item.documento_id] })
      setComentario('')
    },
  })

  const reasignar = useMutation({
    mutationFn: () => bandejaService.reasignar(item.id, {
      usuario_id: reasignarUsuarioId!,
      instrucciones: reasignarInstrucciones,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
      setMostrarReasignar(false)
      onClose()
    },
  })

  const enviarDoc = useMutation({
    mutationFn: () => bandejaService.enviar(item.documento_id, {
      destinatarios_internos: enviarDestinatarios.map(uid => ({ usuario_id: uid })),
      instrucciones: enviarInstrucciones,
      es_urgente: enviarUrgente,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
      qc.invalidateQueries({ queryKey: ['doc-detalle', item.documento_id] })
      setMostrarEnviar(false)
      onClose()
    },
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
    : item.estado_documento === 'firmado' ? 'firmado'
    : item.estado_documento === 'borrador' ? 'elaborado'
    : 'recibido'

  const etapaIdx = ETAPAS.findIndex(e => e.key === etapaActual)
  const esExterno = !!item.remitente_entidad

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 420,
      background: '#fff', borderLeft: '0.5px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden',
    }}>
      {/* Reasignar overlay */}
      {mostrarReasignar && (
        <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #f5f6f8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRightLeft size={14} style={{ color: '#002f6c' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0a1628' }}>Reasignar documento</span>
            <button onClick={() => setMostrarReasignar(false)}
              style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
              <input
                placeholder="Buscar usuario por nombre..."
                value={busquedaUsuario}
                onChange={e => setBusquedaUsuario(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 28px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none', color: '#374151', background: '#f9fafb' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {usuarios?.results?.map(u => (
              <div key={u.id}
                onClick={() => setReasignarUsuarioId(u.id)}
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  border: `0.5px solid ${reasignarUsuarioId === u.id ? '#002f6c' : '#e5e7eb'}`,
                  background: reasignarUsuarioId === u.id ? '#e8f1fd' : '#fff',
                }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', margin: 0 }}>{u.nombre_completo}</p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>{u.cargo}{u.unidad_nombre ? ` · ${u.unidad_nombre}` : ''}</p>
              </div>
            ))}
            {usuarios && usuarios.results?.length === 0 && (
              <p style={{ fontSize: 11, color: '#c4c9d4', textAlign: 'center', padding: 16 }}>No se encontraron usuarios</p>
            )}
          </div>
          <div style={{ padding: '10px 14px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Instrucciones:</label>
            <textarea
              value={reasignarInstrucciones}
              onChange={e => setReasignarInstrucciones(e.target.value)}
              placeholder="Indicaciones para el nuevo responsable..."
              rows={2}
              style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#374151', background: '#fafbfc' }}
            />
          </div>
          <div style={{ padding: '10px 14px', borderTop: '0.5px solid #f0f0f0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setMostrarReasignar(false)}
              style={{ padding: '7px 14px', border: '0.5px solid #e5e7eb', borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#6b7280' }}>
              Cancelar
            </button>
            <button
              onClick={() => reasignarUsuarioId && reasignar.mutate()}
              disabled={!reasignarUsuarioId || reasignar.isPending}
              style={{
                padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
                cursor: reasignarUsuarioId ? 'pointer' : 'not-allowed',
                background: reasignarUsuarioId ? '#002f6c' : '#e5e7eb',
                color: reasignarUsuarioId ? '#fff' : '#9ca3af',
              }}>
              {reasignar.isPending ? 'Reasignando...' : 'Reasignar'}
            </button>
          </div>
        </div>
      )}

      {/* Enviar overlay */}
      {mostrarEnviar && (
        <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #f5f6f8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={14} style={{ color: '#002f6c' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0a1628' }}>Enviar documento</span>
            <button onClick={() => setMostrarEnviar(false)}
              style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Selecciona los destinatarios internos:</p>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
              <input
                placeholder="Buscar usuario..."
                value={busquedaUsuario}
                onChange={e => setBusquedaUsuario(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 28px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none', color: '#374151', background: '#f9fafb' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {usuarios?.results?.map(u => {
              const selected = enviarDestinatarios.includes(u.id)
              return (
                <div key={u.id}
                  onClick={() => setEnviarDestinatarios(prev =>
                    selected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                  )}
                  style={{
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    border: `0.5px solid ${selected ? '#0f6e56' : '#e5e7eb'}`,
                    background: selected ? '#f0fdf4' : '#fff',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${selected ? '#0f6e56' : '#d1d5db'}`,
                    background: selected ? '#0f6e56' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                  }}>{selected ? '✓' : ''}</div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', margin: 0 }}>{u.nombre_completo}</p>
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>{u.cargo}{u.unidad_nombre ? ` · ${u.unidad_nombre}` : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '10px 14px' }}>
            <textarea
              value={enviarInstrucciones}
              onChange={e => setEnviarInstrucciones(e.target.value)}
              placeholder="Instrucciones para el destinatario..."
              rows={2}
              style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#374151', background: '#fafbfc', marginBottom: 8 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={enviarUrgente} onChange={e => setEnviarUrgente(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: '#da291c' }} />
              <span style={{ color: '#da291c', fontWeight: 600 }}>Marcar como urgente</span>
            </label>
          </div>
          <div style={{ padding: '10px 14px', borderTop: '0.5px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{enviarDestinatarios.length} destinatario(s)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setMostrarEnviar(false)}
                style={{ padding: '7px 14px', border: '0.5px solid #e5e7eb', borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#6b7280' }}>
                Cancelar
              </button>
              <button
                onClick={() => enviarDestinatarios.length > 0 && enviarDoc.mutate()}
                disabled={enviarDestinatarios.length === 0 || enviarDoc.isPending}
                style={{
                  padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
                  cursor: enviarDestinatarios.length > 0 ? 'pointer' : 'not-allowed',
                  background: enviarDestinatarios.length > 0 ? '#002f6c' : '#e5e7eb',
                  color: enviarDestinatarios.length > 0 ? '#fff' : '#9ca3af',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                <Send size={12} /> {enviarDoc.isPending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#002f6c' }}>
            {item.numero_documento || 'Sin numero'}
          </span>
          {item.numero_referencia && (
            <span style={{ fontSize: 10, color: '#9ca3af' }}>Ref: {item.numero_referencia}</span>
          )}
          {esExterno && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#c2410c', background: '#fff7ed', padding: '1px 6px', borderRadius: 10 }}>
              <Globe2 size={10} /> Externo
            </span>
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
          {item.bandeja === 'en_elaboracion' && onEditar && (
            <button onClick={onEditar}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 8,
                border: 'none', background: '#002f6c', color: '#fff',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>
              <Edit3 size={12} /> Editar
            </button>
          )}
          {[
            { label: 'Reasignar',   icon: ArrowRightLeft, primary: false, action: () => setMostrarReasignar(true) },
            { label: 'Informar',    icon: Info },
            { label: 'Archivar',    icon: Archive, action: () => setMostrarVincular(true) },
            { label: 'Comentar',    icon: MessageSquare },
            { label: 'Nueva Tarea', icon: ClipboardPlus },
            { label: 'Firmar',      icon: Signature, action: () => setMostrarFirma(true) },
            { label: 'Enviar',      icon: Send, action: () => setMostrarEnviar(true) },
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
          { label: 'De:',            value: item.unidad_origen_siglas || item.unidad_origen_nombre },
          ...(esExterno ? [{ label: 'Remitente:', value: item.remitente_entidad }] : []),
          { label: 'Elaborado por:', value: item.creado_por_nombre },
          { label: 'Fecha:',         value: new Date(item.fecha_documento).toLocaleString('es-EC') },
          ...(item.fecha_limite ? [{ label: 'Vence:', value: new Date(item.fecha_limite).toLocaleDateString('es-EC'), danger: true }] : []),
        ].map(({ label, value, danger }: any) => (
          <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 11 }}>
            <span style={{ color: '#9ca3af', minWidth: 80, flexShrink: 0 }}>{label}</span>
            <span style={{ fontWeight: 500, color: danger ? '#da291c' : '#374151' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Seguimiento</p>
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

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid #f5f6f8', flexShrink: 0 }}>
        {[['preview', 'Vista previa'], ['adjuntos', 'Adjuntos'], ['seguimiento', 'Historial']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            style={{
              flex: 1, padding: '8px', fontSize: 11, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: tabActiva === k ? '#fff' : '#fafbfc',
              color: tabActiva === k ? '#002f6c' : '#9ca3af',
              borderBottom: `2px solid ${tabActiva === k ? '#002f6c' : 'transparent'}`,
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
        {tabActiva === 'preview' ? (
          <div style={{ background: '#f8faff', border: '0.5px solid #e5e7eb', borderRadius: 8, padding: 16, minHeight: 160 }}>
            <div style={{ borderBottom: '2px solid #002f6c', paddingBottom: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#002f6c', margin: 0 }}>{item.unidad_origen_nombre?.toUpperCase()}</p>
                  <p style={{ fontSize: 9, color: '#9ca3af', margin: '1px 0 0' }}>GAD Provincia de Cotopaxi</p>
                </div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#002f6c', fontFamily: 'monospace', margin: 0 }}>
                  {item.numero_documento || '(por asignar)'}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 10, color: '#6b7280', textAlign: 'right', marginBottom: 8 }}>
              {new Date(item.fecha_documento).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <p style={{ fontSize: 10, color: '#374151', lineHeight: 1.7, margin: 0 }}>
              <strong>{item.tipo_nombre} No. {item.numero_documento || '(por asignar)'}</strong>
            </p>
            <p style={{ fontSize: 10, color: '#374151', lineHeight: 1.7, marginTop: 4 }}>
              <strong>ASUNTO:</strong> {item.asunto}
            </p>

            {docDetalle?.cuerpo ? (
              <div
                className="render-quill"
                style={{ fontSize: 10, color: '#374151', lineHeight: 1.7, marginTop: 12, paddingTop: 10, borderTop: '0.5px solid #e5e7eb' }}
                dangerouslySetInnerHTML={{ __html: docDetalle.cuerpo }}
              />
            ) : (
              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 10, fontStyle: 'italic' }}>
                {docDetalle === undefined ? 'Cargando contenido...' : '— Sin contenido —'}
              </p>
            )}

            {docDetalle?.firma_bce_info && (
              <div style={{ marginTop: 16, paddingTop: 10, borderTop: '0.5px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <CheckCircle size={12} style={{ color: '#0f6e56' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#0f6e56' }}>Firmado electronicamente</span>
                </div>
                <p style={{ fontSize: 9, color: '#6b7280', margin: '2px 0 0' }}>
                  {docDetalle.firmado_por_nombre} — {docDetalle.firma_bce_info.entidad_cert}
                </p>
                <p style={{ fontSize: 9, color: '#9ca3af', margin: '2px 0 0' }}>
                  {docDetalle.firma_bce_info.fecha_firma}
                </p>
              </div>
            )}
          </div>
        ) : tabActiva === 'adjuntos' ? (
          <AdjuntosPanel documentoId={item.documento_id} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {docDetalle?.seguimiento?.length ? docDetalle.seguimiento.map((s: any, i: number) => (
              <div key={s.id || i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #f5f6f8' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0f6e56', marginTop: 4 }} />
                  {i < docDetalle.seguimiento.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: '#e5e7eb', marginTop: 4 }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', margin: 0 }}>
                    {s.etapa.charAt(0).toUpperCase() + s.etapa.slice(1)}
                  </p>
                  <p style={{ fontSize: 10, color: '#6b7280', margin: '2px 0 0' }}>
                    {s.usuario_nombre} · {new Date(s.creado_en).toLocaleString('es-EC')}
                  </p>
                  {s.observacion && (
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: '4px 0 0', fontStyle: 'italic' }}>
                      &ldquo;{s.observacion}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            )) : (
              <p style={{ fontSize: 11, color: '#c4c9d4', textAlign: 'center', padding: 16 }}>
                Sin registros de seguimiento
              </p>
            )}
          </div>
        )}
      </div>

      {/* Comment area */}
      <div style={{ padding: '10px 14px', borderTop: '0.5px solid #f0f0f0' }}>
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder="Escribir comentario u observacion..."
          rows={2}
          style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#374151', background: '#fafbfc' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => documentosService.descargarPDF(item.documento_id, item.numero_documento || `doc_${item.documento_id}`)}
              title="Descargar PDF"
              style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <Download size={13} />
            </button>
            <button title="Imprimir"
              style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <Printer size={13} />
            </button>
            <button onClick={() => setMostrarEmail(true)} title="Enviar por email externo"
              style={{ width: 28, height: 28, borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <Globe2 size={13} />
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
            <MessageSquare size={13} /> Enviar comentario
          </button>
        </div>
      </div>

      {mostrarFirma && (
        <ModalFirmaElectronica
          documentoId={item.documento_id}
          numeroDocumento={item.numero_documento || `Doc #${item.documento_id}`}
          onClose={() => setMostrarFirma(false)}
          onFirmado={() => {
            qc.invalidateQueries({ queryKey: ['bandeja'] })
            qc.invalidateQueries({ queryKey: ['doc-detalle', item.documento_id] })
            setMostrarFirma(false)
          }}
        />
      )}
      {mostrarVincular && (
        <VincularExpedienteModal
          documentoId={item.documento_id}
          onClose={() => setMostrarVincular(false)}
          onVinculado={() => { archivar.mutate(); onClose() }}
        />
      )}
      {mostrarEmail && (
        <ModalEnviarEmail
          documentoId={item.documento_id}
          numeroDocumento={item.numero_documento || `Doc #${item.documento_id}`}
          asuntoDocumento={item.asunto}
          onClose={() => setMostrarEmail(false)}
        />
      )}
    </div>
  )
}

export default function DocumentosPage() {
  const qc = useQueryClient()
  const [bandejaActiva, setBandeja]   = useState('recibidos')
  const [selected, setSelected]       = useState<BandejaItem | null>(null)
  const [modal, setModal]             = useState(false)
  const [docEditar, setDocEditar]     = useState<any>(null)
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
      {modal && <EditorDocumento onClose={() => setModal(false)} />}
      {docEditar && (
        <EditorDocumento
          documentoExistente={docEditar}
          onClose={() => { setDocEditar(null); qc.invalidateQueries({ queryKey: ['bandeja'] }) }}
        />
      )}

      {/* SIDEBAR */}
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
            { label: 'Busqueda avanzada', icon: Search },
            { label: 'Seguimiento',       icon: CheckCircle },
            { label: 'Reportes',          icon: Filter },
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
            {BANDEJAS.find(b => b.key === bandejaActiva)?.label ?? 'Documentos'}
          </span>
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
            <input placeholder="Asunto, numero de documento, numero de referencia..."
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
            {['Todos','No leidos','Urgentes'].map((f, i) => (
              <button key={f} onClick={() => setFiltroLeido(i === 1 ? 'false' : '')}
                style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: (i === 1 && filtroLeido === 'false') || (i === 0 && !filtroLeido) ? '#002f6c' : 'transparent', color: (i === 1 && filtroLeido === 'false') || (i === 0 && !filtroLeido) ? '#fff' : '#9ca3af' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '5px 14px', background: '#fafbfc', borderBottom: '0.5px solid #f5f6f8', fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
          No. de registros encontrados: <strong style={{ color: '#374151' }}>{data?.count ?? 0}</strong>
          &nbsp;|&nbsp; Bandeja: {BANDEJAS.find(b => b.key === bandejaActiva)?.label}
        </div>

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
              <p style={{ fontSize: 12 }}>Esta bandeja esta vacia</p>
            </div>
          ) : items.map(item => {
            const tc  = TIPO_COLORS[item.tipo_prefijo] ?? TIPO_COLORS.OFI
            const est = ESTADO_COLORS[item.estado_documento] ?? ESTADO_COLORS.borrador
            const isOn = selected?.id === item.id
            const esExterno = !!item.remitente_entidad
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
                    {esExterno && (
                      <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#c2410c', background: '#fff7ed', padding: '1px 5px', borderRadius: 10 }}>
                        Externo
                      </span>
                    )}
                    {item.es_urgente && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#da291c', background: '#fef2f2', padding: '1px 5px', borderRadius: 10 }}>Urgente</span>}
                  </p>
                  <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                    {esExterno ? item.remitente_entidad : (item.unidad_origen_siglas || item.unidad_origen_nombre)}
                  </p>
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

        {selected && (
          <PanelDetalle
            item={selected}
            onClose={() => setSelected(null)}
            onEditar={selected.bandeja === 'en_elaboracion' ? async () => {
              const detalle = await documentosService.obtener(selected.documento_id)
              setDocEditar(detalle)
            } : undefined}
          />
        )}
      </div>
    </div>
  )
}
