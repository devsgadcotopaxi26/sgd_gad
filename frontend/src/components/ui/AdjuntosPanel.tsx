import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adjuntosService, Adjunto } from '@/services/adjuntos.service'
import {
  Paperclip, Upload, Download, Trash2,
  FileText, Image, File, X, AlertCircle
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

interface AdjuntosPanelProps {
  documentoId?: number
  tramiteId?: number
  correoId?: number
  soloLectura?: boolean
}

export default function AdjuntosPanel({
  documentoId, tramiteId, correoId, soloLectura = false
}: AdjuntosPanelProps) {
  const qc       = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]       = useState('')

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
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('archivo', file)
      fd.append('tipo', 'anexo')
      if (documentoId) fd.append('documento', String(documentoId))
      if (tramiteId)   fd.append('tramite',   String(tramiteId))
      if (correoId)    fd.append('correo',     String(correoId))
      return adjuntosService.subir(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      setError('')
    },
    onError: () => setError('Error al subir el archivo. Verifica el tamaño máximo (50MB).'),
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => adjuntosService.eliminar(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey }),
  })

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(f => {
      if (f.size > 52428800) { setError(`${f.name} supera el límite de 50MB`); return }
      subir.mutate(f)
    })
  }

  const adjuntos = data?.results ?? []

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
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 9,
                border: '0.5px solid #f0f0f0', background: '#fff',
              }}>
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
            )
          })}
        </div>
      )}
    </div>
  )
}