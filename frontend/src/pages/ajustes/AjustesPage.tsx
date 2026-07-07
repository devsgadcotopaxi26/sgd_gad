import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { quipuxService } from '@/services/quipux.service'
import {
  Building2, FileText, ClipboardList, Mail,
  Archive, Save, Plus, Edit2, Check,
  AlertCircle, CheckCircle2, Send, ToggleLeft, ToggleRight,
  Settings, RefreshCw, ChevronRight, Link2
} from 'lucide-react'

// ── Servicios ──────────────────────────────────────────────────────────

const ajustesService = {
  getConfig: () => api.get('/configuracion/').then(r => r.data),
  updateConfig: (data: any) => api.patch('/configuracion/', data).then(r => r.data),
  testEmail: (email: string) => api.post('/configuracion/test-email/', { email }).then(r => r.data),
  getTiposDoc: () => api.get('/documentos/tipos-documento/?todos=true').then(r => r.data?.results ?? r.data),
  createTipoDoc: (data: any) => api.post('/documentos/tipos-documento/', data).then(r => r.data),
  updateTipoDoc: (id: number, data: any) => api.patch(`/documentos/tipos-documento/${id}/`, data).then(r => r.data),
  getTiposTramite: () => api.get('/tramites/tipos-tramite/?todos=true').then(r => r.data?.results ?? r.data),
  createTipoTramite: (data: any) => api.post('/tramites/tipos-tramite/', data).then(r => r.data),
  updateTipoTramite: (id: number, data: any) => api.patch(`/tramites/tipos-tramite/${id}/`, data).then(r => r.data),
  getSeries: () => api.get('/archivo/series/?todos=true').then(r => r.data?.results ?? r.data),
  updateSerie: (id: number, data: any) => api.patch(`/archivo/series/${id}/`, data).then(r => r.data),
}

// ── Componentes auxiliares ────────────────────────────────────────────

const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"
const clsLabel = "block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5"

function SaveBar({ onSave, loading, saved }: { onSave: () => void; loading: boolean; saved: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '0.5px solid #f0f0f0', marginTop: 24 }}>
      <button onClick={onSave} disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: loading ? '#94a3b8' : '#002f6c', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? <RefreshCw size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
        {loading ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
      </button>
    </div>
  )
}

// ── Tab 1: Institución ────────────────────────────────────────────────

