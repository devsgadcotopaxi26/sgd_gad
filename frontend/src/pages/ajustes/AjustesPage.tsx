import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import api from '@/services/api'
import { quipuxService } from '@/services/quipux.service'
import {
  Building2, FileText, ClipboardList, Mail,
  Archive, Save, Plus, Edit2, Check,
  AlertCircle, CheckCircle2, Send, ToggleLeft, ToggleRight,
  Settings, RefreshCw, ChevronRight, Link2
} from 'lucide-react'

const ajustesService = {
  getConfig:        () => api.get('/configuracion/').then(r => r.data),
  updateConfig:     (data: any) => api.patch('/configuracion/', data).then(r => r.data),
  testEmail:        (email: string) => api.post('/configuracion/test-email/', { email }).then(r => r.data),
  getTiposDoc:      () => api.get('/documentos/tipos-documento/?todos=true').then(r => r.data?.results ?? r.data),
  createTipoDoc:    (data: any) => api.post('/documentos/tipos-documento/', data).then(r => r.data),
  updateTipoDoc:    (id: number, data: any) => api.patch(`/documentos/tipos-documento/${id}/`, data).then(r => r.data),
  getTiposTramite:  () => api.get('/tramites/tipos-tramite/?todos=true').then(r => r.data?.results ?? r.data),
  createTipoTramite: (data: any) => api.post('/tramites/tipos-tramite/', data).then(r => r.data),
  updateTipoTramite: (id: number, data: any) => api.patch(`/tramites/tipos-tramite/${id}/`, data).then(r => r.data),
  getSeries:        () => api.get('/archivo/series/?todos=true').then(r => r.data?.results ?? r.data),
  updateSerie:      (id: number, data: any) => api.patch(`/archivo/series/${id}/`, data).then(r => r.data),
}

function useTheme() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 6 }
  return { T, inputStyle, labelStyle }
}

function SaveBar({ onSave, loading, saved }: { onSave: () => void; loading: boolean; saved: boolean }) {
  const { T } = useTheme()
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: `0.5px solid ${T.rowBd}`, marginTop: 24 }}>
      <button onClick={onSave} disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: loading ? '#94a3b8' : T.accentDk, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? <RefreshCw size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
        {loading ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
      </button>
    </div>
  )
}

