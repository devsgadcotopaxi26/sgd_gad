import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { usePermisosStore } from '@/store/permisosStore'
import { useThemeStore } from '@/store/themeStore'
import { THEMES, THEME_ORDER } from '@/constants/themes'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { bandejaService, BandejaItem } from '@/services/bandeja.service'
import { documentosService } from '@/services/documentos.service'
import { usuariosService } from '@/services/usuarios.service'
import { quipuxService, QuipuxDocumento, QuipuxAnexo } from '@/services/quipux.service'
import AdjuntosPanel from '@/components/ui/AdjuntosPanel'
import VincularExpedienteModal from '@/components/ui/VincularExpedienteModal'
import ModalFirmaElectronica from '@/components/ui/ModalFirmaElectronica'
import ModalEnviarEmail from '@/components/ui/ModalEnviarEmail'
import EditorDocumento from '@/components/ui/EditorDocumento'
import {
  Inbox, Edit3, Send, Clock, CheckSquare, Archive, ClipboardList,
  Folder, Printer, Search, Plus, X, Download,
  ArrowRightLeft, MessageSquare, Signature,
  CheckCircle, Filter, RefreshCw, Globe2, Database,
  FileText, FileSpreadsheet, FileImage, File, User,
  Lock, BookUser, Settings, Users, BarChart2, Eye
} from 'lucide-react'

// Bandejas SGD → nombre de bandeja Quipux equivalente
const QUIPUX_BANDEJA_MAP: Record<string, string> = {
  recibidos:        'recibidos',
  enviados:         'enviados',
  en_elaboracion:   'en_elaboracion',
  no_enviados:      'no_enviados',
  archivados:       'archivados',
  tareas_recibidas: 'tareas_recibidas',
  tareas_enviadas:  'tareas_enviadas',
}

