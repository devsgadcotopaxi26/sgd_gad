import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { quipuxService, QuipuxDocumento, QuipuxDetalle } from '@/services/quipux.service'
import {
  Search, FileText, Download, Eye, Clock, Archive,
  X, ChevronLeft, ChevronRight, Database, AlertCircle,
} from 'lucide-react'

const ESTADOS_QUIPUX: Record<number, { label: string; bg: string; text: string }> = {
  0: { label: 'Archivado',       bg: '#f3f4f6', text: '#6b7280' },
  1: { label: 'En elaboracion',  bg: '#fef9c3', text: '#854d0e' },
  2: { label: 'En tramite',      bg: '#dbeafe', text: '#1d4ed8' },
  3: { label: 'No enviado',      bg: '#ffedd5', text: '#c2410c' },
  6: { label: 'Enviado',         bg: '#dcfce7', text: '#15803d' },
  7: { label: 'Eliminado',       bg: '#fef2f2', text: '#dc2626' },
}

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: '0', label: 'Archivado' },
  { value: '1', label: 'En elaboracion' },
  { value: '2', label: 'En tramite' },
  { value: '3', label: 'No enviado' },
  { value: '6', label: 'Enviado' },
  { value: '7', label: 'Eliminado' },
]

function EstadoBadge({ codigo }: { codigo: number }) {
  const est = ESTADOS_QUIPUX[codigo] ?? { label: `Estado ${codigo}`, bg: '#f3f4f6', text: '#6b7280' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
      background: est.bg, color: est.text, whiteSpace: 'nowrap',
    }}>
      {est.label}
    </span>
  )
}

