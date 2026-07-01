import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { quipuxService, QuipuxDocumento, QuipuxAnexo } from '@/services/quipux.service'
import {
  Search, FileText, Download,
  X, ChevronLeft, ChevronRight, Database, AlertCircle,
  Paperclip, Inbox, Send, Copy, LayoutList, FileSpreadsheet,
  FileImage, File,
} from 'lucide-react'
import { usePermisosStore } from '@/store/permisosStore'

const ESTADOS_QUIPUX: Record<number, { label: string; bg: string; text: string }> = {
  0: { label: 'Archivado',      bg: '#f3f4f6', text: '#6b7280' },
  1: { label: 'En elaboracion', bg: '#fef9c3', text: '#854d0e' },
  2: { label: 'En tramite',     bg: '#dbeafe', text: '#1d4ed8' },
  3: { label: 'No enviado',     bg: '#ffedd5', text: '#c2410c' },
  6: { label: 'Enviado',        bg: '#dcfce7', text: '#15803d' },
  7: { label: 'Eliminado',      bg: '#fef2f2', text: '#dc2626' },
}

function EstadoBadge({ codigo }: { codigo: number }) {
  const est = ESTADOS_QUIPUX[codigo] ?? { label: `Estado ${codigo}`, bg: '#f3f4f6', text: '#6b7280' }
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: est.bg, color: est.text, whiteSpace: 'nowrap' }}>
      {est.label}
    </span>
  )
}

function iconoAnexo(ext: string) {
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return <FileSpreadsheet size={13} style={{ color: '#15803d' }} />
  if (['jpg', 'jpeg', 'png', 'gif', 'tif'].includes(ext)) return <FileImage size={13} style={{ color: '#7c3aed' }} />
  if (ext === 'pdf') return <FileText size={13} style={{ color: '#dc2626' }} />
  return <File size={13} style={{ color: '#6b7280' }} />
}

function PanelAnexos({ radiId }: { radiId: string }) {
  const { data: anexos, isLoading } = useQuery({
    queryKey: ['quipux-anexos', radiId],
    queryFn: () => quipuxService.anexos(radiId),
  })

  if (isLoading) return <div style={{ padding: 12, fontSize: 11, color: '#9ca3af' }}>Cargando anexos…</div>
  if (!anexos || anexos.length === 0) return <div style={{ padding: 12, fontSize: 11, color: '#9ca3af' }}>Sin anexos adjuntos.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {anexos.map((a: QuipuxAnexo) => (
        <div key={a.anex_codigo} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          background: '#f9fafb', borderRadius: 8, border: '0.5px solid #e5e7eb',
        }}>
          {iconoAnexo(a.anex_tipo_ext)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.anex_nombre || `anexo.${a.anex_tipo_ext}`}
            </p>
            <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
              {a.anex_tipo_ext.toUpperCase()} · {a.anex_tamano ? `${Math.round(Number(a.anex_tamano))} KB` : ''}
            </p>
          </div>
          {a.tiene_archivo ? (
            <button
              onClick={() => quipuxService.descargarAnexo(a.anex_codigo, a.anex_nombre || `anexo.${a.anex_tipo_ext}`)}
              style={{ padding: '4px 8px', background: '#002f6c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Download size={10} /> Descargar
            </button>
          ) : (
            <span style={{ fontSize: 10, color: '#9ca3af' }}>Sin archivo</span>
          )}
        </div>
      ))}
    </div>
  )
}

