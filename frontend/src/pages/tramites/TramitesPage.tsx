import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import { tramitesService, Tramite } from '@/services/tramites.service'
import { organizacionService } from '@/services/organizacion.service'
import AdjuntosPanel from '@/components/ui/AdjuntosPanel'
import VincularExpedienteModal from '@/components/ui/VincularExpedienteModal'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Search, Plus, X,
  Clock, CheckCircle, AlertTriangle,
  User, Building2, Calendar, ChevronRight, Archive, Settings
} from 'lucide-react'

const ESTADOS: Record<string, { bg: string; text: string; label: string }> = {
  ingresado:     { bg: '#f0f9ff', text: '#0369a1', label: 'Ingresado' },
  asignado:      { bg: '#faf5ff', text: '#7e22ce', label: 'Asignado' },
  en_proceso:    { bg: '#eff6ff', text: '#1d4ed8', label: 'En proceso' },
  en_inspeccion: { bg: '#fff7ed', text: '#c2410c', label: 'En inspección' },
  resuelto:      { bg: '#f0fdf4', text: '#15803d', label: 'Resuelto' },
  rechazado:     { bg: '#fef2f2', text: '#dc2626', label: 'Rechazado' },
  desistido:     { bg: '#f9fafb', text: '#6b7280', label: 'Desistido' },
  archivado:     { bg: '#f9fafb', text: '#6b7280', label: 'Archivado' },
}

const PRIORIDAD: Record<string, { color: string; label: string }> = {
  normal:      { color: '#9ca3af', label: 'Normal' },
  urgente:     { color: '#f59e0b', label: 'Urgente' },
  muy_urgente: { color: '#ef4444', label: 'Muy urgente' },
}

function DiasRestantes({ dias }: { dias: number | null }) {
  if (dias === null) return null
  if (dias < 0)   return <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Vencido {Math.abs(dias)}d</span>
  if (dias === 0) return <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>Vence hoy</span>
  if (dias <= 3)  return <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>{dias}d restantes</span>
  return <span style={{ fontSize: 12, color: '#9ca3af' }}>{dias}d restantes</span>
}

