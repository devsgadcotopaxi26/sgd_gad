import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { documentosService } from '@/services/documentos.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  FileText, ClipboardList, BarChart2,
  Download, Calendar, Filter, CheckCircle
} from 'lucide-react'
import api from '@/services/api'

const REPORTES = [
  {
    id:           'tramites',
    titulo:       'Reporte de trámites',
    descripcion:  'Lista completa de trámites con estados, plazos y ciudadanos',
    icon:         ClipboardList,
    color:        '#002f6c',
    bg:           '#e8f1fd',
    endpoint:     '/auditoria/reportes/tramites/',
    endpointXlsx: '/auditoria/reportes/tramites/excel/',
    filename:     'reporte_tramites.pdf',
    filenameXlsx: 'reporte_tramites.xlsx',
  },
  {
    id:           'documentos',
    titulo:       'Reporte de documentos',
    descripcion:  'Oficios, memorandos y circulares con estados y firmas',
    icon:         FileText,
    color:        '#5b3a8c',
    bg:           '#f0ebf9',
    endpoint:     '/auditoria/reportes/documentos/',
    endpointXlsx: '/auditoria/reportes/documentos/excel/',
    filename:     'reporte_documentos.pdf',
    filenameXlsx: 'reporte_documentos.xlsx',
  },
  {
    id:           'kpi',
    titulo:       'KPIs por unidad',
    descripcion:  'Indicadores de desempeño y cumplimiento por dirección',
    icon:         BarChart2,
    color:        '#0f6e56',
    bg:           '#e1f5ee',
    endpoint:     '/auditoria/reportes/kpi-unidades/',
    endpointXlsx: '/auditoria/reportes/kpi-unidades/excel/',
    filename:     'reporte_kpi.pdf',
    filenameXlsx: 'reporte_kpi.xlsx',
  },
]

const ESTADOS_TRAMITE = [
  { value: '',            label: 'Todos los estados' },
  { value: 'ingresado',   label: 'Ingresado' },
  { value: 'en_proceso',  label: 'En proceso' },
  { value: 'resuelto',    label: 'Resuelto' },
  { value: 'rechazado',   label: 'Rechazado' },
]

const ESTADOS_DOC = [
  { value: '',           label: 'Todos los estados' },
  { value: 'borrador',   label: 'Borrador' },
  { value: 'enviado',    label: 'Enviado' },
  { value: 'aprobado',   label: 'Aprobado' },
  { value: 'archivado',  label: 'Archivado' },
]

