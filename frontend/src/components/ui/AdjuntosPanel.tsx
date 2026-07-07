import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adjuntosService, Adjunto } from '@/services/adjuntos.service'
import {
  Paperclip, Upload, Download, Trash2,
  FileText, Image, File, X, AlertCircle,
  ScanLine, CheckCircle2, XCircle, ShieldCheck
} from 'lucide-react'

const MIME_ICONS: Record<string, any> = {
  'application/pdf':  FileText,
  'image/jpeg':       Image,
  'image/png':        Image,
  'image/gif':        Image,
  'image/webp':       Image,
}

function getIcon(mime: string) {
  return MIME_ICONS[mime] ?? File
}

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(1)} GB`
}

function getMimeColor(mime: string): { bg: string; text: string } {
  if (mime === 'application/pdf')          return { bg: '#fef2f2', text: '#dc2626' }
  if (mime.startsWith('image/'))           return { bg: '#f0fdf4', text: '#15803d' }
  if (mime.includes('word'))               return { bg: '#eff6ff', text: '#1d4ed8' }
  if (mime.includes('excel') || mime.includes('sheet')) return { bg: '#f0fdf4', text: '#15803d' }
  return { bg: '#f9fafb', text: '#6b7280' }
}

const ORIGEN_LABELS: Record<string, string> = {
  institucional:  'Digitalización institucional',
  quipux:         'Recibido vía Quipux',
  nativo_digital: 'Nativo digital',
}

interface AdjuntosPanelProps {
  documentoId?: number
  tramiteId?: number
  correoId?: number
  soloLectura?: boolean
}

interface PendingFile {
  file: File
  origen_digitalizacion: '' | 'institucional' | 'quipux' | 'nativo_digital'
  resolucion_ppp: string
  formato_archivo: string
  numero_folios: string
  hoja_testigo: boolean
  ubicacion_fisica: string
}

function ModalMetadatos({
  pending, onChange, onCancel, onConfirm, subiendo,
}: {
  pending: PendingFile
  onChange: (p: PendingFile) => void
  onCancel: () => void
  onConfirm: () => void
  subiendo: boolean
}) {
  const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"
  const requiereDetalle = pending.origen_digitalizacion === 'institucional' || pending.origen_digitalizacion === 'quipux'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ScanLine size={15} style={{ color: '#002f6c' }} />
            <h3 className="font-bold text-gray-900 text-sm">Datos de digitalización</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500 truncate">{pending.file.name}</p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Origen *</label>
            <select className={cls}
              value={pending.origen_digitalizacion}
              onChange={e => onChange({ ...pending, origen_digitalizacion: e.target.value as PendingFile['origen_digitalizacion'] })}>
              <option value="">— Selecciona —</option>
              <option value="institucional">Digitalización institucional (escáner propio)</option>
              <option value="quipux">Recibido vía Quipux</option>
              <option value="nativo_digital">Nativo digital (no requiere digitalización)</option>
            </select>
          </div>

          {requiereDetalle && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Resolución (ppp) *</label>
                  <input className={cls} type="number" placeholder={pending.origen_digitalizacion === 'institucional' ? '300' : '90'}
                    value={pending.resolucion_ppp}
                    onChange={e => onChange({ ...pending, resolucion_ppp: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Formato</label>
                  <input className={cls} placeholder="PDF/A"
                    value={pending.formato_archivo}
                    onChange={e => onChange({ ...pending, formato_archivo: e.target.value })} />
                </div>
              </div>
              {pending.origen_digitalizacion === 'institucional' && pending.resolucion_ppp && Number(pending.resolucion_ppp) < 300 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  La norma exige mínimo 300 ppp para digitalización institucional. Este valor no cumple el estándar.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">N° de folios</label>
                  <input className={cls} type="number"
                    value={pending.numero_folios}
                    onChange={e => onChange({ ...pending, numero_folios: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="hoja_testigo"
                    checked={pending.hoja_testigo}
                    onChange={e => onChange({ ...pending, hoja_testigo: e.target.checked })} />
                  <label htmlFor="hoja_testigo" className="text-xs text-gray-600">Original con hoja testigo</label>
                </div>
              </div>
              {pending.hoja_testigo && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ubicación física del original</label>
                  <input className={cls} placeholder="Caja 12, Estante B"
                    value={pending.ubicacion_fisica}
                    onChange={e => onChange({ ...pending, ubicacion_fisica: e.target.value })} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={!pending.origen_digitalizacion || subiendo}
            className="px-4 py-2 text-sm font-bold text-white rounded-xl"
            style={{ background: !pending.origen_digitalizacion || subiendo ? '#94a3b8' : '#002f6c' }}>
            {subiendo ? 'Subiendo...' : 'Subir archivo'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdjuntosPanel({
  documentoId, tramiteId, correoId, soloLectura = false
}: AdjuntosPanelProps) {
  const qc       = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]       = useState('')
  const [cola, setCola]         = useState<File[]>([])
  const [pending, setPending]   = useState<PendingFile | null>(null)

  const queryKey = ['adjuntos', documentoId, tramiteId, correoId]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => adjuntosService.listar({
      documento: documentoId,
      tramite:   tramiteId,
      correo:    correoId,
    }),
    enabled: !!(documentoId || tramiteId || correoId),
  })

  const subir = useMutation({
    mutationFn: (p: PendingFile) => {
      const fd = new FormData()
      fd.append('archivo', p.file)
      fd.append('tipo', 'anexo')
      if (documentoId) fd.append('documento', String(documentoId))
      if (tramiteId)   fd.append('tramite',   String(tramiteId))
      if (correoId)    fd.append('correo',     String(correoId))
      fd.append('origen_digitalizacion', p.origen_digitalizacion)
      if (p.resolucion_ppp)   fd.append('resolucion_ppp', p.resolucion_ppp)
      if (p.formato_archivo)  fd.append('formato_archivo', p.formato_archivo)
      if (p.numero_folios)    fd.append('numero_folios', p.numero_folios)
      fd.append('hoja_testigo', String(p.hoja_testigo))
      if (p.ubicacion_fisica) fd.append('ubicacion_fisica', p.ubicacion_fisica)
      return adjuntosService.subir(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      setError('')
      setPending(null)
      avanzarCola()
    },
    onError: () => setError('Error al subir el archivo. Verifica el tamaño máximo (50MB).'),
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => adjuntosService.eliminar(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey }),
  })

  const calidad = useMutation({
    mutationFn: ({ id, resultado }: { id: number; resultado: 'aprobado' | 'rechazado' }) =>
      adjuntosService.controlCalidad(id, resultado),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })

  const avanzarCola = () => {
    setCola(prev => {
      const resto = prev.slice(1)
      if (resto.length > 0) abrirModalPara(resto[0])
      return resto
    })
  }

  const abrirModalPara = (file: File) => {
    setPending({
      file, origen_digitalizacion: '', resolucion_ppp: '', formato_archivo: '',
      numero_folios: '', hoja_testigo: false, ubicacion_fisica: '',
    })
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const validos: File[] = []
    Array.from(files).forEach(f => {
      if (f.size > 52428800) { setError(`${f.name} supera el límite de 50MB`); return }
      validos.push(f)
    })
    if (validos.length === 0) return
    setCola(validos)
    abrirModalPara(validos[0])
  }

  const adjuntos = (data?.results ?? []).filter(a => a.tipo !== 'documento')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Paperclip size={14} style={{ color: '#002f6c' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          Adjuntos {adjuntos.length > 0 && `(${adjuntos.length})`}
        </span>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '7px 10px', marginBottom: 8, fontSize: 11, color: '#dc2626' }}>
          <AlertCircle size={13} />
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Zona de drop */}
      {!soloLectura && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragOver ? '#002f6c' : '#d1d5db'}`,
            borderRadius: 10, padding: '12px',
            textAlign: 'center', cursor: 'pointer',
            background: dragOver ? '#e8f1fd' : '#fafbfc',
            marginBottom: 10, transition: 'all .15s',
          }}
        >
          <Upload size={18} style={{ color: dragOver ? '#002f6c' : '#9ca3af', margin: '0 auto 6px' }} />
          <p style={{ fontSize: 11, color: dragOver ? '#002f6c' : '#9ca3af', margin: 0, fontWeight: 500 }}>
            {subir.isPending ? 'Subiendo...' : 'Arrastra archivos o haz clic para seleccionar'}
          </p>
          <p style={{ fontSize: 10, color: '#c4c9d4', margin: '3px 0 0' }}>
            PDF, Word, Excel, imágenes — máx. 50MB
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Lista adjuntos */}
      {isLoading ? (
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: 12 }}>Cargando...</div>
      ) : adjuntos.length === 0 ? (
        <div style={{ fontSize: 11, color: '#c4c9d4', textAlign: 'center', padding: 8 }}>
          Sin adjuntos
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {adjuntos.map((adj: Adjunto) => {
            const Icon  = getIcon(adj.mime_type)
            const color = getMimeColor(adj.mime_type)
            return (
              <div key={adj.id} style={{
                display: 'flex', flexDirection: 'column', gap: 6,
                padding: '8px 10px', borderRadius: 9,
                border: '0.5px solid #f0f0f0', background: '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                    background: color.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} style={{ color: color.text }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                      {adj.nombre}
                    </p>
                    <p style={{ fontSize: 9, color: '#9ca3af', margin: '2px 0 0' }}>
                      {formatSize(adj.tamanio)} · {adj.subido_por_nombre} · {new Date(adj.creado_en).toLocaleDateString('es-EC')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => adjuntosService.descargar(adj.id, adj.nombre)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}
                      title="Descargar">
                      <Download size={13} />
                    </button>
                    {!soloLectura && (
                      <button
                        onClick={() => eliminar.mutate(adj.id)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '0.5px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                        title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {adj.origen_digitalizacion && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingLeft: 40 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280' }}>
                      {ORIGEN_LABELS[adj.origen_digitalizacion]}{adj.resolucion_ppp ? ` · ${adj.resolucion_ppp}ppp` : ''}
                    </span>
                    {adj.origen_digitalizacion === 'institucional' && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 8,
                        background: adj.cumple_norma_institucional ? '#f0fdf4' : '#fef2f2',
                        color: adj.cumple_norma_institucional ? '#15803d' : '#dc2626',
                      }}>
                        <ShieldCheck size={10} />
                        {adj.cumple_norma_institucional ? 'Cumple norma' : 'No cumple 300ppp'}
                      </span>
                    )}
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 8,
                      background: adj.calidad_control === 'aprobado' ? '#f0fdf4' : adj.calidad_control === 'rechazado' ? '#fef2f2' : '#fff7ed',
                      color: adj.calidad_control === 'aprobado' ? '#15803d' : adj.calidad_control === 'rechazado' ? '#dc2626' : '#c2410c',
                    }}>
                      {adj.calidad_control === 'aprobado' ? 'Calidad: aprobado' : adj.calidad_control === 'rechazado' ? 'Calidad: rechazado' : 'Calidad: pendiente'}
                    </span>
                  </div>
                )}

                {!soloLectura && adj.origen_digitalizacion && adj.calidad_control === 'pendiente' && (
                  <div style={{ display: 'flex', gap: 6, paddingLeft: 40 }}>
                    <button
                      onClick={() => calidad.mutate({ id: adj.id, resultado: 'aprobado' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#15803d', background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}>
                      <CheckCircle2 size={11} /> Aprobar calidad
                    </button>
                    <button
                      onClick={() => calidad.mutate({ id: adj.id, resultado: 'rechazado' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}>
                      <XCircle size={11} /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {pending && (
        <ModalMetadatos
          pending={pending}
          onChange={setPending}
          onCancel={() => { setPending(null); setCola([]) }}
          onConfirm={() => subir.mutate(pending)}
          subiendo={subir.isPending}
        />
      )}
    </div>
  )
}