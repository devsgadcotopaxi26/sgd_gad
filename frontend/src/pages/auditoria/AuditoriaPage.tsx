import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import {
  Shield, Search, RefreshCw, Filter, X,
  FileText, Users, Archive, ClipboardList,
  LogIn, LogOut, Download, Eye, PenLine,
  Plus, Trash2, Stamp, AlertTriangle
} from 'lucide-react'

// ── Servicio ──────────────────────────────────────────────────────────

const auditoriaService = {
  logs: (params: Record<string, string>) =>
    api.get<{ count: number; results: any[] }>('/auditoria/logs/', { params }).then(r => r.data),
}

// ── Constantes ────────────────────────────────────────────────────────

const ACCION_CONFIG: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  INSERT:   { bg: '#f0fdf4', text: '#15803d', label: 'Creación',          icon: Plus        },
  UPDATE:   { bg: '#eff6ff', text: '#1d4ed8', label: 'Modificación',      icon: PenLine     },
  DELETE:   { bg: '#fef2f2', text: '#dc2626', label: 'Eliminación',       icon: Trash2      },
  LOGIN:    { bg: '#f0f9ff', text: '#0369a1', label: 'Inicio de sesión',  icon: LogIn       },
  LOGOUT:   { bg: '#f9fafb', text: '#6b7280', label: 'Cierre de sesión',  icon: LogOut      },
  FIRMA:    { bg: '#f0fdf4', text: '#0f6e56', label: 'Firma electrónica', icon: Stamp       },
  DESCARGA: { bg: '#faeeda', text: '#854f0b', label: 'Descarga',          icon: Download    },
  VISTA:    { bg: '#f3f4f6', text: '#374151', label: 'Vista',             icon: Eye         },
  ANULACION:{ bg: '#faf5ff', text: '#7e22ce', label: 'Anulación',         icon: AlertTriangle },
}

const MODULO_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  documentos:     { label: 'Documentos',    icon: FileText,     color: '#002f6c' },
  tramites:       { label: 'Trámites',      icon: ClipboardList,color: '#854f0b' },
  archivo:        { label: 'Archivo',       icon: Archive,      color: '#0f6e56' },
  usuarios:       { label: 'Usuarios',      icon: Users,        color: '#534ab7' },
  organizacion:   { label: 'Organización',  icon: Users,        color: '#0369a1' },
  notificaciones: { label: 'Notificaciones',icon: Shield,       color: '#6b7280' },
  sistema:        { label: 'Sistema',       icon: Shield,       color: '#374151' },
}

const TABLA_LABELS: Record<string, string> = {
  doc_documento:    'Documento',
  doc_bandeja:      'Bandeja',
  doc_adjunto:      'Adjunto',
  doc_seguimiento:  'Seguimiento',
  tra_tramite:      'Trámite',
  tra_persona:      'Persona',
  arc_expediente:   'Expediente',
  arc_prestamo:     'Préstamo',
  arc_baja_documental: 'Baja documental',
  arc_transferencia:'Transferencia',
  usr_usuario:      'Usuario',
  org_unidad:       'Unidad',
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-EC') + ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
}

// ── Panel de detalle de un log ────────────────────────────────────────