function ModalNuevoTramite({ onClose }: { onClose: () => void }) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const [paso, setPaso]                   = useState(1)
  const [cedula, setCedula]               = useState('')
  const [persona, setPersona]             = useState<any>(null)
  const [personaNueva, setPersonaNueva]   = useState(false)
  const [formPersona, setFormPersona]     = useState<Record<string, any>>({})
  const [formTramite, setFormTramite]     = useState<Record<string, any>>({ canal_ingreso: 'ventanilla', prioridad: 'normal' })
  const [error, setError]                 = useState('')
  const [buscando, setBuscando]           = useState(false)
  const [sugerencias, setSugerencias]     = useState<any[]>([])

  const { data: categorias } = useQuery({ queryKey: ['categorias'],      queryFn: tramitesService.categorias })
  const { data: unidades }   = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })
  const { data: tipos }      = useQuery({
    queryKey: ['tipos', formTramite.categoria],
    queryFn:  () => tramitesService.tipos({ categoria: formTramite.categoria }),
    enabled:  !!formTramite.categoria,
  })

  const crearMutation = useMutation({
    mutationFn: tramitesService.crear,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['tramites'] }); onClose() },
    onError:    (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al crear'),
  })

  const buscarPersona = async () => {
    if (!cedula.trim()) return
    setBuscando(true); setError('')
    try {
      const p = await tramitesService.buscarPersona(cedula)
      setPersona(p); setPersonaNueva(false)
    } catch {
      setPersonaNueva(true); setPersona(null)
      setFormPersona({ numero_identificacion: cedula })
    } finally { setBuscando(false) }
  }

  useEffect(() => {
    if (cedula.trim().length < 3 || persona) { setSugerencias([]); return }
    const timeout = setTimeout(async () => {
      try { setSugerencias(await tramitesService.buscarPersonas(cedula.trim())) }
      catch { setSugerencias([]) }
    }, 350)
    return () => clearTimeout(timeout)
  }, [cedula, persona])

  const handleSubmit = async () => {
    setError('')
    try {
      let personaId = persona?.id
      if (personaNueva) {
        try {
          const p = await tramitesService.crearPersona(formPersona)
          personaId = p.id
        } catch (e: any) {
          const yaExiste = e.response?.data?.numero_identificacion?.some((msg: string) => msg.toLowerCase().includes('ya existe'))
          if (yaExiste) {
            const existente = await tramitesService.buscarPersona(formPersona.numero_identificacion)
            personaId = existente.id
          } else throw e
        }
      }
      await crearMutation.mutateAsync({ ...formTramite, persona: personaId, unidad_receptora: formTramite.unidad_receptora, unidad_responsable: formTramite.unidad_responsable })
    } catch (e: any) {
      setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error al crear el trámite')
    }
  }

  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: T.rowSub, marginBottom: 6 }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 16, width: '100%', maxWidth: 672, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: `1px solid ${T.rowBd}` }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${T.rowBd}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8f1fd' }}>
              <ClipboardList size={15} style={{ color: '#002f6c' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>Ingresar nuevo trámite</h3>
              <p style={{ fontSize: 11, color: T.rowSub, margin: 0 }}>Paso {paso} de 3</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: `1px solid ${T.rowBd}` }}>
          {['Ciudadano', 'Tipo de trámite', 'Datos del trámite'].map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                  background: paso > i + 1 ? '#0f6e56' : paso === i + 1 ? T.accentDk : T.rowHv,
                  color: paso >= i + 1 ? '#fff' : T.rowSub }}>
                  {paso > i + 1 ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: paso === i + 1 ? T.accentDk : T.rowSub }}>{label}</span>
              </div>
              {i < 2 && <ChevronRight size={12} style={{ color: T.rowBd, margin: '0 8px', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          {paso === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Número de cédula / RUC</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="flex-1 px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                    placeholder="Ej: 0501234567" value={cedula}
                    onChange={e => { setCedula(e.target.value); setPersona(null); setPersonaNueva(false) }}
                    onKeyDown={e => e.key === 'Enter' && buscarPersona()} />
                  <button onClick={buscarPersona} disabled={buscando}
                    style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {buscando ? '...' : 'Buscar'}
                  </button>
                </div>
                {sugerencias.length > 0 && !persona && (
                  <div style={{ marginTop: 8, border: `1px solid ${T.rowBd}`, borderRadius: 12, overflow: 'hidden' }}>
                    {sugerencias.map(s => (
                      <div key={s.id} onClick={() => { setPersona(s); setPersonaNueva(false); setCedula(s.numero_identificacion); setSugerencias([]) }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${T.rowBd}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: T.rowTxt }}>{s.nombre_completo}</p>
                          <p style={{ fontSize: 12, color: T.rowSub }}>{s.numero_identificacion} · {s.email || 'Sin correo'}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: T.accentDk }}>Usar este registro</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {persona && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-800">
                      {persona.nombres[0]}{persona.apellidos[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">{persona.nombre_completo}</p>
                      <p className="text-xs text-green-700">{persona.numero_identificacion} · {persona.email}</p>
                    </div>
                    <CheckCircle size={18} className="text-green-600 ml-auto" />
                  </div>
                </div>
              )}
              {personaNueva && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs font-bold text-blue-800">Ciudadano no registrado — completa los datos:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[['nombres','Nombres *'],['apellidos','Apellidos *']].map(([k,l]) => (
                      <div key={k}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.rowSub, marginBottom: 4 }}>{l}</label>
                        <input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} placeholder={l.replace(' *','')}
                          onChange={e => setFormPersona(f => ({ ...f, [k]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[['email','Email','email'],['telefono_movil','Teléfono','tel']].map(([k,l,t]) => (
                      <div key={k}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.rowSub, marginBottom: 4 }}>{l}</label>
                        <input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} type={t === 'email' ? 'email' : 'text'}
                          onChange={e => setFormPersona(f => ({ ...f, [k]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.rowSub, marginBottom: 4 }}>Género</label>
                    <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle}
                      onChange={e => setFormPersona(f => ({ ...f, genero: e.target.value || undefined }))}>
                      <option value="">— Prefiere no indicar —</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {paso === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                  value={formTramite.categoria ?? ''}
                  onChange={e => setFormTramite(f => ({ ...f, categoria: e.target.value, tipo_tramite: '' }))}>
                  <option value="">— Selecciona una categoría —</option>
                  {categorias?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {formTramite.categoria && (
                <div>
                  <label style={labelStyle}>Tipo de trámite</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 256, overflowY: 'auto' }}>
                    {tipos?.map(t => (
                      <div key={t.id} onClick={() => setFormTramite(f => ({ ...f, tipo_tramite: t.id, unidad_responsable: (t as any).unidad_responsable ?? f.unidad_responsable, unidad_receptora: f.unidad_receptora ?? (t as any).unidad_responsable }))}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                          border: `1px solid ${formTramite.tipo_tramite === t.id ? T.accentDk : T.rowBd}`,
                          background: formTramite.tipo_tramite === t.id ? T.rowSel : T.rowBg }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${formTramite.tipo_tramite === t.id ? T.accentDk : T.rowBd}`, background: formTramite.tipo_tramite === t.id ? T.accentDk : 'transparent', flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: T.rowTxt }}>{t.nombre}</p>
                          <p style={{ fontSize: 12, color: T.rowSub, marginTop: 2 }}>
                            {t.unidad_responsable_siglas} · {t.dias_plazo} días hábiles
                            {t.costo > 0 && ` · $${t.costo}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {paso === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[['asunto','Asunto *','text'],['detalle','Detalle','textarea']].map(([k,l,t]) => (
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  {t === 'textarea'
                    ? <textarea className="w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none" style={inputStyle} rows={3}
                        placeholder="Información adicional..." value={formTramite[k] ?? ''}
                        onChange={e => setFormTramite(f => ({ ...f, [k]: e.target.value }))} />
                    : <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                        placeholder="Descripción breve del trámite" value={formTramite[k] ?? ''}
                        onChange={e => setFormTramite(f => ({ ...f, [k]: e.target.value }))} />
                  }
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Canal</label>
                  <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                    value={formTramite.canal_ingreso} onChange={e => setFormTramite(f => ({ ...f, canal_ingreso: e.target.value }))}>
                    <option value="ventanilla">Ventanilla</option>
                    <option value="web">Portal web</option>
                    <option value="email">Correo</option>
                    <option value="oficio">Oficio</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Prioridad</label>
                  <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                    value={formTramite.prioridad} onChange={e => setFormTramite(f => ({ ...f, prioridad: e.target.value }))}>
                    <option value="normal">Normal</option>
                    <option value="urgente">Urgente</option>
                    <option value="muy_urgente">Muy urgente</option>
                  </select>
                </div>
              </div>
              {[['unidad_receptora','Unidad receptora *'],['unidad_responsable','Unidad responsable *']].map(([k,l]) => (
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  <select className="w-full px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}
                    value={formTramite[k] ?? ''} onChange={e => setFormTramite(f => ({ ...f, [k]: Number(e.target.value) }))}>
                    <option value="">— Selecciona —</option>
                    {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: `1px solid ${T.rowBd}` }}>
          <button onClick={() => paso > 1 ? setPaso(p => p - 1) : onClose()}
            style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, cursor: 'pointer' }}>
            {paso === 1 ? 'Cancelar' : '← Anterior'}
          </button>
          {paso < 3 ? (
            <button onClick={() => {
                if (paso === 1 && !persona && !personaNueva) { setError('Busca un ciudadano primero.'); return }
                if (paso === 2 && !formTramite.tipo_tramite) { setError('Selecciona un tipo de trámite.'); return }
                setError(''); setPaso(p => p + 1)
              }}
              style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={crearMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: crearMutation.isPending ? '#4a90e2' : T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
              {crearMutation.isPending
                ? <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Guardando...</>
                : <><Plus size={15} /> Registrar trámite</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TramitesPage() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const navigate = useNavigate()
  const [busqueda, setBusqueda]               = useState('')
  const [filtroEstado, setFiltro]             = useState('')
  const [modalAbierto, setModal]              = useState(false)
  const [selectedTramite, setSelectedTramite] = useState<any>(null)
  const [mostrarVincular, setMostrarVincular] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['tramites', busqueda, filtroEstado],
    queryFn: () => tramitesService.listar({
      ...(busqueda     ? { search: busqueda }     : {}),
      ...(filtroEstado ? { estado: filtroEstado } : {}),
    }),
  })

  const tramites = data?.results ?? []
  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {modalAbierto && <ModalNuevoTramite onClose={() => setModal(false)} />}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: T.rowTxt }}>Trámites ciudadanos</h1>
            <p style={{ fontSize: 14, color: T.rowSub, marginTop: 2 }}>{data?.count ?? 0} trámites registrados</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('/tramites/configuracion')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, color: T.rowSub, background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, cursor: 'pointer' }}>
              <Settings size={15} /> Configurar
            </button>
            <button onClick={() => setModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
              <Plus size={15} /> Nuevo trámite
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
            <input type="text" placeholder="Buscar por número, nombre, cédula..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full text-sm rounded-xl outline-none"
              style={{ ...inputStyle, paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10 }} />
          </div>
          <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl outline-none" style={inputStyle}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontSize: 14, color: T.rowSub }}>Cargando trámites...</div>
          ) : tramites.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: T.rowSub }}>
              <ClipboardList size={28} style={{ opacity: .4, marginBottom: 8 }} />
              <p style={{ fontSize: 14 }}>No se encontraron trámites</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.rowBd}` }}>
                  {['Trámite','Ciudadano','Unidad','Plazo','Estado'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tramites.map(t => {
                  const est   = ESTADOS[t.estado] ?? ESTADOS.ingresado
                  const pri   = PRIORIDAD[t.prioridad]
                  const isSel = selectedTramite?.id === t.id
                  return (
                    <tr key={t.id} onClick={() => setSelectedTramite(isSel ? null : t)}
                      style={{ borderBottom: `1px solid ${T.rowBd}`, cursor: 'pointer', background: isSel ? T.rowSel : 'transparent', transition: 'background .1s' }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.rowHv }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSel ? T.rowSel : 'transparent' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: T.accentDk }}>{t.numero_tramite}</p>
                        <p style={{ fontSize: 14, fontWeight: 500, color: T.rowTxt, marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.asunto}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: T.statsBg, color: T.rowSub }}>{t.categoria_nombre}</span>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: pri.color }} title={pri.label} />
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User size={13} style={{ color: T.rowSub, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 500, color: T.rowTxt }}>{t.persona_nombre}</p>
                            <p style={{ fontSize: 11, color: T.rowSub }}>{t.persona_identificacion}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Building2 size={13} style={{ color: T.rowSub, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: T.rowTxt }}>{t.unidad_responsable_siglas}</span>
                        </div>
                        {t.analista_nombre && <p style={{ fontSize: 11, color: T.rowSub, marginTop: 2 }}>{t.analista_nombre}</p>}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.rowSub }}>
                          <Calendar size={12} />
                          <span>{new Date(t.fecha_limite).toLocaleDateString('es-EC')}</span>
                        </div>
                        <div style={{ marginTop: 2 }}><DiasRestantes dias={t.dias_restantes} /></div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: est.bg, color: est.text }}>{est.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Panel lateral */}
      {selectedTramite && (
        <div style={{ width: 280, flexShrink: 0, background: T.ctHdrBg, borderRadius: 14, border: `1px solid ${T.rowBd}`, padding: 16, position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.accentDk, fontFamily: 'monospace', margin: 0 }}>{selectedTramite.numero_tramite}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: '3px 0 0', lineHeight: 1.3 }}>{selectedTramite.asunto}</p>
            </div>
            <button onClick={() => setSelectedTramite(null)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub, fontSize: 18, lineHeight: 1, flexShrink: 0, marginLeft: 8 }}>×</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: (ESTADOS[selectedTramite.estado] ?? ESTADOS.ingresado).bg,
              color: (ESTADOS[selectedTramite.estado] ?? ESTADOS.ingresado).text }}>
              {(ESTADOS[selectedTramite.estado] ?? ESTADOS.ingresado).label}
            </span>
          </div>
          <button onClick={() => setMostrarVincular(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px 10px', borderRadius: 9, border: `1px solid ${T.rowBd}`, background: T.rowBg, color: T.rowTxt, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
            <Archive size={13} /> Archivar en expediente
          </button>
          <div style={{ borderTop: `1px solid ${T.rowBd}`, paddingTop: 12 }}>
            <AdjuntosPanel tramiteId={selectedTramite.id} />
          </div>
        </div>
      )}

      {mostrarVincular && selectedTramite && (
        <VincularExpedienteModal tramiteId={selectedTramite.id} onClose={() => setMostrarVincular(false)} onVinculado={() => setMostrarVincular(false)} />
      )}
    </div>
  )
}