export default function ReportesPage() {
  const [reporteActivo, setReporteActivo] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<Record<string, string>>({})
  const [generando, setGenerando] = useState<string | null>(null)
  const [generados, setGenerados] = useState<string[]>([])
  const [generandoXlsx, setGenerandoXlsx] = useState<string | null>(null)

  const { data: tipos }    = useQuery({ queryKey: ['tipos-doc'],     queryFn: documentosService.tipos })
  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const setFiltro = (k: string, v: string) => setFiltros(f => ({ ...f, [k]: v }))

  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

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
    } catch (e) {
      console.error('Error generando Excel:', e)
    } finally {
      setGenerandoXlsx(null)
    }
  }

  const generarPDF = async (reporte: typeof REPORTES[0]) => {
    setGenerando(reporte.id)
    try {
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v) })
      const url      = `${reporte.endpoint}?${params.toString()}`
      const response = await api.get(url, { responseType: 'blob' })
      const blob     = new Blob([response.data], { type: 'application/pdf' })
      const link     = document.createElement('a')
      link.href      = URL.createObjectURL(blob)
      link.download  = reporte.filename
      link.click()
      URL.revokeObjectURL(link.href)
      setGenerados(g => [...g, reporte.id])
      setTimeout(() => setGenerados(g => g.filter(x => x !== reporte.id)), 3000)
    } catch (e) {
      console.error('Error generando PDF:', e)
    } finally {
      setGenerando(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Reportes y exportaciones</h1>
        <p className="text-sm text-gray-400 mt-0.5">Genera reportes en PDF de cualquier módulo del SGD</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {REPORTES.map(r => {
          const Icon    = r.icon
          const activo  = reporteActivo === r.id
          const ok      = generados.includes(r.id)
          const cargando = generando === r.id

          return (
            <div key={r.id}
              className="bg-white border rounded-2xl overflow-hidden transition-all"
              style={{ borderColor: activo ? r.color : '#f0f0f0' }}>

              {/* Header */}
              <div className="p-5 cursor-pointer" onClick={() => setReporteActivo(activo ? null : r.id)}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: r.bg }}>
                    <Icon size={20} style={{ color: r.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-900">{r.titulo}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{r.descripcion}</p>
                  </div>
                </div>

                <button
                  className="flex items-center justify-center gap-1.5 text-xs font-bold"
                  style={{ color: r.color }}>
                  <Filter size={12} />
                  {activo ? 'Ocultar filtros' : 'Configurar filtros'}
                </button>
              </div>

              {/* Filtros expandibles */}
              {activo && (
                <div className="px-5 pb-4 space-y-3 border-t border-gray-50 pt-4">

                  {/* Filtros comunes a todos */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Desde</label>
                      <input type="date" className={inputCls}
                        value={filtros.desde ?? ''}
                        onChange={e => setFiltro('desde', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Hasta</label>
                      <input type="date" className={inputCls}
                        value={filtros.hasta ?? ''}
                        onChange={e => setFiltro('hasta', e.target.value)} />
                    </div>
                  </div>

                  {/* Filtros específicos de trámites */}
                  {r.id === 'tramites' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Estado</label>
                        <select className={inputCls} value={filtros.estado ?? ''}
                          onChange={e => setFiltro('estado', e.target.value)}>
                          {ESTADOS_TRAMITE.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Unidad</label>
                        <select className={inputCls} value={filtros.unidad ?? ''}
                          onChange={e => setFiltro('unidad', e.target.value)}>
                          <option value="">Todas las unidades</option>
                          {unidades?.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Filtros específicos de documentos */}
                  {r.id === 'documentos' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Estado</label>
                        <select className={inputCls} value={filtros.estado ?? ''}
                          onChange={e => setFiltro('estado', e.target.value)}>
                          {ESTADOS_DOC.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Tipo</label>
                        <select className={inputCls} value={filtros.tipo ?? ''}
                          onChange={e => setFiltro('tipo', e.target.value)}>
                          <option value="">Todos los tipos</option>
                          {tipos?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Botones generar */}
              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={() => generarPDF(r)}
                  disabled={!!cargando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: ok ? '#0f6e56' : cargando ? '#9ca3af' : r.color, cursor: cargando ? 'not-allowed' : 'pointer' }}>
                  {ok ? <><CheckCircle size={15} /> PDF listo</> :
                   cargando ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> PDF...</> :
                   <><Download size={15} /> PDF</>}
                </button>
                <button
                  onClick={() => generarExcel(r)}
                  disabled={generandoXlsx === r.id}
                  title="Exportar a Excel"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: '#e8f5e9', color: '#1b5e20', border: '1px solid #a5d6a7', cursor: generandoXlsx === r.id ? 'not-allowed' : 'pointer', opacity: generandoXlsx === r.id ? 0.7 : 1 }}>
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
      <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar size={15} style={{ color: '#002f6c' }} /> Información de los reportes
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs text-gray-500">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Reporte de trámites</p>
            <p>Incluye todos los trámites con número, ciudadano, estado, fechas de ingreso y límite, unidad responsable y días restantes.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Reporte de documentos</p>
            <p>Lista oficios, memorandos, circulares y resoluciones con su numeración oficial, tipo, unidad de origen y estado actual.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">KPIs por unidad</p>
            <p>Indicadores de gestión por dirección: total de trámites, pendientes, resueltos en el mes y porcentaje de cumplimiento.</p>
          </div>
        </div>
      </div>
    </div>
  )
}