function TabInstitucion() {
  const { T, inputStyle, labelStyle } = useTheme()
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)
  const { data: config, isLoading } = useQuery({ queryKey: ['config-sistema'], queryFn: ajustesService.getConfig })
  const [form, setForm] = useState<Record<string, any>>({})
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: (data: any) => ajustesService.updateConfig(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config-sistema'] }); setSaved(true); setTimeout(() => setSaved(false), 3000) },
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40, color: T.rowSub, fontSize: 12 }}>Cargando...</div>
  const val = (k: string) => form[k] !== undefined ? form[k] : (config?.[k] ?? '')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="col-span-2">
          <label style={labelStyle}>Nombre de la institución</label>
          <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={val('nombre_institucion')} onChange={e => set('nombre_institucion', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Siglas</label>
          <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="GAD COTOPAXI" value={val('siglas_institucion')} onChange={e => set('siglas_institucion', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>RUC institucional</label>
          <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="0560001510001" value={val('ruc_institucion')} onChange={e => set('ruc_institucion', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label style={labelStyle}>Dirección</label>
          <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="Latacunga, Ecuador" value={val('direccion')} onChange={e => set('direccion', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Teléfono</label>
          <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="(03) 2800-XXX" value={val('telefono')} onChange={e => set('telefono', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Sitio web</label>
          <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="https://cotopaxi.gob.ec" value={val('sitio_web')} onChange={e => set('sitio_web', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Email institucional</label>
          <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} type="email" value={val('email_institucional')} onChange={e => set('email_institucional', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>URL del logo</label>
          <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="https://..." value={val('logo_url')} onChange={e => set('logo_url', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label style={labelStyle}>Pie de página para PDFs</label>
          <textarea className="w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none" style={inputStyle} rows={2} value={val('pie_pagina_pdf')} onChange={e => set('pie_pagina_pdf', e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 14, background: T.rowHv, borderRadius: 10, border: `0.5px solid ${T.rowBd}` }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.accentDk, marginBottom: 10 }}>Parámetros de numeración de documentos</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Formato de número</label>
            <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="{PREFIJO}-{NUM}-{SIGLAS}-{ANIO}" value={val('formato_numero')} onChange={e => set('formato_numero', e.target.value)} />
            <p style={{ fontSize: 10, color: T.rowSub, marginTop: 4 }}>Variables: {'{PREFIJO}'} {'{NUM}'} {'{SIGLAS}'} {'{ANIO}'}</p>
          </div>
          <div>
            <label style={labelStyle}>Días de alerta antes del vencimiento</label>
            <input type="number" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={val('dias_alerta_vencimiento')} onChange={e => set('dias_alerta_vencimiento', Number(e.target.value))} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={val('numeracion_por_anio') === true || val('numeracion_por_anio') === 'true'}
              onChange={e => set('numeracion_por_anio', e.target.checked)}
              style={{ width: 14, height: 14, accentColor: T.accentDk }} />
            <span style={{ fontSize: 12, color: T.rowTxt }}>Reiniciar numeración cada año</span>
          </label>
        </div>
      </div>

      <SaveBar onSave={() => mutation.mutate(form)} loading={mutation.isPending} saved={saved} />
    </div>
  )
}

function PanelSecuencialQuipux({ tipos, onActualizado }: { tipos: any[]; onActualizado: () => void }) {
  const { T } = useTheme()
  const [abierto, setAbierto]         = useState(false)
  const [anio, setAnio]               = useState(new Date().getFullYear())
  const [aplicando, setAplicando]     = useState<number | null>(null)

  const { data: secuenciales, isFetching, refetch } = useQuery({
    queryKey: ['quipux-secuenciales', anio],
    queryFn: () => quipuxService.secuenciales(anio),
    enabled: abierto, retry: false,
  })

  const aplicar = async (prefijo: string, ultimo: number) => {
    const tipo = tipos.find(t => t.prefijo_numeracion === prefijo)
    if (!tipo) return
    setAplicando(tipo.id)
    try { await api.patch(`/documentos/tipos-documento/${tipo.id}/`, { secuencial_inicial: ultimo }); onActualizado() }
    finally { setAplicando(null) }
  }

  return (
    <div style={{ marginTop: 20, border: `0.5px solid ${T.accentDk}30`, borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={() => { setAbierto(a => !a); if (!abierto) refetch() }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: T.rowHv, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: T.accentDk }}>
        <Link2 size={14} />
        Sincronizar secuenciales desde Quipux
        <ChevronRight size={13} style={{ marginLeft: 'auto', transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {abierto && (
        <div style={{ padding: '14px 16px', background: T.ctHdrBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: T.rowSub }}>Año:</span>
            <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))}
              style={{ width: 80, padding: '4px 8px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 6, outline: 'none', background: T.rowBg, color: T.rowTxt }} />
            <button onClick={() => refetch()}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', fontSize: 11, color: T.rowTxt }}>
              <RefreshCw size={11} /> Consultar
            </button>
            <span style={{ fontSize: 10, color: T.rowSub }}>Muestra el último número secuencial en Quipux por prefijo</span>
          </div>
          {isFetching ? (
            <p style={{ fontSize: 11, color: T.rowSub, padding: '8px 0' }}>Consultando base Quipux...</p>
          ) : !secuenciales ? null : secuenciales.length === 0 ? (
            <p style={{ fontSize: 11, color: T.rowSub }}>No se encontraron documentos Quipux para {anio}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {secuenciales.map(s => {
                const tipo = tipos.find(t => t.prefijo_numeracion === s.prefijo)
                const yaAplicado = tipo?.secuencial_inicial === s.ultimo_secuencial
                return (
                  <div key={`${s.prefijo}-${s.anio}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: T.rowHv, border: `0.5px solid ${T.rowBd}` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.accentDk, fontFamily: 'monospace', minWidth: 50 }}>{s.prefijo}</span>
                    <span style={{ fontSize: 11, color: T.rowSub }}>Último en Quipux {s.anio}:</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>{s.ultimo_secuencial.toLocaleString()}</span>
                    {tipo ? (
                      yaAplicado ? (
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#f0fdf4', color: '#15803d' }}>✓ Aplicado</span>
                      ) : (
                        <button onClick={() => aplicar(s.prefijo, s.ultimo_secuencial)} disabled={aplicando === tipo.id}
                          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: `0.5px solid ${T.accentDk}`, background: T.accentDk, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: aplicando === tipo.id ? .6 : 1 }}>
                          <Check size={10} /> Aplicar a {tipo.nombre}
                        </button>
                      )
                    ) : (
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: T.rowSub }}>Sin tipo SGD para este prefijo</span>
                    )}
                  </div>
                )
              })}
              <p style={{ fontSize: 10, color: T.rowSub, marginTop: 4 }}>
                Al aplicar, el próximo documento SGD de ese tipo en {anio} empezará desde el número siguiente al último en Quipux.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TabTiposDocumento() {
  const { T, inputStyle, labelStyle } = useTheme()
  const qc = useQueryClient()
  const [editando, setEditando] = useState<any>(null)
  const [nuevo, setNuevo]       = useState(false)
  const [form, setForm]         = useState<Record<string, any>>({})

  const { data: tipos, isLoading } = useQuery({ queryKey: ['tipos-doc-ajustes'], queryFn: ajustesService.getTiposDoc })

  const guardar = useMutation({
    mutationFn: (data: any) => editando ? ajustesService.updateTipoDoc(editando.id, data) : ajustesService.createTipoDoc(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tipos-doc-ajustes'] }); qc.invalidateQueries({ queryKey: ['tipos-doc'] }); setEditando(null); setNuevo(false); setForm({}) },
  })

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => ajustesService.updateTipoDoc(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-doc-ajustes'] }),
  })

  const abrirEdicion = (tipo: any) => { setEditando(tipo); setForm(tipo); setNuevo(false) }
  const abrirNuevo   = () => { setNuevo(true); setEditando(null); setForm({ activo: true, requiere_firma: false, requiere_aprobacion: false, dias_plazo_default: 15, orden: 99 }) }
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const PREFIJOS = ['OFI', 'MEM', 'CIR', 'RES', 'INF', 'CON', 'CER', 'ACT']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={abrirNuevo}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: T.accentDk, color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> Nuevo tipo de documento
        </button>
      </div>

      {(nuevo || editando) && (
        <div style={{ background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.accentDk, marginBottom: 12 }}>
            {nuevo ? 'Nuevo tipo de documento' : `Editando: ${editando.nombre}`}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Código</label>
              <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="Ej: OFI" value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label style={labelStyle}>Nombre</label>
              <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="Ej: Oficio" value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Prefijo numeración</label>
              <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={form.prefijo_numeracion ?? ''} onChange={e => set('prefijo_numeracion', e.target.value)}>
                <option value="">— Selecciona —</option>
                {PREFIJOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Días plazo por defecto</label>
              <input type="number" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={form.dias_plazo_default ?? 15} onChange={e => set('dias_plazo_default', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Orden en menú</label>
              <input type="number" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={form.orden ?? 99} onChange={e => set('orden', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Secuencial inicial (migración Quipux)</label>
              <input type="number" min={0} className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="0" value={form.secuencial_inicial ?? 0} onChange={e => set('secuencial_inicial', Number(e.target.value))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 20 }}>
              {[['requiere_firma', 'Requiere firma'], ['requiere_aprobacion', 'Requiere aprobación']].map(([k, l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: T.rowTxt }}>
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} style={{ width: 13, height: 13, accentColor: T.accentDk }} />
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => guardar.mutate(form)} disabled={guardar.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: T.accentDk, color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <Check size={13} /> {guardar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => { setEditando(null); setNuevo(false); setForm({}) }}
              style={{ padding: '7px 14px', borderRadius: 9, background: T.rowBg, color: T.rowSub, fontSize: 12, fontWeight: 500, border: `1px solid ${T.rowBd}`, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: T.rowSub, fontSize: 12 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(tipos ?? []).map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `0.5px solid ${T.rowBd}`, background: t.activo ? T.ctHdrBg : T.rowHv }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: t.activo ? '#e8f1fd' : T.rowHv, color: t.activo ? '#002f6c' : T.rowSub, fontFamily: 'monospace', minWidth: 40, textAlign: 'center' }}>
                {t.prefijo_numeracion}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: t.activo ? T.rowTxt : T.rowSub, margin: 0 }}>{t.nombre}</p>
                <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>
                  {t.dias_plazo_default} días · {t.requiere_firma ? '✓ Firma' : 'Sin firma'} · {t.requiere_aprobacion ? '✓ Aprobación' : 'Sin aprobación'} · Orden: {t.orden}
                  {t.secuencial_inicial > 0 && ` · Inicio Quipux: ${t.secuencial_inicial}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => abrirEdicion(t)}
                  style={{ padding: '5px 10px', borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', fontSize: 11, color: T.rowTxt, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit2 size={12} /> Editar
                </button>
                <button onClick={() => toggleActivo.mutate({ id: t.id, activo: !t.activo })}
                  style={{ padding: '5px 10px', borderRadius: 7, border: `0.5px solid ${t.activo ? '#fecaca' : '#86efac'}`, background: t.activo ? '#fef2f2' : '#f0fdf4', cursor: 'pointer', fontSize: 11, color: t.activo ? '#dc2626' : '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t.activo ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  {t.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PanelSecuencialQuipux tipos={tipos ?? []} onActualizado={() => qc.invalidateQueries({ queryKey: ['tipos-doc-ajustes'] })} />
    </div>
  )
}

function TabTiposTramite() {
  const { T, inputStyle, labelStyle } = useTheme()
  const qc = useQueryClient()
  const [editando, setEditando] = useState<any>(null)
  const [nuevo, setNuevo]       = useState(false)
  const [form, setForm]         = useState<Record<string, any>>({})

  const { data: tipos, isLoading } = useQuery({ queryKey: ['tipos-tramite-ajustes'], queryFn: ajustesService.getTiposTramite })

  const guardar = useMutation({
    mutationFn: (data: any) => editando ? ajustesService.updateTipoTramite(editando.id, data) : ajustesService.createTipoTramite(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tipos-tramite-ajustes'] }); setEditando(null); setNuevo(false); setForm({}) },
  })

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => ajustesService.updateTipoTramite(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-tramite-ajustes'] }),
  })

  const abrirEdicion = (t: any) => { setEditando(t); setForm(t); setNuevo(false) }
  const abrirNuevo   = () => { setNuevo(true); setEditando(null); setForm({ activo: true, dias_plazo: 15, costo: 0, requiere_inspeccion: false, en_linea: false }) }
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={abrirNuevo}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: T.accentDk, color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> Nuevo tipo de trámite
        </button>
      </div>

      {(nuevo || editando) && (
        <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#854f0b', marginBottom: 12 }}>
            {nuevo ? 'Nuevo tipo de trámite' : `Editando: ${editando.nombre}`}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Código</label>
              <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label style={labelStyle}>Descripción</label>
              <textarea className="w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none" style={inputStyle} rows={2} value={form.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Base legal</label>
              <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} placeholder="Ej: Art. 5 COOTAD" value={form.base_legal ?? ''} onChange={e => set('base_legal', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Días de plazo</label>
              <input type="number" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={form.dias_plazo ?? 15} onChange={e => set('dias_plazo', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Costo (USD)</label>
              <input type="number" step="0.01" className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={form.costo ?? 0} onChange={e => set('costo', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, paddingTop: 20 }}>
              {[['requiere_inspeccion', 'Requiere inspección'], ['en_linea', 'Disponible en línea']].map(([k, l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, color: T.rowTxt }}>
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} style={{ width: 13, height: 13, accentColor: T.accentDk }} />
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => guardar.mutate(form)} disabled={guardar.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: '#854f0b', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <Check size={13} /> {guardar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => { setEditando(null); setNuevo(false); setForm({}) }}
              style={{ padding: '7px 14px', borderRadius: 9, background: T.rowBg, color: T.rowSub, fontSize: 12, fontWeight: 500, border: `1px solid ${T.rowBd}`, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: T.rowSub, fontSize: 12 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(tipos ?? []).map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `0.5px solid ${T.rowBd}`, background: t.activo ? T.ctHdrBg : T.rowHv }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: t.activo ? T.rowTxt : T.rowSub, margin: 0 }}>{t.nombre}</p>
                <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>
                  {t.dias_plazo} días · ${t.costo}
                  {t.requiere_inspeccion ? ' · Inspección' : ''}
                  {t.en_linea ? ' · En línea' : ''}
                  {t.base_legal ? ` · ${t.base_legal}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => abrirEdicion(t)}
                  style={{ padding: '5px 10px', borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', fontSize: 11, color: T.rowTxt, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit2 size={12} /> Editar
                </button>
                <button onClick={() => toggleActivo.mutate({ id: t.id, activo: !t.activo })}
                  style={{ padding: '5px 10px', borderRadius: 7, border: `0.5px solid ${t.activo ? '#fecaca' : '#86efac'}`, background: t.activo ? '#fef2f2' : '#f0fdf4', cursor: 'pointer', fontSize: 11, color: t.activo ? '#dc2626' : '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TabEmail() {
  const { T, inputStyle } = useTheme()
  const [emailPrueba, setEmailPrueba] = useState('')
  const [resultado, setResultado]     = useState<{ ok: boolean; msg: string } | null>(null)

  const testEmail = useMutation({
    mutationFn: () => ajustesService.testEmail(emailPrueba),
    onSuccess: (data) => setResultado({ ok: true, msg: data.detail }),
    onError: (e: any) => setResultado({ ok: false, msg: e?.response?.data?.detail ?? 'Error al enviar' }),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.accentDk, marginBottom: 12 }}>Configuración SMTP actual (desde .env)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Host SMTP',   value: 'smtp.cotopaxi.gob.ec' },
            { label: 'Puerto',      value: '587 (TLS)' },
            { label: 'Usuario',     value: 'sgd@cotopaxi.gob.ec' },
            { label: 'Remitente',   value: 'SGD GAD Cotopaxi <sgd@cotopaxi.gob.ec>' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: T.ctHdrBg, borderRadius: 8, padding: '8px 10px', border: `0.5px solid ${T.rowBd}` }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: 12, color: T.rowTxt, margin: 0, fontFamily: 'monospace' }}>{value}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10, color: T.rowSub, marginTop: 10 }}>
          Para cambiar la contraseña SMTP, edita el archivo <code style={{ background: T.rowHv, padding: '1px 4px', borderRadius: 3, color: T.rowTxt }}>.env</code> en la raíz del proyecto y reinicia el backend.
        </p>
      </div>

      <div style={{ background: T.ctHdrBg, border: `0.5px solid ${T.rowBd}`, borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.rowTxt, marginBottom: 12 }}>Prueba de envío de correo</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="flex-1 px-3 py-2.5 text-sm rounded-xl outline-none" style={{ ...inputStyle, flex: 1 }}
            type="email" placeholder="Ingresa un email para la prueba"
            value={emailPrueba} onChange={e => setEmailPrueba(e.target.value)} />
          <button onClick={() => testEmail.mutate()} disabled={!emailPrueba || testEmail.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: !emailPrueba || testEmail.isPending ? '#94a3b8' : T.accentDk, color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: !emailPrueba ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
            <Send size={13} /> {testEmail.isPending ? 'Enviando...' : 'Enviar prueba'}
          </button>
        </div>
        {resultado && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: resultado.ok ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${resultado.ok ? '#86efac' : '#fecaca'}` }}>
            {resultado.ok ? <CheckCircle2 size={14} style={{ color: '#15803d' }} /> : <AlertCircle size={14} style={{ color: '#dc2626' }} />}
            <span style={{ fontSize: 12, color: resultado.ok ? '#15803d' : '#dc2626' }}>{resultado.msg}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function TabSeriesRegla() {
  const { T, inputStyle, labelStyle } = useTheme()
  const qc = useQueryClient()
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm]         = useState<Record<string, any>>({})

  const { data: series, isLoading } = useQuery({ queryKey: ['series-ajustes'], queryFn: ajustesService.getSeries })

  const guardar = useMutation({
    mutationFn: (data: any) => ajustesService.updateSerie(editando.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['series-ajustes'] }); setEditando(null); setForm({}) },
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const val = (k: string) => form[k] !== undefined ? form[k] : (editando?.[k] ?? '')
  const setAnos = (k: string, v: string) => {
    if (v === '') { set(k, null); return }
    const n = Number(v)
    set(k, Number.isFinite(n) ? Math.max(0, n) : null)
  }
  const permanente = !!val('conservacion_permanente')
  const setPermanente = (checked: boolean) => {
    set('conservacion_permanente', checked)
    if (checked) set('disposicion_final', 'conservacion')
    set('anos_gestion', null)
    set('anos_central', null)
  }

  return (
    <div>
      <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>Regla Técnica Nacional — Art. 46</p>
        <p style={{ fontSize: 11, color: '#166534' }}>
          Los plazos de conservación definen cuántos años permanece cada serie en Archivo de Gestión antes de transferirse al Archivo Central, y la disposición final al cumplirse el plazo total.
        </p>
      </div>

      {editando && (
        <div style={{ background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.accentDk, marginBottom: 12 }}>Editando: {editando.nombre}</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T.rowTxt }}>
            <input type="checkbox" checked={permanente} onChange={e => setPermanente(e.target.checked)}
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: T.accentDk }} />
            Conservación permanente
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Años en Archivo de Gestión</label>
              <input type="number" min={0} disabled={permanente}
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={{ ...inputStyle, ...(permanente ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                value={val('anos_gestion')} onChange={e => setAnos('anos_gestion', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Años en Archivo Central (acumulado)</label>
              <input type="number" min={0} disabled={permanente}
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={{ ...inputStyle, ...(permanente ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                value={val('anos_central')} onChange={e => setAnos('anos_central', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Disposición final</label>
              <select disabled={permanente}
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={{ ...inputStyle, ...(permanente ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                value={val('disposicion_final')} onChange={e => set('disposicion_final', e.target.value)}>
                <option value="conservacion">Conservación permanente</option>
                <option value="eliminacion">Eliminación</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Técnica de selección</label>
              <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={val('tecnica_seleccion')} onChange={e => set('tecnica_seleccion', e.target.value)}>
                <option value="completa">Conservación completa</option>
                <option value="parcial">Conservación parcial / muestreo</option>
                <option value="na">No aplica</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Base legal</label>
              <textarea className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={{ ...inputStyle, resize: 'none' }} rows={2} placeholder="Ej: Art. 47 COOTAD" value={val('base_legal')} onChange={e => set('base_legal', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Condición de acceso</label>
              <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle} value={val('condicion_acceso')} onChange={e => set('condicion_acceso', e.target.value)}>
                <option value="publico">Público</option>
                <option value="confidencial">Confidencial</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => guardar.mutate(form)} disabled={guardar.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: T.accentDk, color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <Check size={13} /> {guardar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => { setEditando(null); setForm({}) }}
              style={{ padding: '7px 14px', borderRadius: 9, background: T.rowBg, color: T.rowSub, fontSize: 12, fontWeight: 500, border: `1px solid ${T.rowBd}`, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: T.rowSub, fontSize: 12 }}>Cargando series...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(series ?? []).map((s: any) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `0.5px solid ${T.rowBd}`, background: T.ctHdrBg }}
              onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
              onMouseLeave={e => (e.currentTarget.style.background = T.ctHdrBg)}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: '#f0fdf4', color: '#15803d', fontFamily: 'monospace', flexShrink: 0 }}>
                {s.codigo}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre}</p>
                <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>
                  {s.conservacion_permanente ? 'Sin plazo (permanente)' : `Gestión: ${s.anos_gestion} años · Central: ${s.anos_central} años`} · {s.disposicion_final === 'conservacion' ? '∞ Conservación' : '🗑 Eliminación'} · {s.condicion_acceso}
                </p>
              </div>
              <button onClick={() => { setEditando(s); setForm({}) }}
                style={{ padding: '5px 10px', borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', fontSize: 11, color: T.rowTxt, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <Edit2 size={12} /> Editar plazos
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TABS = [
  { key: 'institucion',   label: 'Institución',             icon: Building2    },
  { key: 'tipos-doc',     label: 'Tipos de documento',      icon: FileText     },
  { key: 'tipos-tramite', label: 'Tipos de trámite',        icon: ClipboardList },
  { key: 'email',         label: 'Email SMTP',              icon: Mail         },
  { key: 'series',        label: 'Series y Regla Técnica',  icon: Archive      },
]

export default function AjustesPage() {
  const { T } = useTheme()
  const [tab, setTab] = useState('institucion')
  const tabActual = TABS.find(t => t.key === tab)!

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: T.rowTxt, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={18} style={{ color: T.accentDk }} /> Ajustes del sistema
        </h1>
        <p style={{ fontSize: 12, color: T.rowSub, marginTop: 4 }}>
          Configuración institucional, tipos de documento, trámites, email y Regla Técnica Nacional
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ background: T.ctHdrBg, borderRadius: 14, border: `0.5px solid ${T.rowBd}`, overflow: 'hidden' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                padding: '11px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: tab === key ? T.rowSel : 'transparent',
                borderLeft: `2px solid ${tab === key ? T.accentDk : 'transparent'}`,
                borderBottom: `0.5px solid ${T.rowBd}`,
                transition: 'all .1s',
              }}
              onMouseEnter={e => { if (tab !== key) e.currentTarget.style.background = T.rowHv }}
              onMouseLeave={e => { if (tab !== key) e.currentTarget.style.background = 'transparent' }}>
              <Icon size={14} style={{ color: tab === key ? T.accentDk : T.rowSub, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: tab === key ? 600 : 400, color: tab === key ? T.accentDk : T.rowTxt, lineHeight: 1.3 }}>
                {label}
              </span>
              {tab === key && <ChevronRight size={12} style={{ color: T.accentDk, marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>

        <div style={{ background: T.ctHdrBg, borderRadius: 14, border: `0.5px solid ${T.rowBd}`, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: `0.5px solid ${T.rowBd}` }}>
            <tabActual.icon size={16} style={{ color: T.accentDk }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: T.rowTxt, margin: 0 }}>{tabActual.label}</h2>
          </div>
          {tab === 'institucion'   && <TabInstitucion />}
          {tab === 'tipos-doc'     && <TabTiposDocumento />}
          {tab === 'tipos-tramite' && <TabTiposTramite />}
          {tab === 'email'         && <TabEmail />}
          {tab === 'series'        && <TabSeriesRegla />}
        </div>
      </div>
    </div>
  )
}