function PanelDetalleQuipux({ radiId, onClose }: { radiId: string; onClose: () => void }) {
  const { data: doc, isLoading, isError, error } = useQuery({
    queryKey: ['quipux-detalle', radiId],
    queryFn: () => quipuxService.detalle(radiId),
  })

  const is503 = isError && (error as any)?.response?.status === 503

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 420,
      background: '#fff', borderLeft: '0.5px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Database size={13} style={{ color: '#002f6c', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#002f6c' }}>
            Quipux Historico
          </span>
          <button onClick={onClose}
            style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>
          Cargando detalle...
        </div>
      ) : is503 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <AlertCircle size={32} style={{ color: '#da291c', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Base de datos no disponible</p>
            <p style={{ fontSize: 11, color: '#9ca3af' }}>La base de datos Quipux no esta accesible en este momento. Intente nuevamente mas tarde.</p>
          </div>
        </div>
      ) : isError ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <AlertCircle size={32} style={{ color: '#da291c', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Error al cargar</p>
            <p style={{ fontSize: 11, color: '#9ca3af' }}>No se pudo obtener el detalle del documento.</p>
          </div>
        </div>
      ) : doc ? (
        <>
          {/* Documento info */}
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#002f6c' }}>
                {doc.radi_nume_text || doc.radi_nume_radi}
              </span>
              <EstadoBadge codigo={doc.esta_codi} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', lineHeight: 1.3, marginBottom: 0 }}>
              {doc.radi_asunto}
            </p>
          </div>

          {/* Metadata */}
          <div style={{ padding: '10px 14px', background: '#fafbfc', borderBottom: '0.5px solid #f5f6f8' }}>
            {[
              ...(doc.creador ? [{ label: 'Creador:', value: doc.creador.nombre }] : []),
              ...(doc.creador ? [{ label: 'Area:', value: doc.creador.area }] : []),
              ...(doc.creador?.cargo ? [{ label: 'Cargo:', value: doc.creador.cargo }] : []),
              { label: 'Fecha radicado:', value: new Date(doc.radi_fech_radi).toLocaleString('es-EC') },
              ...(doc.radi_fech_ofic ? [{ label: 'Fecha oficio:', value: new Date(doc.radi_fech_ofic).toLocaleString('es-EC') }] : []),
              ...(doc.radi_cuentai ? [{ label: 'Referencia:', value: doc.radi_cuentai }] : []),
              ...(doc.radi_fech_firma ? [{ label: 'Fecha firma:', value: new Date(doc.radi_fech_firma).toLocaleString('es-EC') }] : []),
              ...(doc.radi_nomb_usua_firma ? [{ label: 'Firmado por:', value: doc.radi_nomb_usua_firma }] : []),
              ...(doc.usuario_actual ? [{ label: 'Usuario actual:', value: `${doc.usuario_actual.nombre} - ${doc.usuario_actual.area}` }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: '#9ca3af', minWidth: 96, flexShrink: 0 }}>{label}</span>
                <span style={{ fontWeight: 500, color: '#374151' }}>{value}</span>
              </div>
            ))}
            {doc.radi_resumen && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '0.5px solid #e5e7eb' }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Resumen</p>
                <p style={{ fontSize: 11, color: '#374151', lineHeight: 1.5, margin: 0 }}>{doc.radi_resumen}</p>
              </div>
            )}
          </div>

          {/* PDF Actions */}
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8', display: 'flex', gap: 6 }}>
            {doc.tiene_pdf && (
              <>
                <button
                  onClick={() => {
                    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/quipux/documentos/${doc.radi_nume_radi}/pdf/`
                    window.open(url, '_blank')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 12px', borderRadius: 9,
                    border: '0.5px solid #002f6c', background: '#fff',
                    color: '#002f6c', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                  <Eye size={13} /> Ver PDF
                </button>
                <button
                  onClick={() => quipuxService.descargarPDF(doc.radi_nume_radi, doc.radi_nume_text || doc.radi_nume_radi, false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 12px', borderRadius: 9,
                    border: '0.5px solid #e5e7eb', background: '#fff',
                    color: '#374151', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  }}>
                  <Download size={13} /> Descargar
                </button>
              </>
            )}
            {doc.tiene_pdf_firmado && (
              <button
                onClick={() => quipuxService.descargarPDF(doc.radi_nume_radi, doc.radi_nume_text || doc.radi_nume_radi, true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 9,
                  border: 'none', background: '#0f6e56',
                  color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                <Download size={13} /> PDF Firmado
              </button>
            )}
            {!doc.tiene_pdf && !doc.tiene_pdf_firmado && (
              <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', padding: '4px 0' }}>
                Este documento no tiene archivos PDF asociados.
              </p>
            )}
          </div>

          {/* Recorrido / Timeline */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Clock size={13} style={{ color: '#002f6c' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0a1628' }}>Recorrido del documento</span>
            </div>

            {doc.recorrido && doc.recorrido.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {doc.recorrido.map((paso, i) => (
                  <div key={paso.hist_codi} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #f5f6f8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0f6e56', marginTop: 4 }} />
                      {i < doc.recorrido.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: '#e5e7eb', marginTop: 4 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', margin: 0 }}>
                        {paso.transaccion}
                      </p>
                      <p style={{ fontSize: 10, color: '#6b7280', margin: '2px 0 0' }}>
                        {paso.usuario_origen}
                        {paso.usuario_destino ? ` → ${paso.usuario_destino}` : ''}
                      </p>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>
                        {new Date(paso.hist_fech).toLocaleString('es-EC')}
                      </p>
                      {paso.hist_obse && (
                        <p style={{ fontSize: 10, color: '#6b7280', margin: '4px 0 0', fontStyle: 'italic', lineHeight: 1.4 }}>
                          &ldquo;{paso.hist_obse}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#c4c9d4', textAlign: 'center', padding: 16 }}>
                Sin registros de recorrido
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function QuipuxHistoricoPage() {
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchTrigger, setSearchTrigger] = useState(0)

  const pageSize = 20

  const params: Record<string, string> = {
    page: String(page),
    page_size: String(pageSize),
  }
  if (busqueda) params.search = busqueda
  if (estado)   params.estado = estado
  if (desde)    params.desde = desde
  if (hasta)    params.hasta = hasta

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['quipux-documentos', params, searchTrigger],
    queryFn: () => quipuxService.buscar(params),
  })

  const { data: stats } = useQuery({
    queryKey: ['quipux-estadisticas'],
    queryFn: () => quipuxService.estadisticas(),
    staleTime: 5 * 60 * 1000,
  })

  const is503 = isError && (error as any)?.response?.status === 503
  const items = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / pageSize)
  const showFrom = total > 0 ? (page - 1) * pageSize + 1 : 0
  const showTo = Math.min(page * pageSize, total)

  const handleSearch = () => {
    setPage(1)
    setSearchTrigger(t => t + 1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div style={{
      height: 'calc(100vh - 96px)', borderRadius: 14,
      overflow: 'hidden', border: '0.5px solid #e5e7eb',
      background: '#fff', position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header con stats */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '0.5px solid #f5f6f8',
        background: 'linear-gradient(135deg, #002f6c 0%, #003d8f 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Database size={18} style={{ color: '#fff' }} />
              <h1 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>Quipux Historico</h1>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              Consulta de documentos del sistema Quipux anterior
            </p>
          </div>
          {stats && (
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>
                  {stats.total_documentos.toLocaleString('es-EC')}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>documentos</p>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                  {stats.fecha_primer_documento
                    ? new Date(stats.fecha_primer_documento).toLocaleDateString('es-EC', { month: 'short', year: 'numeric' })
                    : '---'}
                  {' - '}
                  {stats.fecha_ultimo_documento
                    ? new Date(stats.fecha_ultimo_documento).toLocaleDateString('es-EC', { month: 'short', year: 'numeric' })
                    : '---'}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>rango de fechas</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '0.5px solid #f5f6f8',
        background: '#fafbfc',
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
          <input
            placeholder="Buscar por asunto, numero, remitente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%', padding: '7px 10px 7px 28px',
              border: '0.5px solid #e5e7eb', borderRadius: 8,
              fontSize: 12, outline: 'none', color: '#374151', background: '#fff',
            }}
          />
        </div>
        <select
          value={estado}
          onChange={e => { setEstado(e.target.value); setPage(1) }}
          style={{
            padding: '7px 10px', fontSize: 11,
            border: '0.5px solid #e5e7eb', borderRadius: 8,
            background: '#fff', color: '#374151', outline: 'none',
            minWidth: 150,
          }}>
          {ESTADO_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>Desde:</label>
          <input
            type="date"
            value={desde}
            onChange={e => { setDesde(e.target.value); setPage(1) }}
            style={{
              padding: '6px 8px', fontSize: 11,
              border: '0.5px solid #e5e7eb', borderRadius: 8,
              background: '#fff', color: '#374151', outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>Hasta:</label>
          <input
            type="date"
            value={hasta}
            onChange={e => { setHasta(e.target.value); setPage(1) }}
            style={{
              padding: '6px 8px', fontSize: 11,
              border: '0.5px solid #e5e7eb', borderRadius: 8,
              background: '#fff', color: '#374151', outline: 'none',
            }}
          />
        </div>
        <button
          onClick={handleSearch}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 16px', borderRadius: 9,
            border: 'none', background: '#002f6c',
            color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
          <Search size={13} /> Buscar
        </button>
      </div>

      {/* Results count */}
      <div style={{
        padding: '5px 20px', background: '#fafbfc',
        borderBottom: '0.5px solid #f5f6f8',
        fontSize: 11, color: '#9ca3af', flexShrink: 0,
      }}>
        No. de registros encontrados: <strong style={{ color: '#374151' }}>{total.toLocaleString('es-EC')}</strong>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {is503 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{
              textAlign: 'center', padding: '32px 40px', borderRadius: 14,
              border: '0.5px solid #fecaca', background: '#fff5f5', maxWidth: 420,
            }}>
              <AlertCircle size={40} style={{ color: '#da291c', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                Base de datos Quipux no disponible
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 0 }}>
                No se puede conectar con la base de datos del sistema Quipux anterior.
                Verifique que el servidor de base de datos esta activo y la configuracion
                de conexion es correcta.
              </p>
            </div>
          </div>
        ) : isError ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{ textAlign: 'center' }}>
              <AlertCircle size={36} style={{ color: '#da291c', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Error al buscar documentos</p>
              <p style={{ fontSize: 11, color: '#9ca3af' }}>Ocurrio un error inesperado. Intente nuevamente.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 110px 140px 120px 100px 70px',
                gap: 8, padding: '6px 16px',
                background: '#f9fafb', borderBottom: '0.5px solid #f5f6f8',
                position: 'sticky', top: 0, zIndex: 1,
              }}>
                {['N° Documento', 'Asunto', 'Estado', 'Area', 'Creador', 'Fecha', 'PDF'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
                ))}
              </div>

              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: '#9ca3af' }}>
                  Cargando documentos...
                </div>
              ) : items.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, color: '#9ca3af' }}>
                  <Archive size={28} style={{ opacity: .3, marginBottom: 8 }} />
                  <p style={{ fontSize: 12 }}>No se encontraron documentos</p>
                  <p style={{ fontSize: 11, color: '#c4c9d4' }}>Intente con otros criterios de busqueda</p>
                </div>
              ) : items.map((item: QuipuxDocumento) => {
                const isOn = selectedId === item.radi_nume_radi
                return (
                  <div
                    key={item.radi_nume_radi}
                    onClick={() => setSelectedId(isOn ? null : item.radi_nume_radi)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 110px 140px 120px 100px 70px',
                      gap: 8, padding: '9px 16px',
                      borderBottom: '0.5px solid #f9fafb',
                      cursor: 'pointer', alignItems: 'center',
                      background: isOn ? '#e8f1fd' : 'transparent',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { if (!isOn) (e.currentTarget as HTMLDivElement).style.background = '#f8faff' }}
                    onMouseLeave={e => { if (!isOn) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#002f6c', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.radi_nume_text || item.radi_nume_radi}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#0a1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                        {item.radi_asunto}
                      </p>
                    </div>
                    <EstadoBadge codigo={item.esta_codi} />
                    <span style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.area_nombre || '---'}
                    </span>
                    <span style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.creador_nombre || '---'}
                    </span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {new Date(item.radi_fech_radi).toLocaleDateString('es-EC')}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {item.tiene_pdf && (
                        <button
                          onClick={e => { e.stopPropagation(); quipuxService.descargarPDF(item.radi_nume_radi, item.radi_nume_text || item.radi_nume_radi) }}
                          title="Descargar PDF"
                          style={{
                            width: 26, height: 26, borderRadius: 6,
                            border: '0.5px solid #e5e7eb', background: '#fff',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#002f6c',
                          }}>
                          <FileText size={13} />
                        </button>
                      )}
                      {item.tiene_pdf_firmado && (
                        <button
                          onClick={e => { e.stopPropagation(); quipuxService.descargarPDF(item.radi_nume_radi, item.radi_nume_text || item.radi_nume_radi, true) }}
                          title="Descargar PDF firmado"
                          style={{
                            width: 26, height: 26, borderRadius: 6,
                            border: '0.5px solid #dcfce7', background: '#f0fdf4',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#0f6e56',
                          }}>
                          <Download size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div style={{
                padding: '8px 20px',
                borderTop: '0.5px solid #f5f6f8',
                background: '#fafbfc',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  Mostrando {showFrom}-{showTo} de {total.toLocaleString('es-EC')} documentos
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 8,
                      border: '0.5px solid #e5e7eb',
                      background: page <= 1 ? '#f9fafb' : '#fff',
                      color: page <= 1 ? '#d1d5db' : '#374151',
                      fontSize: 11, fontWeight: 500,
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    }}>
                    <ChevronLeft size={13} /> Anterior
                  </button>
                  <span style={{ fontSize: 11, color: '#6b7280', padding: '0 8px' }}>
                    Pagina {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 8,
                      border: '0.5px solid #e5e7eb',
                      background: page >= totalPages ? '#f9fafb' : '#fff',
                      color: page >= totalPages ? '#d1d5db' : '#374151',
                      fontSize: 11, fontWeight: 500,
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    }}>
                    Siguiente <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Detail panel */}
        {selectedId && (
          <PanelDetalleQuipux radiId={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  )
}
