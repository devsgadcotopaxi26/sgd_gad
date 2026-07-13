import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import { documentosService } from '@/services/documentos.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  FileText, ClipboardList, BarChart2,
  Download, Calendar, Filter, CheckCircle
} from 'lucide-react'
import api from '@/services/api'

const REPORTES = [
  {
    id: 'tramites', titulo: 'Reporte de trámites',
    descripcion: 'Lista completa de trámites con estados, plazos y ciudadanos',
    icon: ClipboardList, color: '#002f6c', bg: '#e8f1fd',
    endpoint: '/auditoria/reportes/tramites/', endpointXlsx: '/auditoria/reportes/tramites/excel/',
    filename: 'reporte_tramites.pdf', filenameXlsx: 'reporte_tramites.xlsx',
  },
  {
    id: 'documentos', titulo: 'Reporte de documentos',
    descripcion: 'Oficios, memorandos y circulares con estados y firmas',
    icon: FileText, color: '#5b3a8c', bg: '#f0ebf9',
    endpoint: '/auditoria/reportes/documentos/', endpointXlsx: '/auditoria/reportes/documentos/excel/',
    filename: 'reporte_documentos.pdf', filenameXlsx: 'reporte_documentos.xlsx',
  },
  {
    id: 'kpi', titulo: 'KPIs por unidad',
    descripcion: 'Indicadores de desempeño y cumplimiento por dirección',
    icon: BarChart2, color: '#0f6e56', bg: '#e1f5ee',
    endpoint: '/auditoria/reportes/kpi-unidades/', endpointXlsx: '/auditoria/reportes/kpi-unidades/excel/',
    filename: 'reporte_kpi.pdf', filenameXlsx: 'reporte_kpi.xlsx',
  },
]

const ESTADOS_TRAMITE = [
  { value: '', label: 'Todos los estados' }, { value: 'ingresado', label: 'Ingresado' },
  { value: 'en_proceso', label: 'En proceso' }, { value: 'resuelto', label: 'Resuelto' },
  { value: 'rechazado', label: 'Rechazado' },
]

