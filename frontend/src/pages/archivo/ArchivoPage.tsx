import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import { archivoService } from '@/services/archivo.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  Archive, Search, Plus, X, FolderOpen,
  FolderClosed, FileText, Calendar, Building2,
  ArrowRight, AlertTriangle, Database
} from 'lucide-react'

const ESTADOS: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  abierto:     { bg: '#f0fdf4', text: '#15803d', label: 'Abierto',     icon: FolderOpen },
  cerrado:     { bg: '#f9fafb', text: '#374151', label: 'Cerrado',     icon: FolderClosed },
  transferido: { bg: '#eff6ff', text: '#1d4ed8', label: 'Transferido', icon: ArrowRight },
  eliminado:   { bg: '#fef2f2', text: '#dc2626', label: 'Eliminado',   icon: X },
}

const SOPORTE: Record<string, { bg: string; text: string }> = {
  digital: { bg: '#e8f1fd', text: '#002f6c' },
  fisico:  { bg: '#faeeda', text: '#854f0b' },
  mixto:   { bg: '#f0fdf4', text: '#0f6e56' },
}

const DISPOSICION: Record<string, { label: string; color: string }> = {
  conservacion:   { label: 'Conservación',   color: '#0f6e56' },
  eliminacion:    { label: 'Eliminación',    color: '#dc2626' },
  digitalizacion: { label: 'Digitalización', color: '#002f6c' },
  muestreo:       { label: 'Muestreo',       color: '#854f0b' },
}