const BANDEJAS = [
  { key: 'recibidos',        label: 'Recibidos',         icon: Inbox,            seccion: 'bandejas' },
  { key: 'en_elaboracion',   label: 'En elaboracion',    icon: Edit3,            seccion: 'bandejas' },
  { key: 'enviados',         label: 'Enviados',          icon: Send,             seccion: 'bandejas' },
  { key: 'no_enviados',      label: 'No enviados',       icon: Clock,            seccion: 'bandejas' },
  { key: 'reasignados',      label: 'Reasignados',       icon: ArrowRightLeft,   seccion: 'bandejas' },
  { key: 'tareas_recibidas', label: 'Tareas recibidas',  icon: CheckSquare,      seccion: 'bandejas' },
  { key: 'tareas_enviadas',  label: 'Tareas enviadas',   icon: CheckSquare,      seccion: 'bandejas' },
  { key: 'archivados',       label: 'Archivados',        icon: Archive,          seccion: 'otras' },
  { key: 'carpetas',         label: 'Carpetas virtuales',icon: Folder,           seccion: 'otras' },
  { key: 'por_imprimir',     label: 'Por imprimir',      icon: Printer,          seccion: 'otras' },
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

function PanelDetalle({ item, onClose, onEditar, trigger }: {
  item: BandejaItem; onClose: () => void; onEditar?: () => void;
  trigger?: { action: string; t: number } | null;
}) {
  const qc = useQueryClient()
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const [comentario, setComentario] = useState('')
  const [tabActiva, setTab] = useState<'preview' | 'info' | 'adjuntos' | 'seguimiento'>('preview')
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
  const [enviandoDirecto, setEnviandoDirecto] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [errorRecuperar, setErrorRecuperar] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfCargando, setPdfCargando] = useState(false)
  const [pdfEsFirmado, setPdfEsFirmado] = useState(false)
  const pdfDocIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!trigger) return
    if (trigger.action === 'reasignar') setMostrarReasignar(true)
    if (trigger.action === 'firmar') setMostrarFirma(true)
    if (trigger.action === 'enviar') setMostrarEnviar(true)
    if (trigger.action === 'preview') setTab('preview')
    if (trigger.action === 'comentar') setTab('preview')
  }, [trigger?.t])

  // Limpiar PDF al cambiar de documento
  useEffect(() => {
    if (pdfDocIdRef.current !== item.documento_id) {
      setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
      setPdfEsFirmado(false)
      pdfDocIdRef.current = item.documento_id
    }
  }, [item.documento_id])

  const { data: docDetalle } = useQuery({
    queryKey: ['doc-detalle', item.documento_id],
    queryFn: () => documentosService.obtener(item.documento_id),
  })

  const pdfFirmadoUrl = docDetalle?.pdf_firmado_url ?? null

  // Cargar PDF en la pestaña preview; siempre prefiere el PDF firmado
  useEffect(() => {
    if (tabActiva !== 'preview' || pdfCargando) return
    // Ya tenemos el PDF correcto cargado
    if (pdfUrl && pdfEsFirmado) return
    if (pdfUrl && !pdfFirmadoUrl) return
    // Hay PDF firmado disponible pero no está cargado (o está el WeasyPrint)
    if (pdfFirmadoUrl && !pdfEsFirmado) {
      setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
      setPdfCargando(true)
      documentosService.obtenerUrlBlobAdjunto(pdfFirmadoUrl)
        .then(url => { setPdfUrl(url); setPdfEsFirmado(true) })
        .catch(() => {})
        .finally(() => setPdfCargando(false))
      return
    }
    // No hay PDF firmado: cargar WeasyPrint si no hay nada
    if (!pdfUrl) {
      setPdfCargando(true)
      documentosService.obtenerUrlPDF(item.documento_id)
        .then(url => setPdfUrl(url))
        .catch(() => {})
        .finally(() => setPdfCargando(false))
    }
  }, [tabActiva, item.documento_id, pdfUrl, pdfCargando, pdfFirmadoUrl, pdfEsFirmado])

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

  const marcarImpreso = useMutation({
    mutationFn: () => bandejaService.marcarImpreso(item.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
    },
  })

  const recuperarDoc = useMutation({
    mutationFn: () => documentosService.recuperar(item.documento_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
      onClose()
    },
    onError: (e: any) => {
      setErrorRecuperar(e.response?.data?.error || 'No se pudo recuperar el documento.')
    },
  })

  const handleImprimir = async () => {
    setImprimiendo(true)
    try {
      // Agrega a la cola por_imprimir y abre el PDF con diálogo de impresora
      await bandejaService.agregarImprimir(item.id)
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
      await documentosService.imprimirPDF(item.documento_id)
    } finally {
      setImprimiendo(false)
    }
  }

  const esExterno = !!item.remitente_entidad

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 680,
      background: T.ctHdrBg, borderLeft: `3px solid ${T.pnBd}`,
      display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden',
      boxShadow: T.pnSh,
    }}>
      {/* Reasignar overlay */}
      {mostrarReasignar && (
        <div style={{ position: 'absolute', inset: 0, background: T.ctHdrBg, zIndex: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: `0.5px solid ${T.pnMetaBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRightLeft size={14} style={{ color: T.pnBd }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.rowTxt }}>Reasignar documento</span>
            <button onClick={() => setMostrarReasignar(false)}
              style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
              <input
                placeholder="Buscar usuario por nombre..."
                value={busquedaUsuario}
                onChange={e => setBusquedaUsuario(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 28px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {usuarios?.results?.map(u => (
              <div key={u.id}
                onClick={() => setReasignarUsuarioId(u.id)}
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  border: `0.5px solid ${reasignarUsuarioId === u.id ? T.accentDk : T.rowBd}`,
                  background: reasignarUsuarioId === u.id ? T.rowSel : T.rowBg,
                }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: T.rowTxt, margin: 0 }}>{u.nombre_completo}</p>
                <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>{u.cargo}{u.unidad_nombre ? ` · ${u.unidad_nombre}` : ''}</p>
              </div>
            ))}
            {usuarios && usuarios.results?.length === 0 && (
              <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 16 }}>No se encontraron usuarios</p>
            )}
          </div>
          <div style={{ padding: '10px 14px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Instrucciones:</label>
            <textarea
              value={reasignarInstrucciones}
              onChange={e => setReasignarInstrucciones(e.target.value)}
              placeholder="Indicaciones para el nuevo responsable..."
              rows={2}
              style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }}
            />
          </div>
          <div style={{ padding: '10px 14px', borderTop: `0.5px solid ${T.pnMetaBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setMostrarReasignar(false)}
              style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>
              Cancelar
            </button>
            <button
              onClick={() => reasignarUsuarioId && reasignar.mutate()}
              disabled={!reasignarUsuarioId || reasignar.isPending}
              style={{
                padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
                cursor: reasignarUsuarioId ? 'pointer' : 'not-allowed',
                background: reasignarUsuarioId ? '#002f6c' : T.rowBd,
                color: reasignarUsuarioId ? '#fff' : T.rowSub,
              }}>
              {reasignar.isPending ? 'Reasignando...' : 'Reasignar'}
            </button>
          </div>
        </div>
      )}

      {/* Enviar overlay */}
      {mostrarEnviar && (
        <div style={{ position: 'absolute', inset: 0, background: T.ctHdrBg, zIndex: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: `0.5px solid ${T.pnMetaBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={14} style={{ color: '#002f6c' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.rowTxt }}>Enviar documento</span>
            <button onClick={() => setMostrarEnviar(false)}
              style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <p style={{ fontSize: 11, color: T.rowSub, marginBottom: 8 }}>Selecciona los destinatarios internos:</p>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
              <input
                placeholder="Buscar usuario..."
                value={busquedaUsuario}
                onChange={e => setBusquedaUsuario(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 28px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }}
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
                    border: `0.5px solid ${selected ? '#0f6e56' : T.rowBd}`,
                    background: selected ? 'rgba(15,110,86,.12)' : T.rowBg,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${selected ? '#0f6e56' : T.rowBd}`,
                    background: selected ? '#0f6e56' : T.rowBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                  }}>{selected ? '✓' : ''}</div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: T.rowTxt, margin: 0 }}>{u.nombre_completo}</p>
                    <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>{u.cargo}{u.unidad_nombre ? ` · ${u.unidad_nombre}` : ''}</p>
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
              style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg, marginBottom: 8 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.rowTxt, cursor: 'pointer' }}>
              <input type="checkbox" checked={enviarUrgente} onChange={e => setEnviarUrgente(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: '#da291c' }} />
              <span style={{ color: '#da291c', fontWeight: 600 }}>Marcar como urgente</span>
            </label>
          </div>
          <div style={{ padding: '10px 14px', borderTop: `0.5px solid ${T.pnMetaBd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: T.rowSub }}>{enviarDestinatarios.length} destinatario(s)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setMostrarEnviar(false)}
                style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>
                Cancelar
              </button>
              <button
                onClick={() => enviarDestinatarios.length > 0 && enviarDoc.mutate()}
                disabled={enviarDestinatarios.length === 0 || enviarDoc.isPending}
                style={{
                  padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
                  cursor: enviarDestinatarios.length > 0 ? 'pointer' : 'not-allowed',
                  background: enviarDestinatarios.length > 0 ? '#002f6c' : T.rowBd,
                  color: enviarDestinatarios.length > 0 ? '#fff' : T.rowSub,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                <Send size={12} /> {enviarDoc.isPending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: 'none', background: T.pnHdr }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: T.pnHNum, letterSpacing: '.03em' }}>
            {item.numero_documento || 'Sin numero'}
          </span>
          {item.numero_referencia && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)' }}>Ref: {item.numero_referencia}</span>
          )}
          {esExterno && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#fed7aa', background: 'rgba(255,255,255,.15)', padding: '1px 6px', borderRadius: 10 }}>
              <Globe2 size={10} /> Externo
            </span>
          )}
          {item.es_urgente && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fecaca', background: 'rgba(218,41,28,.35)', padding: '1px 6px', borderRadius: 10 }}>
              Urgente
            </span>
          )}
          <button onClick={onClose}
            style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.15)', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>
            <X size={14} />
          </button>
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 10 }}>{item.asunto}</p>

        {/* Botones contextuales según bandeja/estado */}
        {(() => {
          const b = item.bandeja
          const e = item.estado_documento
          const anulado = e === 'anulado'
          const enElab  = b === 'en_elaboracion'
          const recibido = ['recibidos', 'tareas_recibidas'].includes(b)

          const minRec = (item as any).minutos_para_recuperar as number | null | undefined
          const puedeRecuperar = minRec != null && minRec > 0

          const botones = [
            { label: 'Editar',     icon: Edit3,         accent: true,  warn: false,
              visible: enElab && !anulado && !!onEditar,                              action: onEditar },
            { label: 'Reasignar',  icon: ArrowRightLeft, accent: false, warn: false,
              visible: recibido && !anulado,                                           action: () => setMostrarReasignar(true) },
            { label: 'Archivar',   icon: Archive,        accent: false, warn: false,
              visible: (recibido || b === 'enviados') && !anulado,                    action: () => setMostrarVincular(true) },
            { label: 'Firmar',     icon: Signature,      accent: false, warn: false,
              visible: (enElab || b === 'no_enviados') && !['firmado','anulado'].includes(e), action: () => setMostrarFirma(true) },
            { label: enviandoDirecto ? 'Enviando…' : 'Enviar', icon: Send, accent: false, warn: false,
              visible: (enElab || b === 'no_enviados') && !anulado,
              action: async () => {
                if (enviandoDirecto) return
                setEnviandoDirecto(true)
                try {
                  await documentosService.enviar(item.documento_id)
                  qc.invalidateQueries({ queryKey: ['bandeja'] })
                  qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
                  onClose()
                } catch { setEnviandoDirecto(false) }
              } },
            { label: 'Distribuir', icon: Send,           accent: false, warn: false,
              visible: ['recibidos', 'enviados'].includes(b) && !anulado,             action: () => setMostrarEnviar(true) },
            { label: puedeRecuperar ? `Recuperar (${Math.ceil(minRec!)} min)` : 'Recuperar',
              icon: ArrowRightLeft, accent: false, warn: true,
              visible: (b === 'enviados' || b === 'reasignados') && puedeRecuperar,
              action: () => { setErrorRecuperar(''); recuperarDoc.mutate() } },
            { label: 'Imprimir',   icon: Printer,        accent: false, warn: false,
              visible: b === 'por_imprimir',                                          action: handleImprimir },
            { label: 'Ya impreso', icon: CheckCircle,    accent: false, warn: false,
              visible: b === 'por_imprimir',                                          action: () => marcarImpreso.mutate() },
          ].filter(btn => btn.visible)

          if (botones.length === 0) return null
          return (
            <>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                {botones.map(({ label, icon: Icon, accent, warn, action }: any) => (
                  <button key={label} onClick={action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px', borderRadius: 8, fontSize: 11,
                      fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${accent ? '#ffd166' : warn ? '#f97316' : 'rgba(255,255,255,.35)'}`,
                      background: accent ? '#ffd166' : warn ? 'rgba(249,115,22,.2)' : 'rgba(255,255,255,.15)',
                      color: accent ? '#002f6c' : warn ? '#fb923c' : '#fff',
                    }}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
              {errorRecuperar && (
                <div style={{ marginTop: 6, padding: '5px 10px', borderRadius: 6, background: 'rgba(218,41,28,.15)', color: '#fca5a5', fontSize: 11 }}>
                  {errorRecuperar}
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* Meta */}
      <div style={{ padding: '10px 14px', background: T.pnMeta, borderBottom: `1px solid ${T.pnMetaBd}` }}>
        {[
          { label: 'De:',            value: item.unidad_origen_siglas || item.unidad_origen_nombre },
          ...(esExterno ? [{ label: 'Remitente:', value: item.remitente_entidad }] : []),
          { label: 'Elaborado por:', value: item.creado_por_nombre },
          ...((item as any).firmante_nombre ? [{ label: 'Firmará / Enviará:', value: `${(item as any).firmante_nombre}${(item as any).firmante_cargo ? ` — ${(item as any).firmante_cargo}` : ''}` }] : []),
          { label: 'Fecha:',         value: new Date(item.fecha_documento).toLocaleString('es-EC') },
          ...(item.fecha_limite ? [{ label: 'Vence:', value: new Date(item.fecha_limite).toLocaleDateString('es-EC'), danger: true }] : []),
        ].map(({ label, value, danger }: any) => (
          <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 11 }}>
            <span style={{ color: T.rowSub, minWidth: 80, flexShrink: 0 }}>{label}</span>
            <span style={{ fontWeight: 500, color: danger ? '#da291c' : T.rowTxt }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Tabs — segmented control */}
      <div style={{ padding: '8px 12px', borderBottom: `0.5px solid ${T.pnMetaBd}`, flexShrink: 0, background: T.pnMeta }}>
        <div style={{ display: 'flex', background: T.statsBg, borderRadius: 10, padding: 3, gap: 2 }}>
          {([
            ['preview',     'Vista previa', FileText],
            ['info',        'Información',  Eye],
            ['seguimiento', 'Recorrido',    Clock],
            ['adjuntos',    'Adjuntos',     Folder],
          ] as [string, string, any][]).map(([k, l, TabIcon]) => (
            <button key={k} onClick={() => setTab(k as any)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 4px', borderRadius: 8, fontSize: 11, fontWeight: tabActiva === k ? 700 : 500,
                border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: tabActiva === k ? T.ctHdrBg : 'transparent',
                color: tabActiva === k ? T.accentDk : T.rowSub,
                boxShadow: tabActiva === k ? '0 1px 4px rgba(0,47,108,.12)' : 'none',
              }}>
              <TabIcon size={12} />
              <span>{l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{
        flex: 1,
        padding: tabActiva === 'preview' ? 0 : 14,
        overflow: tabActiva === 'preview' ? 'hidden' : 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {tabActiva === 'preview' ? (
          pdfCargando ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: T.rowSub }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${T.rowBd}`, borderTopColor: '#002f6c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12 }}>Cargando vista previa…</span>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
              title="Vista previa del documento"
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub, fontSize: 12 }}>
              No se pudo cargar la vista previa
            </div>
          )
        ) : tabActiva === 'info' ? (
          <div>
            {(() => {
              const lR = (l: string, v?: string | null) => v ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: T.rowSub, width: 110, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: 11, color: T.rowTxt, fontWeight: 500 }}>{v}</span>
                </div>
              ) : null
              const d = docDetalle
              return (
                <>
                  {lR('N° Documento', item.numero_documento)}
                  {lR('Fecha', new Date(item.fecha_documento).toLocaleString('es-EC'))}
                  {lR('Estado', ESTADO_COLORS[item.estado_documento]?.label ?? item.estado_documento)}
                  {lR('Tipo', item.tipo_nombre)}
                  {lR('Asunto', item.asunto)}
                  {d?.resumen && lR('Resumen', d.resumen)}
                  {lR('Unidad origen', item.unidad_origen_nombre)}
                  {lR('Elaborado por', item.creado_por_nombre)}
                  {(item as any).firmante_nombre && lR('Firmará / Enviará', `${(item as any).firmante_nombre}${(item as any).firmante_cargo ? ` — ${(item as any).firmante_cargo}` : ''}`)}
                  {item.remitente_entidad && (
                    <>
                      <div style={{ marginTop: 10, marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.rowSub, letterSpacing: 1 }}>Remitente externo</div>
                      {lR('Entidad', item.remitente_entidad)}
                      {lR('Nombre', item.remitente_nombre)}
                      {lR('Email', item.remitente_email)}
                    </>
                  )}
                  {d?.destinatarios?.length > 0 && (
                    <>
                      <div style={{ marginTop: 10, marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.rowSub, letterSpacing: 1 }}>Destinatarios</div>
                      {d.destinatarios.map((dest: any) => (
                        <div key={dest.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 5, padding: '5px 8px', background: T.rowBg, borderRadius: 7, border: `0.5px solid ${T.rowBd}` }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#002f6c', marginTop: 4, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: T.rowTxt, margin: 0 }}>{dest.usuario_nombre}</p>
                            {dest.unidad_nombre && <p style={{ fontSize: 10, color: T.rowSub, margin: '1px 0 0' }}>{dest.unidad_nombre}</p>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {d?.firma_bce_info && (
                    <>
                      <div style={{ marginTop: 10, marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.rowSub, letterSpacing: 1 }}>Firma electrónica</div>
                      <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
                        <p style={{ fontWeight: 700, color: '#0f6e56', margin: '0 0 3px' }}>✓ {d.firma_bce_info.nombre ?? d.firma_bce_info.subject}</p>
                        {d.firma_bce_info.cedula && <p style={{ color: T.rowTxt, margin: '0 0 2px' }}>CI: {d.firma_bce_info.cedula}</p>}
                        {d.firma_bce_info.cargo  && <p style={{ color: T.rowSub, margin: '0 0 2px' }}>{d.firma_bce_info.cargo}</p>}
                        {d.firma_bce_info.fecha  && <p style={{ color: T.rowSub, margin: 0, fontSize: 10 }}>{d.firma_bce_info.fecha}</p>}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>
        ) : tabActiva === 'adjuntos' ? (
          <AdjuntosPanel documentoId={item.documento_id} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(() => {
              const ETAPA_LABEL: Record<string, string> = {
                elaborado:  'Elaboración / Redacción',
                firmado:    'Firmado electrónicamente',
                enviado:    'Enviado a destinatario(s)',
                recibido:   'Recibido',
                reasignado: 'Reasignado a otra área',
                informado:  'Informado',
                comentado:  'Comentario registrado',
                archivado:  'Archivado',
                respondido: 'Respondido',
              }
              const ETAPA_COLOR: Record<string, string> = {
                elaborado:  '#f59e0b',
                firmado:    '#0f6e56',
                enviado:    '#002f6c',
                recibido:   '#2563eb',
                reasignado: '#7c3aed',
                comentado:  '#6b7280',
                archivado:  '#9ca3af',
                respondido: '#0f6e56',
              }
              const seg = docDetalle?.seguimiento ?? []
              if (!seg.length) return (
                <p style={{ fontSize: 11, color: '#c4c9d4', textAlign: 'center', padding: 16 }}>
                  Sin registros de seguimiento
                </p>
              )
              return seg.map((s: any, i: number) => {
                const color = ETAPA_COLOR[s.etapa] ?? '#6b7280'
                const label = ETAPA_LABEL[s.etapa] ?? s.etapa.charAt(0).toUpperCase() + s.etapa.slice(1)
                const isLast = i === seg.length - 1
                return (
                  <div key={s.id || i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 6px ${color}55` }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                      </div>
                      {!isLast && <div style={{ width: 2, flex: 1, background: T.rowBd, minHeight: 10, marginTop: 3, borderRadius: 1 }} />}
                    </div>
                    <div style={{ flex: 1, background: T.rowBg, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, padding: '7px 10px', marginBottom: isLast ? 0 : 2 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color, margin: '0 0 1px' }}>{label}</p>
                      <p style={{ fontSize: 10, color: T.rowSub, margin: '0 0 2px' }}>
                        {s.usuario_nombre}
                        {s.etapa === 'enviado' && docDetalle?.destinatarios?.length > 0
                          ? ` → ${docDetalle.destinatarios.map((d: any) => d.usuario_nombre).join(' / ')}`
                          : (s.unidad_nombre ? ` · ${s.unidad_nombre}` : '')
                        }
                        {' · '}{new Date(s.creado_en).toLocaleString('es-EC')}
                      </p>
                      {s.observacion && (
                        <p style={{ fontSize: 10, color: T.rowTxt, margin: '4px 0 0', borderLeft: `2px solid ${T.rowBd}`, paddingLeft: 6, fontStyle: 'italic' }}>
                          {s.observacion}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* Comment area */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.pnMetaBd}`, background: T.pnCmt }}>
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder="Escribir comentario u observacion..."
          rows={2}
          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${T.pnCmtBd}`, borderRadius: 10, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              onClick={() => documentosService.descargarPDF(item.documento_id, item.numero_documento || `doc_${item.documento_id}`)}
              title={pdfFirmadoUrl ? 'Descargar PDF (firmado electrónicamente)' : 'Descargar PDF'}
              style={{ width: 28, height: 28, borderRadius: 7, border: pdfFirmadoUrl ? '0.5px solid #0f6e56' : `0.5px solid ${T.rowBd}`, background: pdfFirmadoUrl ? 'rgba(15,110,86,.12)' : T.rowBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pdfFirmadoUrl ? '#0f6e56' : T.rowSub }}>
              <Download size={13} />
            </button>
            {pdfFirmadoUrl && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#0f6e56', background: '#f0fdf4', border: '0.5px solid #0f6e56', borderRadius: 5, padding: '2px 6px', letterSpacing: 0.2 }}>
                ✓ Firmado digitalmente
              </span>
            )}
            <button
              onClick={handleImprimir}
              disabled={imprimiendo}
              title={imprimiendo ? 'Generando PDF...' : 'Imprimir documento'}
              style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: imprimiendo ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: imprimiendo ? T.rowBd : T.rowSub }}>
              <Printer size={13} />
            </button>
            <button onClick={() => setMostrarEmail(true)} title="Enviar por email externo"
              style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub }}>
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
            qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
            qc.invalidateQueries({ queryKey: ['doc-detalle', item.documento_id] })
            setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
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

// ── Panel de detalle para documentos Quipux históricos ─────────────────────
function PanelDetalleQuipux({
  item, bandeja, onClose, onResponderCreado,
}: {
  item: QuipuxDocumento
  bandeja: string
  onClose: () => void
  onResponderCreado?: () => void
}) {
  const qc = useQueryClient()
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const [tabActiva, setTab]               = useState<'preview' | 'info' | 'recorrido' | 'anexos'>('preview')
  const [pdfUrl, setPdfUrl]               = useState<string | null>(null)
  const [pdfCargando, setPdfCargando]     = useState(false)
  const pdfRadiRef                        = useRef<string | null>(null)
  const [mostrarReasignar, setReasignar]  = useState(false)
  const [reasignarId, setReasignarId]     = useState<number | null>(null)
  const [reasignarObs, setReasignarObs]   = useState('')
  const [busquedaUsr, setBusquedaUsr]     = useState('')
  const [comentario, setComentario]       = useState('')
  // Responder
  const [mostrarResponder, setResponder]  = useState(false)
  const [respAsunto, setRespAsunto]       = useState(`RE: ${item.radi_asunto || ''}`)
  const [respTipoId, setRespTipoId]       = useState<number | null>(null)
  // Avance tarea
  const [nuevoAvance, setNuevoAvance]     = useState<number>(item.tarea_avance ?? 0)
  const [avanceObs, setAvanceObs]         = useState('')
  const [editandoAvance, setEditAvance]   = useState(false)

  // Flags de qué acciones aplican según bandeja
  const puedeEnviar   = ['no_enviados', 'en_elaboracion'].includes(bandeja) && !item.es_tarea
  const puedeResponder = ['recibidos', 'copia'].includes(bandeja) && !item.es_tarea
  const puedeReasignar = !['enviados', 'tareas_enviadas', 'archivados'].includes(bandeja)
  const puedeArchivar  = ['recibidos', 'enviados', 'no_enviados', 'en_elaboracion'].includes(bandeja) && !item.es_tarea
  const soloLectura    = ['enviados', 'tareas_enviadas', 'archivados'].includes(bandeja)

  const { data: doc, isLoading } = useQuery({
    queryKey: ['quipux-detalle', item.radi_nume_radi],
    queryFn: () => quipuxService.detalle(item.radi_nume_radi),
  })

  const { data: anexos, isLoading: cargandoAnexos } = useQuery({
    queryKey: ['quipux-anexos', item.radi_nume_radi],
    queryFn: () => quipuxService.anexos(item.radi_nume_radi),
    enabled: tabActiva === 'anexos',
  })

  const { data: histAvance } = useQuery({
    queryKey: ['quipux-tarea-avance', item.tarea_codi],
    queryFn: () => quipuxService.historialAvance(item.tarea_codi!),
    enabled: !!item.es_tarea && !!item.tarea_codi,
  })

  const { data: tiposDoc } = useQuery({
    queryKey: ['tipos-documento'],
    queryFn: () => documentosService.tiposDocumento(),
    enabled: mostrarResponder,
    staleTime: 300000,
  })

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-reasignar', busquedaUsr],
    queryFn: () => usuariosService.listar(busquedaUsr ? { search: busquedaUsr } : {}),
    enabled: mostrarReasignar,
  })


  const reasignar = useMutation({
    mutationFn: () => quipuxService.reasignar(item.radi_nume_radi, {
      usuario_id: reasignarId!,
      instrucciones: reasignarObs,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quipux-bandeja'] })
      setReasignar(false); onClose()
    },
  })

  const actualizarAvance = useMutation({
    mutationFn: () => quipuxService.actualizarAvance(item.tarea_codi!, {
      avance: nuevoAvance, observacion: avanceObs,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quipux-tarea-avance', item.tarea_codi] })
      qc.invalidateQueries({ queryKey: ['quipux-bandeja'] })
      setEditAvance(false)
      setAvanceObs('')
    },
  })

  const responder = useMutation({
    mutationFn: () => quipuxService.responder(item.radi_nume_radi, {
      asunto: respAsunto,
      tipo_documento_id: respTipoId!,
    }),
    onSuccess: () => {
      setResponder(false)
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
      onResponderCreado?.()
      onClose()
    },
  })

  const comentar = useMutation({
    mutationFn: () => quipuxService.comentar(item.radi_nume_radi, comentario),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quipux-detalle', item.radi_nume_radi] })
      setComentario('')
    },
  })

  const enviar = useMutation({
    mutationFn: () => quipuxService.enviar(item.radi_nume_radi),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quipux-bandeja'] })
      qc.invalidateQueries({ queryKey: ['quipux-conteos'] })
      onClose()
    },
  })

  const archivarDoc = useMutation({
    mutationFn: () => quipuxService.archivar(item.radi_nume_radi),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quipux-bandeja'] })
      qc.invalidateQueries({ queryKey: ['quipux-conteos'] })
      onClose()
    },
  })

  useEffect(() => {
    if (!item.tiene_pdf && !item.tiene_pdf_firmado) return
    const radiId = item.radi_nume_radi
    if (pdfRadiRef.current === radiId) return
    pdfRadiRef.current = radiId
    setPdfCargando(true)
    const firmado = item.tiene_pdf_firmado
    quipuxService.obtenerUrlPDF(radiId, firmado).then(url => {
      setPdfUrl(url)
      setPdfCargando(false)
    }).catch(() => setPdfCargando(false))
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }
  }, [item.radi_nume_radi])

  function parsarFirmaHtml(html: string) {
    if (!html || !html.includes('<')) return null
    const parser = new DOMParser()
    const d = parser.parseFromString(html, 'text/html')
    const tds = Array.from(d.querySelectorAll('td'))
    if (tds.length < 2) return null
    return {
      cedula: tds[0]?.textContent?.trim() ?? '',
      nombre: tds[1]?.textContent?.trim() ?? '',
      cargo:  tds[3]?.textContent?.trim() ?? '',
      fecha:  tds[4]?.textContent?.trim() ?? '',
    }
  }

  function iconoAnexo(ext: string) {
    if (['xls','xlsx','csv','ods'].includes(ext)) return <FileSpreadsheet size={13} style={{ color: '#15803d' }} />
    if (['jpg','jpeg','png','gif','tif'].includes(ext)) return <FileImage size={13} style={{ color: '#7c3aed' }} />
    if (ext === 'pdf') return <FileText size={13} style={{ color: '#dc2626' }} />
    return <File size={13} style={{ color: T.rowSub }} />
  }

  // Recorrido unificado: Quipux hist_eventos + acciones SGD mezcladas por fecha
  const recorridoUnificado = (() => {
    if (!doc) return []

    // Agrupa eventos simultáneos con mismo origen y tipo de transacción
    // (el envío inicial genera un hist_evento por cada destinatario)
    const rawQx = doc.recorrido ?? []
    const grouped: typeof rawQx = []
    const used = new Set<number>()
    rawQx.forEach((ev, i) => {
      if (used.has(i)) return
      const tMin = ev.hist_fech ? ev.hist_fech.slice(0, 15) : ''  // YYYY-MM-DDTHH:MM
      const hermanos = rawQx.reduce<number[]>((acc, e2, j) => {
        if (j === i || used.has(j)) return acc
        const t2 = e2.hist_fech ? e2.hist_fech.slice(0, 15) : ''
        if (t2 === tMin && e2.sgd_ttr_codigo === ev.sgd_ttr_codigo && e2.usuario_origen === ev.usuario_origen)
          acc.push(j)
        return acc
      }, [])
      if (hermanos.length) {
        const todos = [i, ...hermanos]
        todos.forEach(j => used.add(j))
        const dests = todos.map(j => rawQx[j].usuario_destino).filter(Boolean)
        const label = ev.transaccion?.toLowerCase().includes('registro') || !ev.transaccion
          ? `Distribución inicial (${dests.length} destinatario(s))`
          : ev.transaccion
        grouped.push({
          ...ev,
          transaccion: label,
          usuario_destino: dests.join(' / '),
          hist_obse: `Enviado a: ${dests.join(', ')}`,
        })
      } else {
        used.add(i)
        grouped.push(ev)
      }
    })

    const qx = grouped.map(e => ({
      fecha: e.hist_fech, tipo: 'quipux' as const,
      accion: e.transaccion || 'Evento',
      descripcion: e.hist_obse || '',
      origen: e.usuario_origen,
      destino: e.usuario_destino,
    }))
    const sgd = (doc.acciones_sgd ?? []).map(a => ({
      fecha: a.creado_en, tipo: 'sgd' as const,
      accion: a.accion === 'reasignacion' ? 'Reasignación SGD'
            : a.accion === 'comentario'   ? 'Comentario SGD'
            : 'Archivado SGD',
      descripcion: a.observacion,
      origen: a.usuario,
      destino: '',
    }))
    return [...qx, ...sgd].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  })()

  const lRow = (l: string, v?: string | null) => v ? (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 10, color: T.rowSub, width: 90, flexShrink: 0 }}>{l}</span>
      <span style={{ fontSize: 11, color: T.rowTxt, fontWeight: 500 }}>{v}</span>
    </div>
  ) : null

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 680,
      background: T.ctHdrBg, borderLeft: `3px solid ${T.pnBd}`,
      display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden',
      boxShadow: T.pnSh,
    }}>
      {/* Reasignar overlay */}
      {mostrarReasignar && (
        <div style={{ position: 'absolute', inset: 0, background: T.ctHdrBg, zIndex: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: `0.5px solid ${T.pnMetaBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRightLeft size={14} style={{ color: T.pnBd }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.rowTxt }}>Reasignar documento Quipux</span>
            <button onClick={() => setReasignar(false)}
              style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
              <input placeholder="Buscar usuario por nombre..."
                value={busquedaUsr} onChange={e => setBusquedaUsr(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 28px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {usuarios?.results?.map(u => (
              <div key={u.id} onClick={() => setReasignarId(u.id)}
                style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: `0.5px solid ${reasignarId === u.id ? T.accentDk : T.rowBd}`, background: reasignarId === u.id ? T.rowSel : T.rowBg }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: T.rowTxt, margin: 0 }}>{u.nombre_completo}</p>
                <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>{u.cargo}{u.unidad_nombre ? ` · ${u.unidad_nombre}` : ''}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 14px' }}>
            <textarea value={reasignarObs} onChange={e => setReasignarObs(e.target.value)}
              placeholder="Instrucciones para el destinatario..." rows={2}
              style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }} />
          </div>
          <div style={{ padding: '10px 14px', borderTop: `0.5px solid ${T.pnMetaBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setReasignar(false)}
              style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>
              Cancelar
            </button>
            <button onClick={() => reasignarId && reasignar.mutate()} disabled={!reasignarId || reasignar.isPending}
              style={{ padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: reasignarId ? 'pointer' : 'not-allowed', background: reasignarId ? '#002f6c' : T.rowBd, color: reasignarId ? '#fff' : T.rowSub }}>
              {reasignar.isPending ? 'Reasignando...' : 'Reasignar'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: 'none', background: T.pnHdr }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Database size={11} style={{ color: T.pnHNum, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: T.pnHNum, letterSpacing: '.03em' }}>
            {item.radi_nume_text || item.radi_nume_radi}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,.2)', color: '#fff', padding: '1px 6px', borderRadius: 10, letterSpacing: '.05em' }}>
            QUIPUX
          </span>
          <button onClick={onClose}
            style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.15)', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>
            <X size={14} />
          </button>
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 8 }}>
          {item.radi_asunto || '(Sin asunto)'}
        </p>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>

          {/* ── Enviar (no_enviados / en_elaboracion) ──────────── */}
          {puedeEnviar && (
            <button onClick={() => enviar.mutate()} disabled={enviar.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid #ffd166', background: '#ffd166', color: '#002f6c', opacity: enviar.isPending ? 0.7 : 1 }}>
              <Send size={12} /> {enviar.isPending ? 'Enviando…' : 'Enviar'}
            </button>
          )}

          {/* ── Responder (recibidos / copia) ───────────────────── */}
          {puedeResponder && (
            <button onClick={() => { setRespAsunto(`RE: ${item.radi_asunto || ''}`); setResponder(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,.5)', background: 'rgba(255,255,255,.18)', color: '#fff' }}>
              <Send size={12} /> Responder
            </button>
          )}

          {/* ── Reasignar (todas menos enviados/archivados) ─────── */}
          {puedeReasignar && (
            <button onClick={() => setReasignar(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.85)' }}>
              <ArrowRightLeft size={12} /> Reasignar
            </button>
          )}

          {/* ── Archivar ────────────────────────────────────────── */}
          {puedeArchivar && (
            <button onClick={() => archivarDoc.mutate()} disabled={archivarDoc.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.75)', opacity: archivarDoc.isPending ? 0.7 : 1 }}>
              <Archive size={12} /> {archivarDoc.isPending ? 'Archivando…' : 'Archivar'}
            </button>
          )}

          {/* ── Actualizar avance (tareas) ───────────────────────── */}
          {item.es_tarea && bandeja === 'tareas_recibidas' && (
            <button onClick={() => setEditAvance(!editandoAvance)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #fcd34d', background: 'rgba(253,211,77,.2)', color: '#fef3c7' }}>
              Actualizar avance
            </button>
          )}

          {/* ── Descargar PDF (prefiere firmado si existe) ────────── */}
          {(item.tiene_pdf || item.tiene_pdf_firmado) && (
            <button onClick={() => quipuxService.descargarPDF(item.radi_nume_radi, item.radi_nume_text || item.radi_nume_radi, !!item.tiene_pdf_firmado)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: `1px solid ${item.tiene_pdf_firmado ? '#6ee7b7' : 'rgba(255,255,255,.3)'}`, background: item.tiene_pdf_firmado ? 'rgba(110,231,183,.2)' : 'rgba(255,255,255,.12)', color: item.tiene_pdf_firmado ? '#6ee7b7' : 'rgba(255,255,255,.85)' }}>
              <Download size={12} /> {item.tiene_pdf_firmado ? 'PDF Firmado' : 'PDF'}
            </button>
          )}

          {/* ── Solo lectura: badge informativo ─────────────────── */}
          {soloLectura && !item.tiene_pdf && !item.tiene_pdf_firmado && (
            <span style={{ fontSize: 10, color: T.rowSub, padding: '4px 8px', background: T.rowBg, borderRadius: 6, border: `0.5px solid ${T.rowBd}` }}>
              Solo lectura
            </span>
          )}
        </div>

        {/* Actualizar avance tarea inline */}
        {item.es_tarea && editandoAvance && (
          <div style={{ marginTop: 10, padding: '10px', background: '#fffbeb', borderRadius: 8, border: '0.5px solid #fcd34d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>Avance: {nuevoAvance}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={nuevoAvance}
              onChange={e => setNuevoAvance(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#d97706', marginBottom: 6 }} />
            <textarea value={avanceObs} onChange={e => setAvanceObs(e.target.value)}
              placeholder="Observación (opcional)..." rows={2}
              style={{ width: '100%', padding: '6px 8px', border: '0.5px solid #fcd34d', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', resize: 'none', outline: 'none', background: T.rowBg, color: T.rowTxt, marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditAvance(false)}
                style={{ padding: '4px 10px', borderRadius: 6, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, fontSize: 11, cursor: 'pointer', color: T.rowSub }}>
                Cancelar
              </button>
              <button onClick={() => actualizarAvance.mutate()} disabled={actualizarAvance.isPending}
                style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#d97706', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {actualizarAvance.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {/* Overlay: Responder */}
        {mostrarResponder && (
          <div style={{ position: 'absolute', inset: 0, background: T.ctHdrBg, zIndex: 10, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: `0.5px solid ${T.pnMetaBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={14} style={{ color: '#002f6c' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.rowTxt, flex: 1 }}>Responder documento Quipux</span>
              <button onClick={() => setResponder(false)}
                style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              <p style={{ fontSize: 10, color: T.rowSub, marginBottom: 10 }}>
                Se creará un documento SGD en elaboración vinculado al radicado <strong style={{ color: '#002f6c' }}>{item.radi_nume_text}</strong>
              </p>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.rowTxt, display: 'block', marginBottom: 4 }}>Tipo de documento:</label>
              <select value={respTipoId ?? ''} onChange={e => setRespTipoId(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', marginBottom: 10, background: T.rowBg, color: T.rowTxt }}>
                <option value="">Seleccionar tipo...</option>
                {tiposDoc?.results?.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.prefijo_numeracion} — {t.nombre}</option>
                ))}
              </select>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.rowTxt, display: 'block', marginBottom: 4 }}>Asunto:</label>
              <input value={respAsunto} onChange={e => setRespAsunto(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', background: T.rowBg, color: T.rowTxt, marginBottom: 10 }} />
              <p style={{ fontSize: 10, color: T.rowSub }}>
                El documento quedará en tu bandeja <strong>En elaboración</strong> para que puedas redactarlo y firmarlo antes de enviarlo.
              </p>
            </div>
            <div style={{ padding: '10px 14px', borderTop: `0.5px solid ${T.pnMetaBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setResponder(false)}
                style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>
                Cancelar
              </button>
              <button onClick={() => respTipoId && respAsunto.trim() && responder.mutate()}
                disabled={!respTipoId || !respAsunto.trim() || responder.isPending}
                style={{ padding: '7px 16px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: respTipoId ? 'pointer' : 'not-allowed', background: respTipoId ? '#002f6c' : T.rowBd, color: respTipoId ? '#fff' : T.rowSub, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Send size={11} /> {responder.isPending ? 'Creando...' : 'Crear respuesta'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ padding: '10px 14px', background: T.pnMeta, borderBottom: `1px solid ${T.pnMetaBd}` }}>
        {lRow('De:', item.area_nombre || item.creador_nombre)}
        {lRow('Elaborado por:', item.creador_nombre)}
        {lRow('Fecha:', item.radi_fech_radi ? new Date(item.radi_fech_radi).toLocaleString('es-EC') : '')}
        {lRow('Estado:', item.estado_nombre)}
        {lRow('N° Cuenta:', item.radi_cuentai)}
        {item.es_tarea && (
          <div style={{ marginTop: 8, padding: '8px 10px', background: '#fffbeb', border: '0.5px solid #fcd34d', borderRadius: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 5px' }}>Tarea asignada</p>
            {item.fecha_maxima && lRow('Vence:', new Date(item.fecha_maxima).toLocaleDateString('es-EC'))}
            {item.tarea_avance != null && (
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: '#92400e' }}>Avance</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e' }}>{item.tarea_avance}%</span>
                </div>
                <div style={{ height: 5, background: '#fde68a', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.tarea_avance}%`, background: '#d97706', borderRadius: 4, transition: 'width .3s' }} />
                </div>
              </div>
            )}
            {item.tarea_estado != null && (
              <p style={{ fontSize: 10, color: T.rowSub, marginTop: 4, margin: '5px 0 0' }}>
                Estado tarea: {item.tarea_estado === 1 ? 'Pendiente' : item.tarea_estado === 2 ? 'Finalizada' : 'Cancelada'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabs — segmented control */}
      <div style={{ padding: '8px 12px', borderBottom: `0.5px solid ${T.pnMetaBd}`, flexShrink: 0, background: T.pnMeta }}>
        <div style={{ display: 'flex', background: T.statsBg, borderRadius: 10, padding: 3, gap: 2 }}>
          {(([
            ...(item.tiene_pdf || item.tiene_pdf_firmado ? [['preview', 'Vista previa', Eye]] : []),
            ['info',      'Información',  FileText],
            ['recorrido', 'Recorrido',    ArrowRightLeft],
            ['anexos',    item.num_anexos > 0 ? `Anexos (${item.num_anexos})` : 'Anexos', Folder],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ]) as Array<[string, string, any]>).map(([k, l, TabIcon]) => (
            <button key={k} onClick={() => setTab(k as 'preview' | 'info' | 'recorrido' | 'anexos')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 4px', borderRadius: 8, fontSize: 11, fontWeight: tabActiva === k ? 700 : 500,
                border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: tabActiva === k ? T.ctHdrBg : 'transparent',
                color: tabActiva === k ? T.accentDk : T.rowSub,
                boxShadow: tabActiva === k ? '0 1px 4px rgba(0,47,108,.12)' : 'none',
              }}>
              <TabIcon size={12} />
              <span>{l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: tabActiva === 'preview' ? 0 : 14, overflow: 'auto' }}>
        {isLoading && tabActiva !== 'preview' && <div style={{ textAlign: 'center', color: T.rowSub, fontSize: 12, paddingTop: 40 }}>Cargando…</div>}

        {tabActiva === 'preview' && (
          pdfCargando ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10, color: T.rowSub }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${T.pnBd}`, borderTopColor: '#002f6c', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: 12 }}>Cargando PDF…</span>
            </div>
          ) : pdfUrl ? (
            <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title="Vista previa" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8, color: T.rowSub }}>
              <Eye size={32} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 12 }}>Sin PDF disponible</span>
            </div>
          )
        )}

        {doc && tabActiva === 'info' && (
          <div>
            {lRow('N° Radicado', doc.radi_nume_text)}
            {lRow('Fecha', doc.radi_fech_radi ? new Date(doc.radi_fech_radi).toLocaleString('es-EC') : '')}
            {lRow('Estado', doc.estado)}
            {lRow('Asunto', doc.radi_asunto)}
            {doc.radi_resumen && lRow('Resumen', doc.radi_resumen)}
            {doc.creador && (
              <>
                <div style={{ marginTop: 10, marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.rowSub, letterSpacing: 1 }}>Remitente</div>
                {lRow('Nombre', doc.creador.nombre)}
                {lRow('Cargo', doc.creador.cargo)}
                {lRow('Área', doc.creador.area)}
              </>
            )}
            {doc.radi_nomb_usua_firma && (() => {
              const firma = parsarFirmaHtml(doc.radi_nomb_usua_firma)
              return firma ? (
                <>
                  <div style={{ marginTop: 10, marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.rowSub, letterSpacing: 1 }}>Firma electrónica</div>
                  <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
                    <p style={{ fontWeight: 700, color: '#0f6e56', margin: '0 0 3px' }}>✓ {firma.nombre}</p>
                    {firma.cedula && <p style={{ color: T.rowTxt, margin: '0 0 2px' }}>CI: {firma.cedula}</p>}
                    {firma.cargo  && <p style={{ color: T.rowSub, margin: '0 0 2px' }}>{firma.cargo}</p>}
                    {firma.fecha  && <p style={{ color: T.rowSub, margin: 0, fontSize: 10 }}>{firma.fecha}</p>}
                  </div>
                </>
              ) : lRow('Firmado por', doc.radi_nomb_usua_firma)
            })()}
          </div>
        )}

        {doc && tabActiva === 'recorrido' && (
          <div>
            {recorridoUnificado.length === 0 && <p style={{ fontSize: 11, color: T.rowSub }}>Sin recorrido registrado.</p>}
            {recorridoUnificado.map((ev, i) => {
              const isLast = i === recorridoUnificado.length - 1
              const dotColor = ev.tipo === 'sgd' ? '#0f6e56' : '#002f6c'
              return (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: dotColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 6px ${dotColor}55` }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                    </div>
                    {!isLast && <div style={{ width: 2, flex: 1, background: T.rowBd, minHeight: 10, marginTop: 3, borderRadius: 1 }} />}
                  </div>
                  <div style={{ flex: 1, background: T.rowBg, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, padding: '7px 10px', marginBottom: isLast ? 0 : 2 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: dotColor, margin: '0 0 1px' }}>
                      {ev.accion}
                      {ev.tipo === 'sgd' && <span style={{ fontSize: 9, fontWeight: 600, background: '#dcfce7', color: '#0f6e56', padding: '1px 5px', borderRadius: 8, marginLeft: 5 }}>SGD</span>}
                    </p>
                    <p style={{ fontSize: 10, color: T.rowSub, margin: '0 0 2px' }}>
                      {ev.origen}{ev.destino ? ` → ${ev.destino}` : ''}{ev.origen ? ' · ' : ''}{new Date(ev.fecha).toLocaleString('es-EC')}
                    </p>
                    {ev.descripcion && (
                      <p style={{ fontSize: 10, color: T.rowTxt, margin: '4px 0 0', borderLeft: `2px solid ${T.rowBd}`, paddingLeft: 6, fontStyle: 'italic' }}>
                        {ev.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Historial de avances de tarea */}
            {item.es_tarea && histAvance && histAvance.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid #f0f0f0' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Historial de avance</p>
                {histAvance.map((h, i) => (
                  <div key={h.id ?? i} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fffbeb', border: '1.5px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#92400e', flexShrink: 0 }}>
                      {h.avance}%
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
                          <div style={{ width: `${h.avance}%`, height: '100%', background: h.avance >= 100 ? '#0f6e56' : '#d97706', borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                      {h.observacion && <p style={{ fontSize: 10, color: T.rowTxt, margin: '2px 0' }}>{h.observacion}</p>}
                      <p style={{ fontSize: 9, color: T.rowSub, margin: 0 }}>{h.usuario} · {new Date(h.creado_en).toLocaleString('es-EC')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tabActiva === 'anexos' && (
          cargandoAnexos ? (
            <p style={{ fontSize: 11, color: T.rowSub }}>Cargando anexos…</p>
          ) : !anexos || anexos.length === 0 ? (
            <p style={{ fontSize: 11, color: T.rowSub }}>Sin anexos adjuntos.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {anexos.map((a: QuipuxAnexo) => (
                <div key={a.anex_codigo} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: T.rowBg, borderRadius: 8, border: `0.5px solid ${T.rowBd}` }}>
                  {iconoAnexo(a.anex_tipo_ext)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.rowTxt, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.anex_nombre || `anexo.${a.anex_tipo_ext}`}
                    </p>
                    <p style={{ fontSize: 10, color: T.rowSub, margin: 0 }}>
                      {a.anex_tipo_ext.toUpperCase()} {a.anex_tamano ? `· ${Math.round(Number(a.anex_tamano))} KB` : ''}
                    </p>
                  </div>
                  {a.tiene_archivo ? (
                    <button onClick={() => quipuxService.descargarAnexo(a.anex_codigo, a.anex_nombre || `anexo.${a.anex_tipo_ext}`)}
                      style={{ padding: '3px 8px', background: '#002f6c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Download size={10} /> Descargar
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, color: T.rowSub }}>Sin archivo</span>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Comment area */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.pnMetaBd}`, background: T.pnCmt }}>
        <textarea value={comentario} onChange={e => setComentario(e.target.value)}
          placeholder="Escribir observación sobre este documento Quipux..."
          rows={2}
          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${T.pnCmtBd}`, borderRadius: 10, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <button
            onClick={() => quipuxService.imprimirRecorrido(item.radi_nume_radi, item.radi_nume_text)}
            title="Imprimir recorrido del documento en PDF institucional"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: '0.5px solid #002f6c', background: '#e8f1fd', color: '#002f6c', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={12} /> Imprimir recorrido
          </button>
          <button
            onClick={() => comentario.trim() && comentar.mutate()}
            disabled={!comentario.trim() || comentar.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: comentario.trim() ? '#002f6c' : '#e5e7eb', color: comentario.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: comentario.trim() ? 'pointer' : 'not-allowed' }}>
            <MessageSquare size={13} /> {comentar.isPending ? 'Guardando...' : 'Guardar observación'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal de documentos ──────────────────────────────────────────
export default function DocumentosPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const authUsuario = useAuthStore(s => s.usuario)
  const esAdmin = authUsuario?.is_admin ?? false
  const { esAdmin: permisosAdmin, puede } = usePermisosStore()
  const { tema, setTema } = useThemeStore()
  const T = THEMES[tema].vars
  // soloQuipux: usuarios que solo pueden VER documentos (no crear)
  // → ven bandejas Quipux sin botón "Nuevo documento"
  const soloQuipux = !puede('documentos', 'crear')

  const [temaOpen, setTemaOpen] = useState(false)
  const [bandejaActiva, setBandeja]   = useState('recibidos')
  const [selectedId, setSelectedId]     = useState<number | null>(null)
  const [selectedSnap, setSelectedSnap] = useState<BandejaItem | null>(null)
  const [selectedQuipux, setSelQuipux]  = useState<QuipuxDocumento | null>(null)
  const [modal, setModal]               = useState(false)
  const [docEditar, setDocEditar]       = useState<any>(null)
  const [panelTrigger] = useState<{ action: string; t: number } | null>(null)
  const [busqueda, setBusqueda]       = useState('')
  const [filtroLeido, setFiltroLeido] = useState('')
  const [filtroTipo, setFiltroTipo]   = useState('')

  // Búsqueda avanzada
  const [busquedaAvanzada, setBusquedaAvanzada] = useState(false)
  const [bAvNum,  setBAvNum]  = useState('')
  const [bAvAsu,  setBAvAsu]  = useState('')
  const [bAvDes,  setBAvDes]  = useState('')
  const [bAvHas,  setBAvHas]  = useState('')

  // Respaldo de documentos (sidebar)
  const [sidebarRespaldoAbierto, setSidebarRespaldoAbierto] = useState(false)
  const [respaldoDesde, setRespaldoDesde] = useState('')
  const [respaldoHasta, setRespaldoHasta] = useState('')

  // Admin: usuario cuya bandeja se está viendo (aplica a SGD + Quipux)
  const [adminVer, setAdminVer] = useState<{ id: number; cedula: string; nombre: string; activo: boolean } | null>(null)
  const [mostrarSelectorUsuario, setMostrarSelector] = useState(false)
  const [busqUsuario, setBusqUsuario] = useState('')

  // Paginación independiente para documentos Quipux
  const [qPage, setQPage] = useState(1)
  const Q_PAGE_SIZE = 50

  const { data: usuariosSelector } = useQuery({
    queryKey: ['usuarios-selector', busqUsuario],
    queryFn: () => usuariosService.listar({ search: busqUsuario, page_size: '40' } as any),
    enabled: mostrarSelectorUsuario,
    staleTime: 15000,
  })

  const { data: conteos, refetch: refetchConteos } = useQuery({
    queryKey: ['bandeja-conteos', adminVer?.id],
    queryFn: () => bandejaService.conteos(adminVer?.id),
    refetchInterval: adminVer ? undefined : 30000,
  })

  // Conteos Quipux por bandeja (para badge secundario en sidebar)
  const { data: quipuxConteos } = useQuery({
    queryKey: ['quipux-conteos', adminVer?.cedula],
    queryFn: () => quipuxService.misBandejas(adminVer?.cedula),
    staleTime: 60000,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bandeja', bandejaActiva, busqueda, filtroLeido, filtroTipo, adminVer?.id],
    queryFn: () => bandejaService.porBandeja(bandejaActiva, {
      ...(busqueda    ? { search: busqueda }   : {}),
      ...(filtroLeido ? { leido: filtroLeido } : {}),
      ...(filtroTipo  ? { tipo: filtroTipo }   : {}),
      ...(adminVer    ? { usuario_id: adminVer.id } : {}),
    }),
    enabled: !soloQuipux,
    placeholderData: keepPreviousData,
    staleTime: 10000,
  })

  // Quipux docs — solo en bandejas con equivalente Quipux
  const qBandeja = QUIPUX_BANDEJA_MAP[bandejaActiva] ?? null
  const { data: quipuxData, isFetching: qFetching } = useQuery({
    queryKey: ['quipux-bandeja', bandejaActiva, adminVer?.cedula, qPage, busqueda],
    queryFn: () => quipuxService.buscar({
      bandeja: qBandeja!,
      page: String(qPage),
      page_size: String(Q_PAGE_SIZE),
      ...(esAdmin && adminVer ? { cedula_usuario: adminVer.cedula } : {}),
      ...(busqueda ? { search: busqueda } : {}),
    }),
    enabled: !!qBandeja,
    staleTime: busqueda ? 0 : 30000,
    placeholderData: keepPreviousData,
  })
  const quipuxItems = quipuxData?.results ?? []
  const quipuxTotal = quipuxData?.count ?? 0
  const quipuxHayMas = quipuxTotal > qPage * Q_PAGE_SIZE

  // Búsqueda en contenido de PDFs Quipux (full-text indexado por Celery)
  const { data: contenidoQuipux } = useQuery({
    queryKey: ['quipux-contenido', busqueda],
    queryFn: () => quipuxService.buscarContenido(busqueda),
    enabled: !!qBandeja && busqueda.length >= 3,
    staleTime: 60000,
  })
  // Búsqueda avanzada — busca en quipux transaccional por número o asunto
  const { data: resultadosBusqAvz, isFetching: bAvFetching } = useQuery({
    queryKey: ['quipux-busq-avz', bAvNum, bAvAsu, bAvDes, bAvHas],
    queryFn: () => quipuxService.buscar({
      ...(bAvNum ? { numero: bAvNum } : {}),
      ...(bAvAsu ? { asunto: bAvAsu } : {}),
      ...(bAvDes ? { desde: bAvDes } : {}),
      ...(bAvHas ? { hasta: bAvHas } : {}),
      page: '1', page_size: '100',
    }),
    enabled: busquedaAvanzada && (bAvNum.length >= 3 || bAvAsu.length >= 3),
    staleTime: 30000,
  })

  const radisConContenido = new Set<string>(contenidoQuipux?.resultados ?? [])
  const quipuxItemsFiltrados = busqueda.length >= 3 && radisConContenido.size > 0
    ? [...quipuxItems].sort((a, b) => {
        const aM = radisConContenido.has(a.radi_nume_text)
        const bM = radisConContenido.has(b.radi_nume_text)
        if (aM && !bM) return -1
        if (!aM && bM) return 1
        return 0
      })
    : quipuxItems

  const marcarLeido = useMutation({
    mutationFn: (id: number) => bandejaService.marcarLeido(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bandeja'] })
      qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
    },
  })

  const handleSelectSGD = (item: BandejaItem) => {
    setSelectedId(item.id)
    setSelectedSnap(item)
    setSelQuipux(null)
    if (!item.leido) marcarLeido.mutate(item.id)
  }

  const handleSelectQuipux = (item: QuipuxDocumento) => {
    setSelQuipux(item)
    setSelectedId(null)
    setSelectedSnap(null)
    // Marcar como leída la reasignación SGD si existe
    quipuxService.marcarLeido(item.radi_nume_radi).catch(() => {})
    qc.invalidateQueries({ queryKey: ['quipux-conteos'] })
  }

  const items = data?.results ?? []

  useEffect(() => {
    if (!selectedId) return
    const live = items.find(i => i.id === selectedId)
    if (live) setSelectedSnap(live)
  }, [selectedId, items])

  const selected = selectedId
    ? (items.find(i => i.id === selectedId) ?? selectedSnap)
    : null

  const cambiarBandeja = (key: string) => {
    setBandeja(key)
    setSelectedId(null)
    setSelectedSnap(null)
    setSelQuipux(null)
    setQPage(1)
  }

  const SECCIONES = [
    { key: 'bandejas', label: 'Bandejas' },
    { key: 'otras',    label: 'Otras bandejas' },
  ]

  void ((data?.count ?? 0) + quipuxTotal)  // total combinado no se muestra en barra (ver barra de estado)

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '200px 1fr',
      height: soloQuipux ? 'calc(100vh - 56px)' : 'calc(100vh - 96px)',
      borderRadius: soloQuipux ? 0 : 14,
      overflow: 'hidden', border: soloQuipux ? 'none' : `0.5px solid ${T.rowBd}`,
      background: T.ctBg, position: 'relative',
    }}>
      {modal && (
        <EditorDocumento
          onClose={() => setModal(false)}
          onEnviado={() => { setModal(false); setBandeja('enviados'); }}
        />
      )}
      {docEditar && (
        <EditorDocumento
          documentoExistente={docEditar}
          onClose={() => { setDocEditar(null); qc.invalidateQueries({ queryKey: ['bandeja'] }); }}
          onEnviado={() => { setDocEditar(null); setBandeja('enviados'); qc.invalidateQueries({ queryKey: ['bandeja'] }); }}
        />
      )}

      {/* Modal selector de usuario admin */}
      {mostrarSelectorUsuario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: T.ctHdrBg, borderRadius: 16, width: 440, maxHeight: '75vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.pnMetaBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={14} style={{ color: '#002f6c' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, flex: 1 }}>Ver bandeja de usuario</span>
              <button onClick={() => setMostrarSelector(false)}
                style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
                <input autoFocus placeholder="Buscar por nombre o cédula..."
                  value={busqUsuario} onChange={e => setBusqUsuario(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px 7px 28px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Opción: mis propios documentos */}
              <div onClick={() => { setAdminVer(null); setMostrarSelector(false); setSelQuipux(null); setSelectedId(null) }}
                style={{ padding: '9px 12px', borderRadius: 9, cursor: 'pointer', border: `0.5px solid ${!adminVer ? '#002f6c' : T.rowBd}`, background: !adminVer ? T.rowSel : T.rowBg, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#002f6c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  YO
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#002f6c', margin: 0 }}>Mis documentos</p>
                  <p style={{ fontSize: 10, color: T.rowSub, margin: 0 }}>Ver mi propia bandeja</p>
                </div>
                {!adminVer && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#002f6c', fontWeight: 700 }}>✓ activo</span>}
              </div>
              {usuariosSelector?.results?.filter(u => u.cedula).map(u => (
                <div key={u.id}
                  onClick={() => { setAdminVer({ id: u.id, cedula: u.cedula, nombre: u.nombre_completo, activo: u.activo }); setMostrarSelector(false); setSelQuipux(null); setSelectedId(null) }}
                  style={{ padding: '8px 12px', borderRadius: 9, cursor: 'pointer', border: `0.5px solid ${adminVer?.id === u.id ? '#002f6c' : T.rowBd}`, background: adminVer?.id === u.id ? T.rowSel : T.rowBg, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.activo ? T.rowSel : T.rowHv, color: u.activo ? '#002f6c' : T.rowSub, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {u.nombres?.[0]}{u.apellidos?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: T.rowTxt, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nombre_completo}</p>
                    <p style={{ fontSize: 10, color: T.rowSub, margin: '1px 0 0' }}>
                      {u.cedula}{u.cargo ? ` · ${u.cargo}` : ''}
                      {!u.activo && <span style={{ marginLeft: 6, color: '#ef4444', fontWeight: 600 }}>Inactivo — solo Quipux</span>}
                    </p>
                  </div>
                  {adminVer?.id === u.id && <span style={{ fontSize: 10, color: '#002f6c', fontWeight: 700, flexShrink: 0 }}>✓</span>}
                </div>
              ))}
              {mostrarSelectorUsuario && !usuariosSelector && (
                <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 16 }}>Escribe para buscar usuarios…</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal búsqueda avanzada */}
      {busquedaAvanzada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: T.ctHdrBg, borderRadius: 16, width: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.24)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.pnMetaBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={14} style={{ color: '#002f6c' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, flex: 1 }}>Búsqueda avanzada en Quipux</span>
              <button onClick={() => setBusquedaAvanzada(false)}
                style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.pnMetaBd}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: T.rowSub, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>N° Radicado</label>
                  <input value={bAvNum} onChange={e => setBAvNum(e.target.value)}
                    placeholder="ej: CGPMC-2024-1234"
                    style={{ width: '100%', padding: '7px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', background: T.rowBg, color: T.rowTxt, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: T.rowSub, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Asunto</label>
                  <input value={bAvAsu} onChange={e => setBAvAsu(e.target.value)}
                    placeholder="Palabras clave del asunto..."
                    style={{ width: '100%', padding: '7px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', background: T.rowBg, color: T.rowTxt, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: T.rowSub, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Desde</label>
                  <input type="date" value={bAvDes} onChange={e => setBAvDes(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', background: T.rowBg, color: T.rowTxt, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: T.rowSub, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Hasta</label>
                  <input type="date" value={bAvHas} onChange={e => setBAvHas(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', background: T.rowBg, color: T.rowTxt, boxSizing: 'border-box' }} />
                </div>
              </div>
              <p style={{ fontSize: 10, color: T.rowSub }}>Escribe al menos 3 caracteres en N° o Asunto para buscar.</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
              {bAvFetching && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20, color: T.rowSub, fontSize: 12 }}>Buscando…</div>
              )}
              {!bAvFetching && resultadosBusqAvz && (
                resultadosBusqAvz.results.length === 0
                  ? <p style={{ textAlign: 'center', color: T.rowSub, fontSize: 12, padding: 20 }}>No se encontraron documentos.</p>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <p style={{ fontSize: 10, color: T.rowSub, marginBottom: 6 }}>{resultadosBusqAvz.count} resultado(s)</p>
                      {resultadosBusqAvz.results.map(item => (
                        <div key={item.radi_nume_radi}
                          onClick={() => { setSelQuipux(item); setBusquedaAvanzada(false) }}
                          style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: `0.5px solid ${T.rowBd}`, background: T.rowBg, transition: 'all .15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.rowHv; (e.currentTarget as HTMLElement).style.borderColor = '#002f6c' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.rowBg; (e.currentTarget as HTMLElement).style.borderColor = T.rowBd }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <Database size={11} style={{ color: '#002f6c', flexShrink: 0 }} />
                            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#002f6c' }}>{item.radi_nume_text || item.radi_nume_radi}</span>
                            <span style={{ fontSize: 9, background: '#002f6c', color: '#fff', padding: '1px 5px', borderRadius: 8 }}>QUIPUX</span>
                            <span style={{ marginLeft: 'auto', fontSize: 9, color: T.rowSub }}>{item.radi_fech_radi ? new Date(item.radi_fech_radi).toLocaleDateString('es-EC') : ''}</span>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: 0, lineHeight: 1.3 }}>{item.radi_asunto || '(Sin asunto)'}</p>
                          <p style={{ fontSize: 10, color: T.rowSub, margin: '3px 0 0' }}>{item.area_nombre || item.creador_nombre}</p>
                        </div>
                      ))}
                    </div>
              )}
              {!bAvFetching && !resultadosBusqAvz && (bAvNum.length >= 3 || bAvAsu.length >= 3) && (
                <p style={{ textAlign: 'center', color: T.rowSub, fontSize: 12, padding: 20 }}>Sin resultados aún</p>
              )}
            </div>
            <div style={{ padding: '10px 16px', borderTop: `0.5px solid ${T.pnMetaBd}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => { setBAvNum(''); setBAvAsu(''); setBAvDes(''); setBAvHas('') }}
                style={{ fontSize: 11, color: T.rowSub, background: 'none', border: 'none', cursor: 'pointer' }}>
                Limpiar filtros
              </button>
              <button onClick={() => setBusquedaAvanzada(false)}
                style={{ padding: '7px 16px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, cursor: 'pointer', background: T.rowBg, color: T.rowTxt }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div style={{ background: T.sbBg, borderRight: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '2px 0 12px rgba(0,0,0,.15)' }}>

        {soloQuipux ? (
          /* ── Modo solo Quipux: navegación por bandejas Quipux ─────────── */
          <>
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#da291c,#ff4d3d)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(218,41,28,.35)' }}>
                  <Globe2 size={14} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>Quipux</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', margin: 0 }}>Sistema de correspondencia</p>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
              {/* Bandejas */}
              <p style={{ fontSize: 9, fontWeight: 700, color: T.sbLabel, textTransform: 'uppercase', letterSpacing: '.1em', padding: '4px 4px 4px 6px' }}>Bandejas</p>
              {BANDEJAS.filter(b => QUIPUX_BANDEJA_MAP[b.key]).map(({ key, label, icon: Icon }) => {
                const qCount    = quipuxConteos ? (quipuxConteos as any)[key] ?? 0 : 0
                const qNoLeidos = key === 'recibidos'
                  ? (quipuxConteos?.reasig_no_leidas ?? 0)
                  : key === 'copia'
                  ? (quipuxConteos?.copia_no_leidos ?? 0)
                  : 0
                const isActive  = bandejaActiva === key
                return (
                  <div key={key} onClick={() => cambiarBandeja(key)}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = T.sbHover }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 9, marginBottom: 2,
                      cursor: 'pointer', fontSize: 12, transition: 'background .12s',
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? T.sbTextOn : T.sbText,
                      background: isActive ? T.sbActive : 'transparent',
                    }}>
                    <Icon size={14} style={{ flexShrink: 0, color: isActive ? T.sbIconOn : T.sbIcon }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      {qNoLeidos > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#da291c', color: '#fff' }}>
                          {qNoLeidos}
                        </span>
                      )}
                      {qCount > 0 && qNoLeidos === 0 && (
                        <span style={{ fontSize: 10, color: isActive ? T.sbIconOn : T.sbLabel }}>{qCount.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Administración */}
              <p style={{ fontSize: 9, fontWeight: 700, color: T.sbLabel, textTransform: 'uppercase', letterSpacing: '.1em', padding: '10px 4px 4px 6px' }}>Administración</p>
              {([
                { label: 'Cambio de contraseña', icon: Lock,     action: () => navigate('/perfil') },
                { label: 'Respaldo documentos',  icon: Download, action: () => setSidebarRespaldoAbierto(v => !v) },
              ] as { label: string; icon: any; action: () => void }[]).map(({ label, icon: Icon, action }) => (
                <div key={label} onClick={action}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: T.sbText, borderRadius: 9, margin: '0 0 1px', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.sbHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <Icon size={13} style={{ flexShrink: 0, color: T.sbIcon }} /> {label}
                </div>
              ))}

              {/* Mini-panel de respaldo */}
              {sidebarRespaldoAbierto && (
                <div style={{ margin: '4px 8px', padding: '10px 12px', background: T.sbHover, border: `0.5px solid ${T.sbBorder}`, borderRadius: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.sbIconOn, marginBottom: 6 }}>Respaldo de mi bandeja</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: T.sbLabel }}>Desde</label>
                    <input type="date" value={respaldoDesde} onChange={e => setRespaldoDesde(e.target.value)}
                      style={{ padding: '4px 7px', border: `0.5px solid ${T.sbBorder}`, borderRadius: 6, fontSize: 11, outline: 'none', background: 'rgba(255,255,255,.1)', color: '#fff' }} />
                    <label style={{ fontSize: 10, color: T.sbLabel }}>Hasta</label>
                    <input type="date" value={respaldoHasta} onChange={e => setRespaldoHasta(e.target.value)}
                      style={{ padding: '4px 7px', border: `0.5px solid ${T.sbBorder}`, borderRadius: 6, fontSize: 11, outline: 'none', background: 'rgba(255,255,255,.1)', color: '#fff' }} />
                  </div>
                  <button onClick={async () => {
                    try {
                      await quipuxService.miRespaldo({ desde: respaldoDesde || undefined, hasta: respaldoHasta || undefined })
                      setSidebarRespaldoAbierto(false)
                    } catch { /* error handled by browser */ }
                  }}
                    style={{ width: '100%', padding: '6px 0', background: T.accentDk, color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Download size={12} /> Descargar Excel
                  </button>
                </div>
              )}

              {/* Herramientas */}
              <p style={{ fontSize: 9, fontWeight: 700, color: T.sbLabel, textTransform: 'uppercase', letterSpacing: '.1em', padding: '10px 4px 4px 6px' }}>Herramientas</p>
              <div onClick={() => setBusquedaAvanzada(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: T.sbText, borderRadius: 9, margin: '0 0 1px', transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.sbHover}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <Search size={13} style={{ flexShrink: 0, color: T.sbIcon }} /> Búsqueda avanzada
              </div>
            </div>
            {/* Theme picker */}
            <div style={{ position: 'relative', padding: '6px 14px', borderTop: `1px solid ${T.sbBorder}` }}>
              <button onClick={() => setTemaOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', width: '100%' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: THEMES[tema].color, border: '2px solid rgba(255,255,255,.4)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: T.sbText }}>Tema: {THEMES[tema].nombre}</span>
              </button>
              {temaOpen && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, background: T.ctHdrBg, borderRadius: 12, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,.22)', display: 'grid', gridTemplateColumns: 'repeat(4, 38px)', gap: 6, zIndex: 50, border: `1px solid ${T.rowBd}` }}>
                  {THEME_ORDER.map(id => (
                    <div key={id} onClick={() => { setTema(id); setTemaOpen(false) }} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: THEMES[id].color, border: tema === id ? '3px solid #002f6c' : `2px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {tema === id && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: 8, color: T.rowTxt, whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.2 }}>{THEMES[id].nombre}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Perfil al pie */}
            <div onClick={() => navigate('/perfil')}
              style={{ padding: '10px 14px', borderTop: `1px solid ${T.sbBorder}`, background: T.sbUser, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#da291c,#ff4d3d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 1px 5px rgba(218,41,28,.3)' }}>
                {`${authUsuario?.nombres?.[0] ?? ''}${authUsuario?.apellidos?.[0] ?? ''}`.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: T.sbTextOn, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUsuario?.nombre_completo}</p>
                <p style={{ fontSize: 9, color: T.sbLabel, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUsuario?.cargo || 'Perfil'}</p>
              </div>
              <User size={13} style={{ color: T.sbIcon, flexShrink: 0 }} />
            </div>
          </>
        ) : (
          /* ── Modo completo archivo/admin ─────────────────────────────── */
          <>
            <div style={{ padding: '10px 10px 4px' }}>
              {/* Admin: bandeja de usuario seleccionado */}
              {esAdmin && adminVer ? (
                <div style={{ marginBottom: 6, padding: '8px 10px', background: '#e8f1fd', borderRadius: 10, border: '0.5px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <Database size={10} style={{ color: '#002f6c', flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#002f6c', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Viendo bandeja de:
                    </span>
                    <button onClick={() => { setAdminVer(null); setSelQuipux(null); setSelectedId(null) }}
                      style={{ marginLeft: 'auto', padding: 1, border: 'none', background: 'none', cursor: 'pointer', color: '#93c5fd' }}>
                      <X size={11} />
                    </button>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminVer.nombre}</p>
                  {!adminVer.activo && (
                    <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 600 }}>Usuario inactivo · solo Quipux</span>
                  )}
                  <button onClick={() => { setBusqUsuario(''); setMostrarSelector(true) }}
                    style={{ marginTop: 4, fontSize: 9, color: '#002f6c', background: T.ctHdrBg, border: '0.5px solid #93c5fd', borderRadius: 6, padding: '2px 7px', cursor: 'pointer', fontWeight: 600, width: '100%' }}>
                    Cambiar usuario
                  </button>
                </div>
              ) : esAdmin ? (
                <button onClick={() => { setBusqUsuario(''); setMostrarSelector(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', padding: '7px 10px', borderRadius: 9, border: '0.5px solid #dbeafe', background: '#f0f4ff', color: '#002f6c', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 4 }}>
                  <Database size={12} /> Ver bandeja de usuario…
                </button>
              ) : null}

              <button onClick={() => setModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 12px', borderRadius: 10, background: '#002f6c', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', marginBottom: 4 }}>
                <Plus size={14} /> Nuevo documento
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
              {SECCIONES.map(sec => (
                <div key={sec.key}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: T.sbLabel, textTransform: 'uppercase', letterSpacing: '.1em', padding: '10px 12px 4px' }}>
                    {sec.label}
                  </p>
                  {BANDEJAS.filter(b => b.seccion === sec.key).map(({ key, label, icon: Icon }) => {
                    const c          = conteos?.[key]
                    const noLeidos   = c?.no_leidos ?? 0
                    const qCount     = quipuxConteos ? (quipuxConteos as any)[key] ?? 0 : 0
                    const qNoLeidos  = key === 'recibidos'
                      ? (quipuxConteos?.reasig_no_leidas ?? 0)
                      : key === 'copia'
                      ? (quipuxConteos?.copia_no_leidos ?? 0)
                      : 0
                    const isActive   = bandejaActiva === key
                    const tieneQuipux = !!QUIPUX_BANDEJA_MAP[key] && qCount > 0
                    return (
                      <div key={key} onClick={() => cambiarBandeja(key)}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = T.sbHover }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '7px 10px', borderRadius: 9, marginBottom: 2,
                          cursor: 'pointer', fontSize: 12, transition: 'background .12s',
                          fontWeight: isActive ? 700 : 400,
                          color: isActive ? T.sbTextOn : T.sbText,
                          background: isActive ? T.sbActive : 'transparent',
                        }}>
                        <Icon size={14} style={{ flexShrink: 0, color: isActive ? T.sbIconOn : T.sbIcon }} />
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          {noLeidos > 0 && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: isActive ? '#ffd166' : '#da291c', color: isActive ? '#002f6c' : '#fff' }}>
                              {noLeidos}
                            </span>
                          )}
                          {qNoLeidos > 0 && (
                            <span title={`${qNoLeidos} no leídos en Quipux`} style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: isActive ? '#ffd166' : '#002f6c', color: isActive ? '#002f6c' : '#fff' }}>
                              {qNoLeidos}
                            </span>
                          )}
                          {tieneQuipux && qNoLeidos === 0 && noLeidos === 0 && (
                            <span title={`${qCount.toLocaleString()} en Quipux`} style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 8, background: isActive ? 'rgba(255,255,255,.2)' : '#e8f1fd', color: isActive ? '#fff' : '#002f6c' }}>
                              Q
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* ── Sección Administración (igual que Quipux original) ── */}
              <p style={{ fontSize: 9, fontWeight: 700, color: T.sbLabel, textTransform: 'uppercase', letterSpacing: '.1em', padding: '10px 12px 4px' }}>Administración</p>
              {([
                { label: 'Cambio de contraseña', icon: Lock,       action: () => navigate('/perfil') },
                { label: 'Respaldo documentos',  icon: Download,   action: () => {
                  setSidebarRespaldoAbierto(v => !v)
                }},
                ...(puede('tramites', 'ver') ? [
                  { label: 'Trámites ciudadanos', icon: ClipboardList, action: () => navigate('/tramites') },
                ] : []),
                ...(puede('archivo', 'ver') ? [
                  { label: 'Archivo documental',  icon: Archive,       action: () => navigate('/archivo') },
                ] : []),
                ...(esAdmin || permisosAdmin ? [
                  { label: 'Usuarios internos',  icon: Users,      action: () => navigate('/usuarios') },
                  { label: 'Áreas / organigrama',icon: BookUser,   action: () => navigate('/organigrama') },
                  { label: 'Numeración/Tipos',   icon: Settings,   action: () => navigate('/ajustes') },
                  { label: 'Estadísticas SGD',   icon: BarChart2,  action: () => navigate('/auditoria/dashboard') },
                ] : []),
              ] as { label: string; icon: any; action: () => void }[]).map(({ label, icon: Icon, action }) => (
                <div key={label} onClick={action}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: T.sbText, borderRadius: 9, margin: '0 4px 1px', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.sbHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <Icon size={13} style={{ flexShrink: 0, color: T.sbIcon }} /> {label}
                </div>
              ))}

              {/* Mini-panel de respaldo */}
              {sidebarRespaldoAbierto && (
                <div style={{ margin: '4px 8px', padding: '10px 12px', background: T.sbHover, border: `0.5px solid ${T.sbBorder}`, borderRadius: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.sbIconOn, marginBottom: 6 }}>Respaldo de mi bandeja</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: T.sbLabel }}>Desde</label>
                    <input type="date" value={respaldoDesde} onChange={e => setRespaldoDesde(e.target.value)}
                      style={{ padding: '4px 7px', border: `0.5px solid ${T.sbBorder}`, borderRadius: 6, fontSize: 11, outline: 'none', background: 'rgba(255,255,255,.1)', color: '#fff' }} />
                    <label style={{ fontSize: 10, color: T.sbLabel }}>Hasta</label>
                    <input type="date" value={respaldoHasta} onChange={e => setRespaldoHasta(e.target.value)}
                      style={{ padding: '4px 7px', border: `0.5px solid ${T.sbBorder}`, borderRadius: 6, fontSize: 11, outline: 'none', background: 'rgba(255,255,255,.1)', color: '#fff' }} />
                  </div>
                  <button onClick={async () => {
                    try {
                      await quipuxService.miRespaldo({ desde: respaldoDesde || undefined, hasta: respaldoHasta || undefined })
                      setSidebarRespaldoAbierto(false)
                    } catch { /* error handled by browser */ }
                  }}
                    style={{ width: '100%', padding: '6px 0', background: T.accentDk, color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Download size={12} /> Descargar Excel
                  </button>
                </div>
              )}

              {/* ── Herramientas ── */}
              <p style={{ fontSize: 9, fontWeight: 700, color: T.sbLabel, textTransform: 'uppercase', letterSpacing: '.1em', padding: '10px 12px 4px' }}>Herramientas</p>
              {([
                { label: 'Búsqueda avanzada', icon: Search,       action: () => setBusquedaAvanzada(true) },
                { label: 'Auditoría',          icon: CheckCircle, action: () => navigate('/auditoria') },
                { label: 'Reportes',           icon: Filter,      action: () => navigate('/reportes') },
              ] as { label: string; icon: any; action: () => void }[]).map(({ label, icon: Icon, action }) => (
                <div key={label} onClick={action}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: T.sbText, borderRadius: 9, margin: '0 4px 1px', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.sbHover}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <Icon size={13} style={{ flexShrink: 0, color: T.sbIcon }} /> {label}
                </div>
              ))}

              {/* Theme picker */}
              <div style={{ position: 'relative', margin: '8px 4px 0', borderTop: `1px solid ${T.sbBorder}`, paddingTop: 8 }}>
                <button onClick={() => setTemaOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', width: '100%' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: THEMES[tema].color, border: '2px solid rgba(255,255,255,.4)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: T.sbText }}>Tema: {THEMES[tema].nombre}</span>
                </button>
                {temaOpen && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, background: T.ctHdrBg, borderRadius: 12, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,.22)', display: 'grid', gridTemplateColumns: 'repeat(4, 38px)', gap: 6, zIndex: 50, border: `1px solid ${T.rowBd}` }}>
                    {THEME_ORDER.map(id => (
                      <div key={id} onClick={() => { setTema(id); setTemaOpen(false) }} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: THEMES[id].color, border: tema === id ? '3px solid #002f6c' : `2px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {tema === id && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <span style={{ fontSize: 8, color: T.rowTxt, whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.2 }}>{THEMES[id].nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* CONTENIDO */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: T.ctBg }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: `1px solid ${T.ctHdrBd}`, flexShrink: 0, background: T.ctHdrBg, boxShadow: T.tbShadow }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.accentDk, flexShrink: 0, letterSpacing: '-.01em' }}>
            {BANDEJAS.find(b => b.key === bandejaActiva)?.label ?? 'Documentos'}
          </span>
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
            <input placeholder="Asunto, numero de documento, numero de referencia..."
              value={busqueda} onChange={e => { setBusqueda(e.target.value); setQPage(1); }}
              style={{ width: '100%', padding: '6px 10px 6px 26px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, background: T.rowBg, color: T.rowTxt, outline: 'none' }} />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, background: T.rowBg, color: T.rowTxt, outline: 'none' }}>
            <option value="">Todos los tipos</option>
            {['OFI','MEM','CIR','RES','INF','CON','CER','ACT'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
            {['Todos','No leidos'].map((f, i) => (
              <button key={f} onClick={() => setFiltroLeido(i === 1 ? 'false' : '')}
                style={{ padding: '5px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: `0.5px solid ${T.rowBd}`, background: (i === 1 && filtroLeido === 'false') || (i === 0 && !filtroLeido) ? T.accentDk : 'transparent', color: (i === 1 && filtroLeido === 'false') || (i === 0 && !filtroLeido) ? '#fff' : T.rowSub }}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => { refetch(); refetchConteos() }}
            style={{ width: 30, height: 30, borderRadius: 8, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub }}>
            <RefreshCw size={13} />
          </button>

        </div>

        <div style={{ padding: '5px 14px', background: T.statsBg, borderBottom: `1px solid ${T.ctHdrBd}`, fontSize: 11, color: T.rowSub, flexShrink: 0 }}>
          {!soloQuipux && (
            <>
              SGD: <strong style={{ color: T.rowTxt }}>{data?.count ?? 0}</strong>
              {qBandeja && <span style={{ marginLeft: 8, color: T.rowBd }}>|</span>}
            </>
          )}
          {qBandeja && (
            <span style={{ marginLeft: soloQuipux ? 0 : 8 }}>
              {soloQuipux ? '' : 'Quipux: '}
              <strong style={{ color: T.accentDk }}>{quipuxTotal.toLocaleString()}</strong>
              {quipuxTotal > 0 && (
                <span style={{ marginLeft: 4, fontSize: 10, color: T.rowSub }}>
                  {soloQuipux ? 'documentos' : `(mostrando ${Math.min(qPage * Q_PAGE_SIZE, quipuxTotal).toLocaleString()})`}
                </span>
              )}
            </span>
          )}
          {!soloQuipux && (
            <>
              <span style={{ marginLeft: 8, color: T.rowBd }}>|</span>
              <span style={{ marginLeft: 8 }}>Bandeja: {BANDEJAS.find(b => b.key === bandejaActiva)?.label}</span>
            </>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {/* Cabecera de columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '24px 24px 64px 1fr 120px 140px 120px 100px', gap: 8, padding: '6px 12px', background: T.colBg, borderBottom: `1px solid ${T.colBd}`, position: 'sticky', top: 0, zIndex: 1 }}>
            {['','','De','Asunto','Fecha Doc.','N° Documento','N° Referencia','Estado'].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: T.colTxt, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</span>
            ))}
          </div>

          {isLoading && !soloQuipux ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: T.rowSub }}>Cargando...</div>
          ) : ((soloQuipux ? 0 : items.length) === 0 && quipuxItemsFiltrados.length === 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, color: T.rowSub }}>
              <Inbox size={28} style={{ opacity: .3, marginBottom: 8 }} />
              <p style={{ fontSize: 12 }}>Esta bandeja esta vacia</p>
            </div>
          ) : (
            <>
              {/* Filas SGD — ocultas en modo soloQuipux */}
              {!soloQuipux && items.map(item => {
                const tc  = TIPO_COLORS[item.tipo_prefijo] ?? TIPO_COLORS.OFI
                const est = ESTADO_COLORS[item.estado_documento] ?? ESTADO_COLORS.borrador
                const isOn = selected?.id === item.id
                const esExterno = !!item.remitente_entidad
                return (
                  <div key={`sgd-${item.id}`} onClick={() => handleSelectSGD(item)}
                    className="row-hover-lift"
                    style={{
                      display: 'grid', gridTemplateColumns: '24px 24px 64px 1fr 120px 140px 120px 100px',
                      gap: 8, padding: '8px 12px', borderBottom: `0.5px solid ${T.rowBd}`,
                      cursor: 'pointer', alignItems: 'center',
                      background: isOn ? T.rowSel : !item.leido ? T.rowNr : T.rowBg,
                      borderLeft: `3px solid ${isOn ? T.rowBlSel : !item.leido ? T.rowBlNr : 'transparent'}`,
                    }}
                    onMouseEnter={e => { if (!isOn) (e.currentTarget as HTMLElement).style.background = !item.leido ? T.rowHvNr : T.rowHv }}
                    onMouseLeave={e => { if (!isOn) (e.currentTarget as HTMLElement).style.background = !item.leido ? T.rowNr : T.rowBg }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: !item.leido ? T.rowBlSel : 'transparent' }} />
                    <input type="checkbox" onClick={e => e.stopPropagation()} style={{ width: 13, height: 13, accentColor: T.accentDk, cursor: 'pointer' }} />
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 4, background: tc.bg, color: tc.text, textAlign: 'center' }}>
                      {item.tipo_prefijo}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: item.leido ? 400 : 600, color: T.rowTxt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.asunto}
                        {esExterno && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#c2410c', background: '#fff7ed', padding: '1px 5px', borderRadius: 10 }}>Externo</span>}
                        {item.es_urgente && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#da291c', background: '#fef2f2', padding: '1px 5px', borderRadius: 10 }}>Urgente</span>}
                      </p>
                      <p style={{ fontSize: 10, color: T.rowSub, marginTop: 1 }}>
                        {esExterno ? item.remitente_entidad : (item.unidad_origen_siglas || item.unidad_origen_nombre)}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: T.rowSub }}>{new Date(item.fecha_documento).toLocaleDateString('es-EC')}</span>
                    <span style={{ fontSize: 11, color: T.rowTxt, fontFamily: 'monospace', fontWeight: 500 }}>{item.numero_documento || '—'}</span>
                    <span style={{ fontSize: 11, color: T.rowSub }}>{item.numero_referencia || '—'}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: est.bg, color: est.text, whiteSpace: 'nowrap' }}>{est.label}</span>
                  </div>
                )
              })}

              {/* Separador + filas Quipux */}
              {quipuxItemsFiltrados.length > 0 && (
                <>
                  {!soloQuipux && items.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: T.pnHdr, borderTop: `1px solid ${T.colBd}`, borderBottom: `1px solid ${T.colBd}` }}>
                      <Database size={11} style={{ color: T.pnHNum }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.pnHTxt, textTransform: 'uppercase', letterSpacing: '.07em' }}>
                        Quipux Histórico — {quipuxTotal.toLocaleString()} documentos
                        {quipuxTotal > Q_PAGE_SIZE && ` · pág. ${qPage}`}
                      </span>
                    </div>
                  )}
                  {quipuxItemsFiltrados.map(item => {
                    const isOn = selectedQuipux?.radi_nume_radi === item.radi_nume_radi
                    const enContenido = radisConContenido.has(item.radi_nume_text)
                    const ESTADOS_Q: Record<number, { bg: string; text: string; label: string }> = {
                      0: { bg: '#f3f4f6', text: '#6b7280', label: 'Archivado' },
                      1: { bg: '#fef9c3', text: '#854d0e', label: 'En elaboracion' },
                      2: { bg: '#dbeafe', text: '#1d4ed8', label: 'En tramite' },
                      3: { bg: '#ffedd5', text: '#c2410c', label: 'No enviado' },
                      6: { bg: '#dcfce7', text: '#15803d', label: 'Enviado' },
                      7: { bg: '#fef2f2', text: '#dc2626', label: 'Eliminado' },
                    }
                    const est = ESTADOS_Q[item.esta_codi] ?? { bg: '#f3f4f6', text: '#6b7280', label: item.estado_nombre }
                    return (
                      <div key={`q-${item.radi_nume_radi}`} onClick={() => handleSelectQuipux(item)}
                        className="row-hover-lift"
                        style={{
                          display: 'grid', gridTemplateColumns: '24px 24px 64px 1fr 120px 140px 120px 100px',
                          gap: 8, padding: '8px 12px', borderBottom: `0.5px solid ${T.rowBd}`,
                          cursor: 'pointer', alignItems: 'center',
                          background: isOn ? T.rowSel : T.rowNr,
                          borderLeft: `3px solid ${isOn ? T.rowBlSel : 'transparent'}`,
                        }}
                        onMouseEnter={e => { if (!isOn) (e.currentTarget as HTMLElement).style.background = T.rowHvNr }}
                        onMouseLeave={e => { if (!isOn) (e.currentTarget as HTMLElement).style.background = T.rowNr }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.es_tarea ? '#ffd166' : 'transparent' }} />
                        <div />
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: item.es_tarea ? '#fff7ed' : '#e8f1fd', color: item.es_tarea ? '#92400e' : '#002f6c', textAlign: 'center', letterSpacing: '.03em' }}>
                          {item.es_tarea ? 'T' : 'Q'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 400, color: T.rowTxt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.radi_asunto || '(Sin asunto)'}
                            {enContenido && (
                              <span title="Coincide en contenido del PDF" style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, background: '#fef9c3', color: '#854d0e', padding: '1px 4px', borderRadius: 4, verticalAlign: 'middle' }}>PDF</span>
                            )}
                          </p>
                          <p style={{ fontSize: 10, color: T.rowSub, marginTop: 1 }}>
                            {item.area_nombre || item.creador_nombre}
                            {item.es_tarea && item.tarea_avance != null && (
                              <span style={{ marginLeft: 6, color: '#0f6e56', fontWeight: 600 }}>Avance {item.tarea_avance}%</span>
                            )}
                          </p>
                        </div>
                        <span style={{ fontSize: 11, color: T.rowSub }}>
                          {item.es_tarea && item.fecha_maxima
                            ? new Date(item.fecha_maxima).toLocaleDateString('es-EC')
                            : item.radi_fech_radi ? new Date(item.radi_fech_radi).toLocaleDateString('es-EC') : '—'}
                        </span>
                        <span style={{ fontSize: 11, color: T.rowTxt, fontFamily: 'monospace', fontWeight: 500 }}>{item.radi_nume_text || '—'}</span>
                        <span style={{ fontSize: 11, color: T.rowSub }}>{item.radi_cuentai || '—'}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: est.bg, color: est.text, whiteSpace: 'nowrap' }}>{est.label}</span>
                      </div>
                    )
                  })}
                  {/* Paginación Quipux */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 12px', borderTop: `0.5px solid ${T.rowBd}` }}>
                    {qPage > 1 && (
                      <button onClick={() => setQPage(p => p - 1)} disabled={qFetching}
                        style={{ padding: '5px 12px', borderRadius: 8, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, fontSize: 11, cursor: 'pointer', color: T.rowTxt }}>
                        ← Anterior
                      </button>
                    )}
                    <span style={{ fontSize: 10, color: T.rowSub }}>
                      {Math.min((qPage - 1) * Q_PAGE_SIZE + 1, quipuxTotal).toLocaleString()}–{Math.min(qPage * Q_PAGE_SIZE, quipuxTotal).toLocaleString()} de {quipuxTotal.toLocaleString()}
                    </span>
                    {quipuxHayMas && (
                      <button onClick={() => setQPage(p => p + 1)} disabled={qFetching}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '0.5px solid #002f6c', background: qFetching ? '#e8f1fd' : '#002f6c', fontSize: 11, cursor: qFetching ? 'default' : 'pointer', color: qFetching ? '#002f6c' : '#fff', fontWeight: 600 }}>
                        {qFetching ? 'Cargando…' : 'Siguiente →'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Panel detalle SGD */}
        {selected && !selectedQuipux && (
          <PanelDetalle
            item={selected}
            onClose={() => setSelectedId(null)}
            trigger={panelTrigger}
            onEditar={selected.bandeja === 'en_elaboracion' ? async () => {
              const detalle = await documentosService.obtener(selected!.documento_id)
              setDocEditar(detalle)
            } : undefined}
          />
        )}

        {/* Panel detalle Quipux */}
        {selectedQuipux && (
          <PanelDetalleQuipux
            item={selectedQuipux}
            bandeja={bandejaActiva}
            onClose={() => setSelQuipux(null)}
            onResponderCreado={() => {
              setSelQuipux(null)
              cambiarBandeja('en_elaboracion')
            }}
          />
        )}
      </div>
    </div>
  )
}