function TabInstitucion() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: config, isLoading } = useQuery({
    queryKey: ['config-sistema'],
    queryFn: ajustesService.getConfig,
  })

  const [form, setForm] = useState<Record<string, any>>({})
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: (data: any) => ajustesService.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-sistema'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 12 }}>Cargando...</div>

  const val = (k: string) => form[k] !== undefined ? form[k] : (config?.[k] ?? '')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="col-span-2">
          <label className={clsLabel}>Nombre de la institución</label>
          <input className={cls} value={val('nombre_institucion')} onChange={e => set('nombre_institucion', e.target.value)} />
        </div>
        <div>
          <label className={clsLabel}>Siglas</label>
          <input className={cls} placeholder="GAD COTOPAXI" value={val('siglas_institucion')} onChange={e => set('siglas_institucion', e.target.value)} />
        </div>
        <div>
          <label className={clsLabel}>RUC institucional</label>
          <input className={cls} placeholder="0560001510001" value={val('ruc_institucion')} onChange={e => set('ruc_institucion', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={clsLabel}>Dirección</label>
          <input className={cls} placeholder="Latacunga, Ecuador" value={val('direccion')} onChange={e => set('direccion', e.target.value)} />
        </div>
        <div>
          <label className={clsLabel}>Teléfono</label>
          <input className={cls} placeholder="(03) 2800-XXX" value={val('telefono')} onChange={e => set('telefono', e.target.value)} />
        </div>
        <div>
          <label className={clsLabel}>Sitio web</label>
          <input className={cls} placeholder="https://cotopaxi.gob.ec" value={val('sitio_web')} onChange={e => set('sitio_web', e.target.value)} />
        </div>
        <div>
          <label className={clsLabel}>Email institucional</label>
          <input className={cls} type="email" value={val('email_institucional')} onChange={e => set('email_institucional', e.target.value)} />
        </div>
        <div>
          <label className={clsLabel}>URL del logo</label>
          <input className={cls} placeholder="https://..." value={val('logo_url')} onChange={e => set('logo_url', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={clsLabel}>Pie de página para PDFs</label>
          <textarea className={cls + ' resize-none'} rows={2} value={val('pie_pagina_pdf')} onChange={e => set('pie_pagina_pdf', e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 14, background: '#f8faff', borderRadius: 10, border: '0.5px solid #e5e7eb' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#002f6c', marginBottom: 10 }}>Parámetros de numeración de documentos</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className={clsLabel}>Formato de número</label>
            <input className={cls} placeholder="{PREFIJO}-{NUM}-{SIGLAS}-{ANIO}" value={val('formato_numero')} onChange={e => set('formato_numero', e.target.value)} />
            <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Variables: {'{PREFIJO}'} {'{NUM}'} {'{SIGLAS}'} {'{ANIO}'}</p>
          </div>
          <div>
            <label className={clsLabel}>Días de alerta antes del vencimiento</label>
            <input type="number" className={cls} value={val('dias_alerta_vencimiento')} onChange={e => set('dias_alerta_vencimiento', Number(e.target.value))} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={val('numeracion_por_anio') === true || val('numeracion_por_anio') === 'true'}
              onChange={e => set('numeracion_por_anio', e.target.checked)}
              style={{ width: 14, height: 14, accentColor: '#002f6c' }} />
            <span style={{ fontSize: 12, color: '#374151' }}>Reiniciar numeración cada año</span>
          </label>
        </div>
      </div>

      <SaveBar onSave={() => mutation.mutate(form)} loading={mutation.isPending} saved={saved} />
    </div>
  )
}

// ── Panel de sincronización secuencial con Quipux ─────────────────────

function PanelSecuencialQuipux({ tipos, onActualizado }: { tipos: any[]; onActualizado: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [aplicando, setAplicando] = useState<number | null>(null)

  const { data: secuenciales, isFetching, refetch } = useQuery({
    queryKey: ['quipux-secuenciales', anio],
    queryFn: () => quipuxService.secuenciales(anio),
    enabled: abierto,
    retry: false,
  })

  const aplicar = async (prefijo: string, ultimo: number) => {
    const tipo = tipos.find(t => t.prefijo_numeracion === prefijo)
    if (!tipo) return
    setAplicando(tipo.id)
    try {
      await api.patch(`/documentos/tipos-documento/${tipo.id}/`, { secuencial_inicial: ultimo })
      onActualizado()
    } finally {
      setAplicando(null)
    }
  }

  return (
    <div style={{ marginTop: 20, border: '0.5px solid #c7d9f5', borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={() => { setAbierto(a => !a); if (!abierto) refetch() }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f0f5ff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#002f6c' }}>
        <Link2 size={14} />
        Sincronizar secuenciales desde Quipux
        <ChevronRight size={13} style={{ marginLeft: 'auto', transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {abierto && (
        <div style={{ padding: '14px 16px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Año:</span>
            <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))}
              style={{ width: 80, padding: '4px 8px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none' }} />
            <button onClick={() => refetch()}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: 11, color: '#374151' }}>
              <RefreshCw size={11} /> Consultar
            </button>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>Muestra el último número secuencial en Quipux por prefijo</span>
          </div>
          {isFetching ? (
            <p style={{ fontSize: 11, color: '#9ca3af', padding: '8px 0' }}>Consultando base Quipux...</p>
          ) : !secuenciales ? null : secuenciales.length === 0 ? (
            <p style={{ fontSize: 11, color: '#9ca3af' }}>No se encontraron documentos Quipux para {anio}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {secuenciales.map(s => {
                const tipo = tipos.find(t => t.prefijo_numeracion === s.prefijo)
                const yaAplicado = tipo?.secuencial_inicial === s.ultimo_secuencial
                return (
                  <div key={`${s.prefijo}-${s.anio}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#f8faff', border: '0.5px solid #e8f1fd' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#002f6c', fontFamily: 'monospace', minWidth: 50 }}>{s.prefijo}</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>Último en Quipux {s.anio}:</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0a1628' }}>{s.ultimo_secuencial.toLocaleString()}</span>
                    {tipo ? (
                      yaAplicado ? (
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#f0fdf4', color: '#15803d' }}>✓ Aplicado</span>
                      ) : (
                        <button onClick={() => aplicar(s.prefijo, s.ultimo_secuencial)} disabled={aplicando === tipo.id}
                          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #002f6c', background: '#002f6c', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: aplicando === tipo.id ? .6 : 1 }}>
                          <Check size={10} /> Aplicar a {tipo.nombre}
                        </button>
                      )
                    ) : (
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>Sin tipo SGD para este prefijo</span>
                    )}
                  </div>
                )
              })}
              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                Al aplicar, el próximo documento SGD de ese tipo en {anio} empezará desde el número siguiente al último en Quipux.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab 2: Tipos de Documento ─────────────────────────────────────────

function TabTiposDocumento() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<any>(null)
  const [nuevo, setNuevo]       = useState(false)
  const [form, setForm]         = useState<Record<string, any>>({})

  const { data: tipos, isLoading } = useQuery({
    queryKey: ['tipos-doc-ajustes'],
    queryFn: ajustesService.getTiposDoc,
  })

  const guardar = useMutation({
    mutationFn: (data: any) => editando
      ? ajustesService.updateTipoDoc(editando.id, data)
      : ajustesService.createTipoDoc(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tipos-doc-ajustes'] })
      qc.invalidateQueries({ queryKey: ['tipos-doc'] })
      setEditando(null); setNuevo(false); setForm({})
    },
  })

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      ajustesService.updateTipoDoc(id, { activo }),
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
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#002f6c', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> Nuevo tipo de documento
        </button>
      </div>

      {(nuevo || editando) && (
        <div style={{ background: '#f8faff', border: '0.5px solid #c7d9f5', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#002f6c', marginBottom: 12 }}>
            {nuevo ? 'Nuevo tipo de documento' : `Editando: ${editando.nombre}`}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label className={clsLabel}>Código</label>
              <input className={cls} placeholder="Ej: OFI" value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className={clsLabel}>Nombre</label>
              <input className={cls} placeholder="Ej: Oficio" value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div>
              <label className={clsLabel}>Prefijo numeración</label>
              <select className={cls} value={form.prefijo_numeracion ?? ''} onChange={e => set('prefijo_numeracion', e.target.value)}>
                <option value="">— Selecciona —</option>
                {PREFIJOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={clsLabel}>Días plazo por defecto</label>
              <input type="number" className={cls} value={form.dias_plazo_default ?? 15} onChange={e => set('dias_plazo_default', Number(e.target.value))} />
            </div>
            <div>
              <label className={clsLabel}>Orden en menú</label>
              <input type="number" className={cls} value={form.orden ?? 99} onChange={e => set('orden', Number(e.target.value))} />
            </div>
            <div>
              <label className={clsLabel}>Secuencial inicial (migración Quipux)</label>
              <input type="number" min={0} className={cls} placeholder="0" value={form.secuencial_inicial ?? 0} onChange={e => set('secuencial_inicial', Number(e.target.value))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 20 }}>
              {[['requiere_firma', 'Requiere firma'], ['requiere_aprobacion', 'Requiere aprobación']].map(([k, l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} style={{ width: 13, height: 13, accentColor: '#002f6c' }} />
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => guardar.mutate(form)} disabled={guardar.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: '#002f6c', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <Check size={13} /> {guardar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => { setEditando(null); setNuevo(false); setForm({}) }}
              style={{ padding: '7px 14px', borderRadius: 9, background: '#f3f4f6', color: '#6b7280', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 12 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(tipos ?? []).map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '0.5px solid #f0f0f0', background: t.activo ? '#fff' : '#f9fafb' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: t.activo ? '#e8f1fd' : '#f3f4f6', color: t.activo ? '#002f6c' : '#9ca3af', fontFamily: 'monospace', minWidth: 40, textAlign: 'center' }}>
                {t.prefijo_numeracion}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: t.activo ? '#0a1628' : '#9ca3af', margin: 0 }}>{t.nombre}</p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>
                  {t.dias_plazo_default} días · {t.requiere_firma ? '✓ Firma' : 'Sin firma'} · {t.requiere_aprobacion ? '✓ Aprobación' : 'Sin aprobación'} · Orden: {t.orden}
                  {t.secuencial_inicial > 0 && ` · Inicio Quipux: ${t.secuencial_inicial}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => abrirEdicion(t)}
                  style={{ padding: '5px 10px', borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
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

      {/* ── Panel de sincronización con Quipux ── */}
      <PanelSecuencialQuipux tipos={tipos ?? []} onActualizado={() => qc.invalidateQueries({ queryKey: ['tipos-doc-ajustes'] })} />
    </div>
  )
}

// ── Tab 3: Tipos de Trámite ───────────────────────────────────────────

function TabTiposTramite() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<any>(null)
  const [nuevo, setNuevo]       = useState(false)
  const [form, setForm]         = useState<Record<string, any>>({})

  const { data: tipos, isLoading } = useQuery({
    queryKey: ['tipos-tramite-ajustes'],
    queryFn: ajustesService.getTiposTramite,
  })

  const { data: categorias } = useQuery({
    queryKey: ['categorias-tramite'],
    queryFn: () => api.get('/tramites/categorias/').then(r => r.data?.results ?? r.data).catch(() => []),
  })

  const guardar = useMutation({
    mutationFn: (data: any) => editando
      ? ajustesService.updateTipoTramite(editando.id, data)
      : ajustesService.createTipoTramite(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tipos-tramite-ajustes'] })
      setEditando(null); setNuevo(false); setForm({})
    },
  })

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      ajustesService.updateTipoTramite(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tipos-tramite-ajustes'] }),
  })

  const abrirEdicion = (t: any) => { setEditando(t); setForm(t); setNuevo(false) }
  const abrirNuevo   = () => { setNuevo(true); setEditando(null); setForm({ activo: true, dias_plazo: 15, costo: 0, requiere_inspeccion: false, en_linea: false }) }
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={abrirNuevo}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#002f6c', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
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
              <label className={clsLabel}>Código</label>
              <input className={cls} value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className={clsLabel}>Nombre *</label>
              <input className={cls} value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={clsLabel}>Descripción</label>
              <textarea className={cls + ' resize-none'} rows={2} value={form.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)} />
            </div>
            <div>
              <label className={clsLabel}>Base legal</label>
              <input className={cls} placeholder="Ej: Art. 5 COOTAD" value={form.base_legal ?? ''} onChange={e => set('base_legal', e.target.value)} />
            </div>
            <div>
              <label className={clsLabel}>Días de plazo</label>
              <input type="number" className={cls} value={form.dias_plazo ?? 15} onChange={e => set('dias_plazo', Number(e.target.value))} />
            </div>
            <div>
              <label className={clsLabel}>Costo (USD)</label>
              <input type="number" step="0.01" className={cls} value={form.costo ?? 0} onChange={e => set('costo', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, paddingTop: 20 }}>
              {[['requiere_inspeccion', 'Requiere inspección'], ['en_linea', 'Disponible en línea']].map(([k, l]) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} style={{ width: 13, height: 13, accentColor: '#002f6c' }} />
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
              style={{ padding: '7px 14px', borderRadius: 9, background: '#f3f4f6', color: '#6b7280', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 12 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(tipos ?? []).map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '0.5px solid #f0f0f0', background: t.activo ? '#fff' : '#f9fafb' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: t.activo ? '#0a1628' : '#9ca3af', margin: 0 }}>{t.nombre}</p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>
                  {t.dias_plazo} días · ${t.costo}
                  {t.requiere_inspeccion ? ' · Inspección' : ''}
                  {t.en_linea ? ' · En línea' : ''}
                  {t.base_legal ? ` · ${t.base_legal}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => abrirEdicion(t)}
                  style={{ padding: '5px 10px', borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
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

// ── Tab 4: Email SMTP ─────────────────────────────────────────────────

function TabEmail() {
  const [emailPrueba, setEmailPrueba] = useState('')
  const [resultado, setResultado]     = useState<{ ok: boolean; msg: string } | null>(null)

  const testEmail = useMutation({
    mutationFn: () => ajustesService.testEmail(emailPrueba),
    onSuccess: (data) => setResultado({ ok: true, msg: data.detail }),
    onError: (e: any) => setResultado({ ok: false, msg: e?.response?.data?.detail ?? 'Error al enviar' }),
  })

  return (
    <div className="space-y-6">
      <div style={{ background: '#f8faff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#002f6c', marginBottom: 12 }}>Configuración SMTP actual (desde .env)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Host SMTP', value: 'smtp.cotopaxi.gob.ec' },
            { label: 'Puerto', value: '587 (TLS)' },
            { label: 'Usuario', value: 'sgd@cotopaxi.gob.ec' },
            { label: 'Remitente', value: 'SGD GAD Cotopaxi <sgd@cotopaxi.gob.ec>' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '0.5px solid #f0f0f0' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: 12, color: '#374151', margin: 0, fontFamily: 'monospace' }}>{value}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 10 }}>
          Para cambiar la contraseña SMTP, edita el archivo <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>.env</code> en la raíz del proyecto y reinicia el backend.
        </p>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Prueba de envío de correo</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className={cls} type="email" placeholder="Ingresa un email para la prueba"
            value={emailPrueba} onChange={e => setEmailPrueba(e.target.value)} style={{ flex: 1 }} />
          <button onClick={() => testEmail.mutate()} disabled={!emailPrueba || testEmail.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: !emailPrueba || testEmail.isPending ? '#94a3b8' : '#002f6c', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: !emailPrueba ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
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

// ── Tab 5: Series y Regla Técnica ─────────────────────────────────────

function TabSeriesRegla() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm]         = useState<Record<string, any>>({})

  const { data: series, isLoading } = useQuery({
    queryKey: ['series-ajustes'],
    queryFn: ajustesService.getSeries,
  })

  const guardar = useMutation({
    mutationFn: (data: any) => ajustesService.updateSerie(editando.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['series-ajustes'] })
      setEditando(null); setForm({})
    },
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const val = (k: string) => form[k] !== undefined ? form[k] : (editando?.[k] ?? '')

  return (
    <div>
      <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>Regla Técnica Nacional — Art. 46</p>
        <p style={{ fontSize: 11, color: '#166534' }}>
          Los plazos de conservación definen cuántos años permanece cada serie en Archivo de Gestión antes de transferirse al Archivo Central, y la disposición final al cumplirse el plazo total.
        </p>
      </div>

      {editando && (
        <div style={{ background: '#f8faff', border: '0.5px solid #c7d9f5', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#002f6c', marginBottom: 12 }}>Editando: {editando.nombre}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label className={clsLabel}>Años en Archivo de Gestión</label>
              <input type="number" className={cls} value={val('anos_gestion')} onChange={e => set('anos_gestion', Number(e.target.value))} />
            </div>
            <div>
              <label className={clsLabel}>Años en Archivo Central (acumulado)</label>
              <input type="number" className={cls} value={val('anos_central')} onChange={e => set('anos_central', Number(e.target.value))} />
            </div>
            <div>
              <label className={clsLabel}>Disposición final</label>
              <select className={cls} value={val('disposicion_final')} onChange={e => set('disposicion_final', e.target.value)}>
                <option value="conservacion">Conservación permanente</option>
                <option value="eliminacion">Eliminación</option>
              </select>
            </div>
            <div>
              <label className={clsLabel}>Técnica de selección</label>
              <select className={cls} value={val('tecnica_seleccion')} onChange={e => set('tecnica_seleccion', e.target.value)}>
                <option value="completa">Conservación completa</option>
                <option value="parcial">Conservación parcial / muestreo</option>
                <option value="na">No aplica</option>
              </select>
            </div>
            <div>
              <label className={clsLabel}>Base legal</label>
              <input className={cls} placeholder="Ej: Art. 47 COOTAD" value={val('base_legal')} onChange={e => set('base_legal', e.target.value)} />
            </div>
            <div>
              <label className={clsLabel}>Condición de acceso</label>
              <select className={cls} value={val('condicion_acceso')} onChange={e => set('condicion_acceso', e.target.value)}>
                <option value="publico">Público</option>
                <option value="confidencial">Confidencial</option>
                <option value="reservado">Reservado</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => guardar.mutate(form)} disabled={guardar.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: '#002f6c', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <Check size={13} /> {guardar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => { setEditando(null); setForm({}) }}
              style={{ padding: '7px 14px', borderRadius: 9, background: '#f3f4f6', color: '#6b7280', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 12 }}>Cargando series...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(series ?? []).map((s: any) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '0.5px solid #f0f0f0', background: '#fff' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: '#f0fdf4', color: '#15803d', fontFamily: 'monospace', flexShrink: 0 }}>
                {s.codigo}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0a1628', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre}</p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>
                  Gestión: {s.anos_gestion} años · Central: {s.anos_central} años · {s.disposicion_final === 'conservacion' ? '∞ Conservación' : '🗑 Eliminación'} · {s.condicion_acceso}
                </p>
              </div>
              <button onClick={() => { setEditando(s); setForm({}) }}
                style={{ padding: '5px 10px', borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#374151', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <Edit2 size={12} /> Editar plazos
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────

const TABS = [
  { key: 'institucion',   label: 'Institución',          icon: Building2    },
  { key: 'tipos-doc',     label: 'Tipos de documento',   icon: FileText     },
  { key: 'tipos-tramite', label: 'Tipos de trámite',     icon: ClipboardList },
  { key: 'email',         label: 'Email SMTP',           icon: Mail         },
  { key: 'series',        label: 'Series y Regla Técnica', icon: Archive    },
]

export default function AjustesPage() {
  const [tab, setTab] = useState('institucion')
  const tabActual = TABS.find(t => t.key === tab)!

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={18} style={{ color: '#002f6c' }} /> Ajustes del sistema
        </h1>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          Configuración institucional, tipos de documento, trámites, email y Regla Técnica Nacional
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Sidebar de tabs */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                padding: '11px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: tab === key ? '#e8f1fd' : 'transparent',
                borderLeft: `2px solid ${tab === key ? '#002f6c' : 'transparent'}`,
                borderBottom: '0.5px solid #f5f5f5',
                transition: 'all .1s',
              }}>
              <Icon size={14} style={{ color: tab === key ? '#002f6c' : '#9ca3af', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: tab === key ? 600 : 400, color: tab === key ? '#002f6c' : '#4b5563', lineHeight: 1.3 }}>
                {label}
              </span>
              {tab === key && <ChevronRight size={12} style={{ color: '#002f6c', marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>

        {/* Contenido del tab */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: '0.5px solid #f5f5f5' }}>
            <tabActual.icon size={16} style={{ color: '#002f6c' }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0a1628', margin: 0 }}>{tabActual.label}</h2>
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