function ModalNuevoExpediente({ onClose }: { onClose: () => void }) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, any>>({ soporte: 'digital' })
  const [error, setError] = useState('')

  const { data: series }   = useQuery({ queryKey: ['series'],          queryFn: () => archivoService.series() })
  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const mutation = useMutation({
    mutationFn: (data: any) => archivoService.crear(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expedientes'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al crear'),
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.rowSub, marginBottom: 6 }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 16, width: '100%', maxWidth: 512, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: `1px solid ${T.rowBd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${T.rowBd}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8f1fd' }}>
              <Archive size={15} style={{ color: '#002f6c' }} />
            </div>
            <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>Nuevo expediente</h3>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div>
            <label style={labelStyle}>Título del expediente *</label>
            <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
              placeholder="Título descriptivo del expediente"
              value={form.titulo ?? ''} onChange={e => set('titulo', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Serie documental *</label>
              <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                value={form.serie ?? ''} onChange={e => set('serie', Number(e.target.value))}>
                <option value="">— Selecciona —</option>
                {series?.results?.map(s => <option key={s.id} value={s.id}>[{s.codigo}] {s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Soporte</label>
              <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                value={form.soporte} onChange={e => set('soporte', e.target.value)}>
                <option value="digital">Digital</option>
                <option value="fisico">Físico</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Unidad productora *</label>
            <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
              value={form.unidad ?? ''} onChange={e => set('unidad', Number(e.target.value))}>
              <option value="">— Selecciona —</option>
              {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea className="w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none" style={inputStyle} rows={3}
              placeholder="Descripción del contenido del expediente..."
              value={form.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Fecha inicio</label>
              <input type="date" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                value={form.fecha_inicio ?? ''} onChange={e => set('fecha_inicio', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Ubicación física</label>
              <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                placeholder="Ej: Estante 3, Caja 12"
                value={form.ubicacion_fisica ?? ''} onChange={e => set('ubicacion_fisica', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: `1px solid ${T.rowBd}` }}>
          <button onClick={onClose}
            style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => {
              if (!form.titulo || !form.serie || !form.unidad) { setError('Completa los campos obligatorios.'); return }
              mutation.mutate(form)
            }}
            disabled={mutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: mutation.isPending ? '#4a90e2' : T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
            {mutation.isPending
              ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Creando...</>
              : <><Plus size={15} /> Crear expediente</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ArchivoPage() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const [busqueda, setBusqueda]   = useState('')
  const [filtroEstado, setFiltro] = useState('')
  const [filtroSerie, setSerie]   = useState('')
  const [modal, setModal]         = useState(false)
  const [vista, setVista]         = useState<'expedientes' | 'series'>('expedientes')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['expedientes', busqueda, filtroEstado, filtroSerie],
    queryFn: () => archivoService.expedientes({
      ...(busqueda     ? { search: busqueda }     : {}),
      ...(filtroEstado ? { estado: filtroEstado } : {}),
      ...(filtroSerie  ? { serie: filtroSerie }   : {}),
    }),
  })

  const { data: stats }       = useQuery({ queryKey: ['archivo-stats'], queryFn: archivoService.estadisticas })
  const { data: seriesData }  = useQuery({ queryKey: ['series'],        queryFn: () => archivoService.series() })

  const cerrar    = useMutation({ mutationFn: (id: number) => archivoService.cerrar(id),    onSuccess: () => qc.invalidateQueries({ queryKey: ['expedientes'] }) })
  const transferir = useMutation({ mutationFn: (id: number) => archivoService.transferir(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['expedientes'] }) })

  const expedientes = data?.results ?? []
  const inputStyle  = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }

  return (
    <div>
      {modal && <ModalNuevoExpediente onClose={() => setModal(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.rowTxt }}>Archivo documental central</h1>
          <p style={{ fontSize: 14, color: T.rowSub, marginTop: 2 }}>Gestión de expedientes y series documentales</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo expediente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total expedientes', value: stats?.total ?? '—',      bg: '#e8f1fd', color: '#002f6c', icon: Archive },
          { label: 'Abiertos',          value: stats?.abiertos ?? '—',   bg: '#f0fdf4', color: '#15803d', icon: FolderOpen },
          { label: 'Cerrados',          value: stats?.cerrados ?? '—',   bg: '#f9fafb', color: '#374151', icon: FolderClosed },
          { label: 'Por vencer',        value: stats?.por_vencer ?? '—', bg: '#fef2f2', color: '#dc2626', icon: AlertTriangle },
        ].map(({ label, value, bg, color, icon: Icon }) => (
          <div key={label} style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: T.rowTxt, margin: 0 }}>{value}</p>
              <p style={{ fontSize: 11, color: T.rowSub, margin: 0 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Soporte breakdown */}
      {stats && (
        <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 20 }}>
          {[
            { label: 'Digital', value: stats.digital, ...SOPORTE.digital },
            { label: 'Físico',  value: stats.fisico,  ...SOPORTE.fisico },
            { label: 'Mixto',   value: stats.mixto,   ...SOPORTE.mixto },
          ].map(({ label, value, bg, text }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: `1px solid ${T.rowBd}`, background: T.ctHdrBg }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
                <Database size={15} style={{ color: text }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: text, margin: 0 }}>{value}</p>
                <p style={{ fontSize: 11, color: T.rowSub, margin: 0 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        {[['expedientes','Expedientes'],['series','Series documentales']].map(([k,l]) => (
          <button key={k} onClick={() => setVista(k as any)}
            style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all .15s',
              background: vista === k ? T.accentDk : T.rowHv,
              color: vista === k ? '#fff' : T.rowSub }}>
            {l}
          </button>
        ))}
      </div>

      {/* Vista expedientes */}
      {vista === 'expedientes' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 192 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
              <input type="text" placeholder="Buscar por código, título..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full text-sm rounded-xl outline-none"
                style={{ ...inputStyle, paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10 }} />
            </div>
            <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filtroSerie} onChange={e => setSerie(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}>
              <option value="">Todas las series</option>
              {seriesData?.results?.map(s => <option key={s.id} value={s.id}>[{s.codigo}] {s.nombre}</option>)}
            </select>
          </div>

          <div style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, overflow: 'hidden' }}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontSize: 14, color: T.rowSub }}>Cargando expedientes...</div>
            ) : expedientes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: T.rowSub }}>
                <Archive size={28} style={{ opacity: .4, marginBottom: 8 }} />
                <p style={{ fontSize: 14 }}>No se encontraron expedientes</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.rowBd}` }}>
                    {['Expediente','Serie','Unidad','Documentos','Estado',''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expedientes.map(exp => {
                    const est  = ESTADOS[exp.estado] ?? ESTADOS.abierto
                    const EIcon = est.icon
                    const sop  = SOPORTE[exp.soporte] ?? SOPORTE.digital
                    return (
                      <tr key={exp.id} style={{ borderBottom: `1px solid ${T.rowBd}`, transition: 'background .1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '14px 20px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk, margin: 0 }}>{exp.codigo_expediente}</p>
                          <p style={{ fontSize: 14, fontWeight: 500, color: T.rowTxt, marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.titulo}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: sop.bg, color: sop.text }}>{exp.soporte}</span>
                            {exp.fecha_inicio && (
                              <span style={{ fontSize: 10, color: T.rowSub, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Calendar size={10} /> {new Date(exp.fecha_inicio).toLocaleDateString('es-EC')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: T.rowTxt, margin: 0 }}>{exp.serie_codigo}</p>
                          <p style={{ fontSize: 11, color: T.rowSub, marginTop: 2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.serie_nombre}</p>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Building2 size={13} style={{ color: T.rowSub }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: T.rowTxt }}>{exp.unidad_siglas}</span>
                          </div>
                          <p style={{ fontSize: 11, color: T.rowSub, marginTop: 2 }}>{exp.creado_por_nombre}</p>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={13} style={{ color: T.rowSub }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: T.rowTxt }}>{exp.num_documentos}</span>
                          </div>
                          <p style={{ fontSize: 11, color: T.rowSub, marginTop: 2 }}>{exp.num_fojas} fojas</p>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: est.bg, color: est.text }}>
                            <EIcon size={11} /> {est.label}
                          </span>
                          {exp.dias_para_expurgo !== null && exp.dias_para_expurgo <= 30 && (
                            <p style={{ fontSize: 10, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <AlertTriangle size={10} /> Expurgo en {exp.dias_para_expurgo}d
                            </p>
                          )}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            {exp.estado === 'abierto' && (
                              <button onClick={() => cerrar.mutate(exp.id)}
                                style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}
                                title="Cerrar expediente">
                                <FolderClosed size={14} />
                              </button>
                            )}
                            {exp.estado === 'cerrado' && (
                              <button onClick={() => transferir.mutate(exp.id)}
                                style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#1d4ed8' }}
                                title="Transferir al archivo central">
                                <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Vista series */}
      {vista === 'series' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {seriesData?.results?.map(serie => {
            const disp = DISPOSICION[serie.disposicion_final] ?? DISPOSICION.conservacion
            return (
              <div key={serie.id} style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk }}>{serie.codigo}</span>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.rowTxt, marginTop: 4, marginBottom: 0 }}>{serie.nombre}</h3>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: T.rowHv, color: disp.color }}>
                    {disp.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3" style={{ marginTop: 12 }}>
                  {[
                    { label: 'Retención',       value: `${serie.anos_retencion} años` },
                    { label: 'Archivo central', value: `${serie.anos_central} años` },
                    { label: 'Expedientes',     value: serie.num_expedientes },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ textAlign: 'center', padding: 8, borderRadius: 12, background: T.rowHv }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: T.rowTxt, margin: 0 }}>{value}</p>
                      <p style={{ fontSize: 10, color: T.rowSub, marginTop: 2 }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