function PanelDetalle({ log, onClose }: { log: any; onClose: () => void }) {
  const accion = ACCION_CONFIG[log.accion] ?? ACCION_CONFIG.UPDATE
  const ActIcon = accion.icon

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        margin: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '0.5px solid #f0f0f0' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: accion.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ActIcon size={15} style={{ color: accion.text }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', margin: 0 }}>
              {accion.label} — {TABLA_LABELS[log.tabla] ?? log.tabla}
            </p>
            <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>
              {formatFecha(log.creado_en)} · {log.usuario_email || '—'} · {log.ip_address || '—'}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Módulo',     value: MODULO_CONFIG[log.modulo]?.label ?? log.modulo ?? '—' },
              { label: 'Tabla',      value: TABLA_LABELS[log.tabla] ?? log.tabla },
              { label: 'Registro',   value: log.registro_id ? `#${log.registro_id}` : '—' },
              { label: 'Unidad',     value: log.unidad_id ? `ID ${log.unidad_id}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 3px' }}>{label}</p>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {log.descripcion && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Descripción</p>
              <p style={{ fontSize: 12, color: '#374151', background: '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>{log.descripcion}</p>
            </div>
          )}

          {log.campos_cambiados && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Campos modificados</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(Array.isArray(log.campos_cambiados) ? log.campos_cambiados : log.campos_cambiados.replace(/[{}]/g, '').split(',')).map((c: string) => (
                  <span key={c} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#1d4ed8' }}>
                    {c.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(log.datos_antes || log.datos_despues) && (
            <div style={{ display: 'grid', gridTemplateColumns: log.datos_antes && log.datos_despues ? '1fr 1fr' : '1fr', gap: 8 }}>
              {log.datos_antes && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Antes</p>
                  <pre style={{ fontSize: 10, background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: 10, overflowX: 'auto', color: '#374151', margin: 0, maxHeight: 200 }}>
                    {JSON.stringify(log.datos_antes, null, 2)}
                  </pre>
                </div>
              )}
              {log.datos_despues && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Después</p>
                  <pre style={{ fontSize: 10, background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 8, padding: 10, overflowX: 'auto', color: '#374151', margin: 0, maxHeight: 200 }}>
                    {JSON.stringify(log.datos_despues, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────

export default function AuditoriaPage() {
  const [filtros, setFiltros] = useState<Record<string, string>>({})
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [selected, setSelected] = useState<any>(null)

  const params: Record<string, string> = { ...filtros }
  if (busqueda) params.search = busqueda

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditoria-logs', params],
    queryFn: () => auditoriaService.logs(params),
  })

  const setFiltro = (k: string, v: string) => setFiltros(f => v ? { ...f, [k]: v } : Object.fromEntries(Object.entries(f).filter(([key]) => key !== k)))
  const limpiarFiltros = () => { setFiltros({}); setBusqueda('') }

  const logs = data?.results ?? []
  const filtrosActivos = Object.keys(filtros).length + (busqueda ? 1 : 0)

  const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#002f6c] bg-white"

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {selected && <PanelDetalle log={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} style={{ color: '#002f6c' }} /> Log de auditoría
          </h1>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Registro completo de acciones — exigido por Contraloría General del Estado
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              border: `0.5px solid ${filtrosActivos > 0 ? '#002f6c' : '#e5e7eb'}`,
              background: filtrosActivos > 0 ? '#e8f1fd' : '#fff',
              color: filtrosActivos > 0 ? '#002f6c' : '#6b7280',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            <Filter size={13} />
            Filtros {filtrosActivos > 0 && `(${filtrosActivos})`}
          </button>
          <button onClick={() => refetch()}
            style={{ width: 34, height: 34, borderRadius: 9, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Módulo</label>
              <select className={cls} value={filtros.modulo ?? ''} onChange={e => setFiltro('modulo', e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(MODULO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Acción</label>
              <select className={cls} value={filtros.accion ?? ''} onChange={e => setFiltro('accion', e.target.value)}>
                <option value="">Todas</option>
                {Object.entries(ACCION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Desde</label>
              <input type="date" className={cls} value={filtros.desde ?? ''} onChange={e => setFiltro('desde', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Hasta</label>
              <input type="date" className={cls} value={filtros.hasta ?? ''} onChange={e => setFiltro('hasta', e.target.value)} />
            </div>
          </div>
          {filtrosActivos > 0 && (
            <button onClick={limpiarFiltros}
              style={{ marginTop: 10, fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Barra de búsqueda y contador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
          <input placeholder="Buscar por tabla, usuario, descripción..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 26px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }} />
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          {isLoading ? 'Cargando...' : `${data?.count ?? 0} registros${data?.count === 500 ? ' (mostrando últimos 500)' : ''}`}
        </span>
      </div>

      {/* Tabla de logs */}
      <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 100px 110px 120px 1fr 140px', gap: 10, padding: '8px 14px', background: '#f9fafb', borderBottom: '0.5px solid #f0f0f0' }}>
          {['', 'Acción', 'Módulo', 'Tabla', 'Usuario / Descripción', 'Fecha'].map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 12 }}>Cargando registros...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#c4c9d4' }}>
            <Shield size={32} style={{ opacity: .3, margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: 12 }}>No hay registros con los filtros actuales</p>
          </div>
        ) : logs.map((log: any) => {
          const accion = ACCION_CONFIG[log.accion] ?? ACCION_CONFIG.UPDATE
          const modulo = MODULO_CONFIG[log.modulo]
          const ActIcon = accion.icon
          const ModIcon = modulo?.icon ?? Shield
          return (
            <div key={log.id}
              onClick={() => setSelected(log)}
              style={{
                display: 'grid', gridTemplateColumns: '36px 100px 110px 120px 1fr 140px',
                gap: 10, padding: '8px 14px', borderBottom: '0.5px solid #f9fafb',
                cursor: 'pointer', alignItems: 'center',
                transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 28, height: 28, borderRadius: 7, background: accion.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ActIcon size={13} style={{ color: accion.text }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: accion.bg, color: accion.text, whiteSpace: 'nowrap', display: 'inline-block' }}>
                {accion.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ModIcon size={11} style={{ color: modulo?.color ?? '#9ca3af', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {modulo?.label ?? log.modulo ?? '—'}
                </span>
              </div>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {TABLA_LABELS[log.tabla] ?? log.tabla}
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: '#374151', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {log.usuario_email || '—'}
                </p>
                {log.descripcion && (
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.descripcion}
                  </p>
                )}
              </div>
              <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                {formatFecha(log.creado_en)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}