function PanelDetalle({ item, onClose }: { item: QuipuxDocumento; onClose: () => void }) {
  const [tabActiva, setTabActiva] = useState<'info' | 'recorrido' | 'anexos'>('info')
  const { data: doc, isLoading, isError, error } = useQuery({
    queryKey: ['quipux-detalle', item.radi_nume_radi],
    queryFn: () => quipuxService.detalle(item.radi_nume_radi),
  })
  const is503 = isError && (error as any)?.response?.status === 503

  const labelRow = (l: string, v: string | null | undefined) =>
    v ? (
      <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: '#9ca3af', width: 90, flexShrink: 0 }}>{l}</span>
        <span style={{ fontSize: 11, color: '#111827', fontWeight: 500 }}>{v}</span>
      </div>
    ) : null

  const tabs = [
    { id: 'info', label: 'Información' },
    { id: 'recorrido', label: 'Recorrido' },
    { id: 'anexos', label: 'Anexos' },
  ] as const

  return (
    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 440, background: '#fff', borderLeft: '0.5px solid #e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Database size={12} style={{ color: '#002f6c' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#002f6c', fontFamily: 'monospace' }}>QUIPUX HISTÓRICO</span>
          </div>
          <p style={{ fontWeight: 700, fontSize: 12, color: '#111827', margin: 0 }}>{item.radi_asunto || '(Sin asunto)'}</p>
          <p style={{ fontSize: 10, color: '#6b7280', margin: 0, marginTop: 2 }}>{item.radi_nume_text || item.radi_nume_radi}</p>
        </div>
        <button onClick={onClose} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', flexShrink: 0 }}>
          <X size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid #f0f0f0', padding: '0 14px', gap: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTabActiva(t.id)}
            style={{ fontSize: 11, padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tabActiva === t.id ? '2px solid #002f6c' : '2px solid transparent', color: tabActiva === t.id ? '#002f6c' : '#6b7280', fontWeight: tabActiva === t.id ? 700 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        {isLoading && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, paddingTop: 40 }}>Cargando…</div>}
        {is503 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 40, textAlign: 'center' }}>
            <AlertCircle size={24} style={{ color: '#dc2626' }} />
            <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Base Quipux no disponible</p>
          </div>
        )}

        {doc && tabActiva === 'info' && (
          <div>
            {labelRow('N° Radicado', doc.radi_nume_text)}
            {labelRow('Fecha', doc.radi_fech_radi ? new Date(doc.radi_fech_radi).toLocaleString('es-EC') : '')}
            {labelRow('Estado', doc.estado)}
            {labelRow('Asunto', doc.radi_asunto)}
            {labelRow('Resumen', doc.radi_resumen)}
            {doc.creador && (
              <>
                <div style={{ marginTop: 10, marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: 1 }}>Remitente</div>
                {labelRow('Nombre', doc.creador.nombre)}
                {labelRow('Cargo', doc.creador.cargo)}
                {labelRow('Área', doc.creador.area)}
              </>
            )}
            {doc.radi_nomb_usua_firma && (
              <>
                <div style={{ marginTop: 10, marginBottom: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: 1 }}>Firma</div>
                {labelRow('Firmado por', doc.radi_nomb_usua_firma)}
                {labelRow('Fecha firma', doc.radi_fech_firma ? new Date(doc.radi_fech_firma).toLocaleDateString('es-EC') : '')}
              </>
            )}

            {/* Acciones PDF */}
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {doc.tiene_pdf && (
                <>
                  <button onClick={() => {
                    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/quipux/documentos/${doc.radi_nume_radi}/pdf/`
                    window.open(url + (localStorage.getItem('access_token') ? '' : ''), '_blank')
                    quipuxService.descargarPDF(doc.radi_nume_radi, doc.radi_nume_text || doc.radi_nume_radi, false)
                  }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#002f6c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    <Download size={12} /> PDF
                  </button>
                </>
              )}
              {doc.tiene_pdf_firmado && (
                <button onClick={() => quipuxService.descargarPDF(doc.radi_nume_radi, doc.radi_nume_text || doc.radi_nume_radi, true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#0f6e56', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={12} /> PDF Firmado
                </button>
              )}
              {!doc.tiene_pdf && !doc.tiene_pdf_firmado && (
                <p style={{ fontSize: 11, color: '#9ca3af' }}>Sin PDF asociado.</p>
              )}
            </div>
          </div>
        )}

        {doc && tabActiva === 'recorrido' && (
          <div>
            {doc.recorrido.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af' }}>Sin recorrido registrado.</p>}
            {doc.recorrido.map((ev, i) => (
              <div key={ev.hist_codi} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#002f6c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  {i < doc.recorrido.length - 1 && <div style={{ width: 1, flex: 1, background: '#e5e7eb', minHeight: 20, marginTop: 2 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 8 }}>
                  <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{new Date(ev.hist_fech).toLocaleString('es-EC')}</p>
                  {ev.transaccion && <p style={{ fontSize: 11, fontWeight: 700, color: '#002f6c', margin: '2px 0' }}>{ev.transaccion}</p>}
                  <p style={{ fontSize: 11, color: '#374151', margin: 0 }}>{ev.hist_obse}</p>
                  {ev.usuario_origen && <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{ev.usuario_origen}{ev.usuario_destino ? ` → ${ev.usuario_destino}` : ''}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tabActiva === 'anexos' && <PanelAnexos radiId={item.radi_nume_radi} />}
      </div>
    </div>
  )
}

type BandejaId = 'todos' | 'recibidos' | 'enviados' | 'copia'

const BANDEJAS: Array<{ id: BandejaId; label: string; icon: React.FC<any>; adminOnly?: boolean }> = [
  { id: 'todos',     label: 'Todos',     icon: LayoutList, adminOnly: true },
  { id: 'recibidos', label: 'Recibidos', icon: Inbox },
  { id: 'enviados',  label: 'Enviados',  icon: Send },
  { id: 'copia',     label: 'Copia',     icon: Copy },
]

export default function QuipuxHistoricoPage() {
  const esAdmin = usePermisosStore(s => s.esAdmin)

  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [bandeja, setBandeja]         = useState<BandejaId>(esAdmin ? 'todos' : 'recibidos')
  const [page, setPage]               = useState(1)
  const [selItem, setSelItem]         = useState<QuipuxDocumento | null>(null)

  const params: Record<string, string> = { page: String(page), page_size: '50' }
  if (search)  params.search  = search
  if (bandeja && bandeja !== 'todos') params.bandeja = bandeja

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['quipux-documentos', params],
    queryFn: () => quipuxService.buscar(params),
    placeholderData: (prev) => prev,
  })

  const { data: misConteos } = useQuery({
    queryKey: ['quipux-mis-bandejas'],
    queryFn: () => quipuxService.misBandejas(),
    enabled: !esAdmin,
    staleTime: 60000,
  })

  const is503 = isError && (error as any)?.response?.status === 503
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / 50)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const conteo = (id: BandejaId) => {
    if (!misConteos) return null
    if (id === 'recibidos') return misConteos.recibidos
    if (id === 'enviados')  return misConteos.enviados
    if (id === 'copia')     return misConteos.copia
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb', position: 'relative' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px 12px', background: '#fff', borderBottom: '0.5px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#002f6c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={15} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Quipux Histórico</h1>
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
              {total.toLocaleString()} documento{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Bandejas tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {BANDEJAS.filter(b => !b.adminOnly || esAdmin).map(b => {
            const Icon = b.icon
            const cnt = conteo(b.id)
            return (
              <button key={b.id} onClick={() => { setBandeja(b.id); setPage(1) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                  borderRadius: 20, fontSize: 11, fontWeight: bandeja === b.id ? 700 : 400,
                  background: bandeja === b.id ? '#002f6c' : '#f3f4f6',
                  color: bandeja === b.id ? '#fff' : '#6b7280',
                  border: 'none', cursor: 'pointer',
                }}>
                <Icon size={11} />
                {b.label}
                {cnt != null && (
                  <span style={{ background: bandeja === b.id ? 'rgba(255,255,255,0.25)' : '#e5e7eb', borderRadius: 10, padding: '0 5px', fontSize: 9, fontWeight: 700, color: bandeja === b.id ? '#fff' : '#374151' }}>
                    {cnt.toLocaleString()}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Búsqueda */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar por asunto, número o cuenta…"
              style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 7, paddingBottom: 7, fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 8, outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ padding: '6px 14px', background: '#002f6c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Buscar
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
              style={{ padding: '6px 10px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#6b7280', fontSize: 11 }}>
              <X size={13} />
            </button>
          )}
        </form>
      </div>

      {/* Error 503 */}
      {is503 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
          <AlertCircle size={36} style={{ color: '#dc2626' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>Base de datos Quipux no disponible</p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>Contacte al administrador del sistema.</p>
        </div>
      )}

      {/* Tabla */}
      {!is503 && (
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
              <tr>
                {['N° Documento', 'Asunto', 'Estado', 'Área / Remitente', 'Fecha', 'PDF', 'Anexos'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '0.5px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 12 }}>Cargando…</td></tr>
              )}
              {!isLoading && (!data?.results || data.results.length === 0) && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 12 }}>
                  {bandeja !== 'todos' && !esAdmin ? 'No tienes documentos en esta bandeja.' : 'Sin resultados.'}
                </td></tr>
              )}
              {data?.results?.map(item => (
                <tr key={item.radi_nume_radi}
                  onClick={() => setSelItem(selItem?.radi_nume_radi === item.radi_nume_radi ? null : item)}
                  style={{ cursor: 'pointer', background: selItem?.radi_nume_radi === item.radi_nume_radi ? '#eff6ff' : undefined, borderBottom: '0.5px solid #f5f6f8' }}
                  onMouseEnter={e => { if (selItem?.radi_nume_radi !== item.radi_nume_radi) e.currentTarget.style.background = '#f9fafb' }}
                  onMouseLeave={e => { if (selItem?.radi_nume_radi !== item.radi_nume_radi) e.currentTarget.style.background = '' }}>
                  <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 10, color: '#002f6c', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {item.radi_nume_text || item.radi_nume_radi}
                  </td>
                  <td style={{ padding: '7px 10px', maxWidth: 260 }}>
                    <p style={{ margin: 0, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.radi_asunto || '(Sin asunto)'}
                    </p>
                  </td>
                  <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}><EstadoBadge codigo={item.esta_codi} /></td>
                  <td style={{ padding: '7px 10px', maxWidth: 180 }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.creador_nombre}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.area_nombre}</p>
                  </td>
                  <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 10, color: '#6b7280' }}>
                      {new Date(item.radi_fech_radi).toLocaleDateString('es-EC')}
                    </span>
                  </td>
                  <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                    {item.tiene_pdf && (
                      <button onClick={e => { e.stopPropagation(); quipuxService.descargarPDF(item.radi_nume_radi, item.radi_nume_text || item.radi_nume_radi) }}
                        style={{ padding: '3px 8px', background: '#eff6ff', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#1d4ed8', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Download size={10} /> PDF
                      </button>
                    )}
                    {item.tiene_pdf_firmado && (
                      <button onClick={e => { e.stopPropagation(); quipuxService.descargarPDF(item.radi_nume_radi, item.radi_nume_text || item.radi_nume_radi, true) }}
                        style={{ marginLeft: 4, padding: '3px 8px', background: '#f0fdf4', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#15803d', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Download size={10} /> Firmado
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    {item.tiene_anexos && (
                      <button onClick={e => { e.stopPropagation(); setSelItem(item) }}
                        style={{ padding: '3px 8px', background: '#faf5ff', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#7c3aed', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Paperclip size={10} /> Ver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Panel detalle */}
          {selItem && (
            <PanelDetalle item={selItem} onClose={() => setSelItem(null)} />
          )}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#fff', borderTop: '0.5px solid #e5e7eb', fontSize: 11, color: '#6b7280' }}>
          <span>{((page - 1) * 50) + 1}–{Math.min(page * 50, total)} de {total.toLocaleString()}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '4px 8px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: page === 1 ? '#f3f4f6' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={13} />
            </button>
            <span style={{ padding: '4px 10px', fontWeight: 600 }}>Pág. {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '4px 8px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: page === totalPages ? '#f3f4f6' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