const ESTADOS_DOC = [
  { value: '', label: 'Todos los estados' }, { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' }, { value: 'aprobado', label: 'Aprobado' },
  { value: 'archivado', label: 'Archivado' },
]

export default function ReportesPage() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const [reporteActivo, setReporteActivo] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<Record<string, string>>({})
  const [generando, setGenerando] = useState<string | null>(null)
  const [generados, setGenerados] = useState<string[]>([])
  const [generandoXlsx, setGenerandoXlsx] = useState<string | null>(null)

  const { data: tipos }    = useQuery({ queryKey: ['tipos-doc'],       queryFn: documentosService.tipos })
  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const setFiltro = (k: string, v: string) => setFiltros(f => ({ ...f, [k]: v }))

  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.06em', color: T.rowSub, marginBottom: 4 }

  const generarExcel = async (reporte: typeof REPORTES[0]) => {
    setGenerandoXlsx(reporte.id)
    try {
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v) })
      const resp = await api.get(`${reporte.endpointXlsx}?${params.toString()}`, { responseType: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([resp.data]))
      link.download = reporte.filenameXlsx
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e) { console.error('Error generando Excel:', e) }
    finally { setGenerandoXlsx(null) }
  }

  const generarPDF = async (reporte: typeof REPORTES[0]) => {
    setGenerando(reporte.id)
    try {
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v) })
      const response = await api.get(`${reporte.endpoint}?${params.toString()}`, { responseType: 'blob' })
      const blob  = new Blob([response.data], { type: 'application/pdf' })
      const link  = document.createElement('a')
      link.href   = URL.createObjectURL(blob)
      link.download = reporte.filename
      link.click()
      URL.revokeObjectURL(link.href)
      setGenerados(g => [...g, reporte.id])
      setTimeout(() => setGenerados(g => g.filter(x => x !== reporte.id)), 3000)
    } catch (e) { console.error('Error generando PDF:', e) }
    finally { setGenerando(null) }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.rowTxt }}>Reportes y exportaciones</h1>
        <p style={{ fontSize: 14, color: T.rowSub, marginTop: 2 }}>Genera reportes en PDF de cualquier módulo del SGD</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {REPORTES.map(r => {
          const Icon     = r.icon
          const activo   = reporteActivo === r.id
          const ok       = generados.includes(r.id)
          const cargando = generando === r.id

          return (
            <div key={r.id} style={{ background: T.ctHdrBg, border: `1px solid ${activo ? r.color : T.rowBd}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color .2s' }}>
              {/* Header */}
              <div style={{ padding: 20, cursor: 'pointer' }} onClick={() => setReporteActivo(activo ? null : r.id)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: r.bg }}>
                    <Icon size={20} style={{ color: r.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.rowTxt, margin: 0 }}>{r.titulo}</h3>
                    <p style={{ fontSize: 12, color: T.rowSub, marginTop: 2 }}>{r.descripcion}</p>
                  </div>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: r.color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Filter size={12} />
                  {activo ? 'Ocultar filtros' : 'Configurar filtros'}
                </button>
              </div>

              {/* Filtros expandibles */}
              {activo && (
                <div style={{ padding: '16px 20px', borderTop: `1px solid ${T.rowBd}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: 'Desde', key: 'desde' }, { label: 'Hasta', key: 'hasta' }].map(({ label, key }) => (
                      <div key={key}>
                        <label style={labelStyle}>{label}</label>
                        <input type="date" className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle}
                          value={filtros[key] ?? ''} onChange={e => setFiltro(key, e.target.value)} />
                      </div>
                    ))}
                  </div>

                  {r.id === 'tramites' && (
                    <>
                      <div>
                        <label style={labelStyle}>Estado</label>
                        <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle}
                          value={filtros.estado ?? ''} onChange={e => setFiltro('estado', e.target.value)}>
                          {ESTADOS_TRAMITE.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Unidad</label>
                        <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle}
                          value={filtros.unidad ?? ''} onChange={e => setFiltro('unidad', e.target.value)}>
                          <option value="">Todas las unidades</option>
                          {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {r.id === 'documentos' && (
                    <>
                      <div>
                        <label style={labelStyle}>Estado</label>
                        <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle}
                          value={filtros.estado ?? ''} onChange={e => setFiltro('estado', e.target.value)}>
                          {ESTADOS_DOC.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Tipo</label>
                        <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle}
                          value={filtros.tipo ?? ''} onChange={e => setFiltro('tipo', e.target.value)}>
                          <option value="">Todos los tipos</option>
                          {tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Botones generar */}
              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8 }}>
                <button onClick={() => generarPDF(r)} disabled={!!cargando}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', cursor: cargando ? 'not-allowed' : 'pointer', transition: 'all .2s',
                    background: ok ? '#0f6e56' : cargando ? '#9ca3af' : r.color }}>
                  {ok ? <><CheckCircle size={15} /> PDF listo</> :
                   cargando ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> PDF...</> :
                   <><Download size={15} /> PDF</>}
                </button>
                <button onClick={() => generarExcel(r)} disabled={generandoXlsx === r.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 700, background: '#e8f5e9', color: '#1b5e20', border: '1px solid #a5d6a7', cursor: generandoXlsx === r.id ? 'not-allowed' : 'pointer', opacity: generandoXlsx === r.id ? 0.7 : 1 }}>
                  {generandoXlsx === r.id
                    ? <span className="w-4 h-4 border-2 border-green-800/30 border-t-green-800 rounded-full animate-spin" />
                    : <Download size={15} />}
                  XLSX
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info de uso */}
      <div style={{ marginTop: 24, background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.rowTxt, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={15} style={{ color: T.accentDk }} /> Información de los reportes
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ fontSize: 12, color: T.rowSub }}>
          {[
            { title: 'Reporte de trámites', desc: 'Incluye todos los trámites con número, ciudadano, estado, fechas de ingreso y límite, unidad responsable y días restantes.' },
            { title: 'Reporte de documentos', desc: 'Lista oficios, memorandos, circulares y resoluciones con su numeración oficial, tipo, unidad de origen y estado actual.' },
            { title: 'KPIs por unidad', desc: 'Indicadores de gestión por dirección: total de trámites, pendientes, resueltos en el mes y porcentaje de cumplimiento.' },
          ].map(({ title, desc }) => (
            <div key={title}>
              <p style={{ fontWeight: 600, color: T.rowTxt, marginBottom: 4 }}>{title}</p>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
