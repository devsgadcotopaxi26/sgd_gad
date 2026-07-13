import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import api from '@/services/api'
import {
  Shield, Users, Search, Plus, X, Check,
  ChevronRight, RefreshCw, AlertCircle,
  CheckCircle2, Lock, Unlock, Edit2,
  Crown, Settings, Save, User
} from 'lucide-react'

const permisosService = {
  usuarios:      (search?: string) => api.get('/usuarios/', { params: search ? { search } : {} }).then(r => r.data?.results ?? r.data),
  roles:         ()                => api.get('/usuarios/roles/').then(r => r.data?.results ?? r.data),
  unidades:      ()                => api.get('/organizacion/unidades/').then(r => r.data?.results ?? r.data),
  asignarRol:    (usuarioId: number, rolId: number) => api.post(`/usuarios/${usuarioId}/asignar_rol/`, { rol: rolId }).then(r => r.data),
  revocarRol:    (usuarioId: number, rolId: number) => api.post(`/usuarios/${usuarioId}/revocar_rol/`, { rol_id: rolId }).then(r => r.data),
  detalle:       (id: number)      => api.get(`/usuarios/${id}/`).then(r => r.data),
  actualizarDatos: (id: number, data: Record<string, unknown>) => api.patch(`/usuarios/${id}/`, data).then(r => r.data),
  bloquear:      (id: number, motivo: string) => api.post(`/usuarios/${id}/bloquear/`, { motivo }).then(r => r.data),
  desbloquear:   (id: number)      => api.post(`/usuarios/${id}/desbloquear/`).then(r => r.data),
}

const PERMISOS_ROL: Record<string, Record<string, string[]>> = {
  ADMIN:       { documentos: ['ver','crear','editar','eliminar','firmar','enviar','archivar'], tramites: ['ver','crear','editar','eliminar','resolver','reasignar'], archivo: ['ver','crear','editar','eliminar','transferir'], usuarios: ['ver','crear','editar','eliminar','bloquear'], reportes: ['ver','generar'], ajustes: ['ver','editar'] },
  PREFECTO:    { documentos: ['ver','crear','editar','firmar','enviar','archivar'], tramites: ['ver','resolver','reasignar'], archivo: ['ver'], reportes: ['ver','generar'] },
  SECRETARIO:  { documentos: ['ver','crear','editar','firmar','enviar','archivar'], tramites: ['ver','crear','reasignar'], archivo: ['ver','crear','archivar'], reportes: ['ver','generar'] },
  DIRECTOR:    { documentos: ['ver','crear','editar','firmar','enviar','archivar'], tramites: ['ver','crear','editar','resolver','reasignar'], archivo: ['ver','crear'], reportes: ['ver','generar'] },
  ANALISTA:    { documentos: ['ver','crear','editar','enviar'], tramites: ['ver','crear','editar','resolver'], archivo: ['ver','crear'], reportes: ['ver'] },
  ASISTENTE:   { documentos: ['ver','crear','editar'], tramites: ['ver','crear'], archivo: ['ver'], reportes: ['ver'] },
  RECEPCION:   { documentos: ['ver'], tramites: ['ver','crear'], archivo: ['ver'] },
  ARCHIVO:     { documentos: ['ver','archivar'], tramites: ['ver'], archivo: ['ver','crear','editar','transferir'], reportes: ['ver','generar'] },
  SOLO_LECTURA:{ documentos: ['ver'], tramites: ['ver'], archivo: ['ver'], reportes: ['ver'] },
}

const ROL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN:       { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  PREFECTO:    { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  SECRETARIO:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  DIRECTOR:    { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  ANALISTA:    { bg: '#e8f1fd', text: '#002f6c', border: '#93c5fd' },
  ASISTENTE:   { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  RECEPCION:   { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  ARCHIVO:     { bg: '#f0fdf4', text: '#0f6e56', border: '#6ee7b7' },
  SOLO_LECTURA:{ bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
}

const MODULOS = ['documentos', 'tramites', 'archivo', 'usuarios', 'reportes', 'ajustes']
const ACCIONES_TODAS = ['ver','crear','editar','eliminar','firmar','enviar','archivar','resolver','reasignar','transferir','generar','bloquear']

function PanelUsuario({ usuario, onClose }: { usuario: any; onClose: () => void }) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const [motivo, setMotivo]           = useState('')
  const [mostrarBloqueo, setMostrarBloqueo] = useState(false)
  const [panelTab, setPanelTab]       = useState<'roles' | 'datos'>('roles')
  const [form, setForm]               = useState<Record<string, any>>({})
  const [guardando, setGuardando]     = useState(false)
  const [savedOk, setSavedOk]         = useState(false)

  const { data: detalle, isLoading } = useQuery({ queryKey: ['usuario-detalle', usuario.id], queryFn: () => permisosService.detalle(usuario.id) })
  const { data: roles }    = useQuery({ queryKey: ['roles'],    queryFn: permisosService.roles })
  const { data: unidades } = useQuery({ queryKey: ['unidades'], queryFn: permisosService.unidades })

  useEffect(() => {
    if (detalle && !form.nombres) {
      setForm({
        titulo:              detalle.titulo              ?? '',
        nombres:             detalle.nombres             ?? '',
        apellidos:           detalle.apellidos           ?? '',
        cargo:               detalle.cargo               ?? '',
        cargo_tipo:          detalle.cargo_tipo          ?? 0,
        unidad:              detalle.unidad_id           ?? '',
        email_institucional: detalle.email_institucional ?? '',
        telefono_movil:      detalle.telefono_movil      ?? '',
        telefono_fijo:       detalle.telefono_fijo       ?? '',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalle])

  const asignar    = useMutation({ mutationFn: (rolId: number) => permisosService.asignarRol(usuario.id, rolId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] }); qc.invalidateQueries({ queryKey: ['usuarios-permisos'] }) } })
  const revocar    = useMutation({ mutationFn: (rolId: number) => permisosService.revocarRol(usuario.id, rolId), onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] }); qc.invalidateQueries({ queryKey: ['usuarios-permisos'] }) } })
  const bloquear   = useMutation({ mutationFn: () => permisosService.bloquear(usuario.id, motivo), onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios-permisos'] }); qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] }); setMostrarBloqueo(false) } })
  const desbloquear = useMutation({ mutationFn: () => permisosService.desbloquear(usuario.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios-permisos'] }); qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] }) } })

  const guardarDatos = async () => {
    setGuardando(true)
    try {
      await permisosService.actualizarDatos(usuario.id, {
        titulo: form.titulo, nombres: form.nombres, apellidos: form.apellidos,
        cargo: form.cargo, cargo_tipo: Number(form.cargo_tipo),
        unidad: form.unidad || null, email_institucional: form.email_institucional,
        telefono_movil: form.telefono_movil, telefono_fijo: form.telefono_fijo,
      })
      qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] })
      qc.invalidateQueries({ queryKey: ['usuarios-permisos'] })
      setSavedOk(true); setTimeout(() => setSavedOk(false), 2000)
    } finally { setGuardando(false) }
  }

  const setF = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const permisosEfectivos: Record<string, Set<string>> = {}
  const codigosRoles: string[] = (detalle?.roles ?? []).filter((r: any) => r.activo).map((r: any) => r.rol_codigo ?? '')
  codigosRoles.forEach(codigo => {
    const perms = PERMISOS_ROL[codigo] ?? {}
    Object.entries(perms).forEach(([mod, acciones]) => {
      if (!permisosEfectivos[mod]) permisosEfectivos[mod] = new Set()
      acciones.forEach(a => permisosEfectivos[mod].add(a))
    })
  })

  const inputStyle: React.CSSProperties  = { width: '100%', padding: '7px 10px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, background: T.rowBg, color: T.rowTxt, outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties  = { fontSize: 10, fontWeight: 600, color: T.rowSub, marginBottom: 3, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div style={{ width: 480, height: '100vh', background: T.ctHdrBg, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${T.rowBd}`, background: T.rowHv }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#002f6c,#0052cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(usuario.nombres?.[0] ?? '') + (usuario.apellidos?.[0] ?? '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.rowTxt, margin: 0 }}>{usuario.nombres} {usuario.apellidos}</p>
              <p style={{ fontSize: 11, color: T.rowSub, margin: '2px 0 0' }}>{usuario.email_institucional || usuario.email} · {usuario.cargo || '—'}</p>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub, padding: 4 }}><X size={16} /></button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {detalle?.bloqueado ? (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef2f2', color: '#dc2626' }}>🔒 Bloqueado</span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#15803d' }}>✓ Activo</span>
            )}
            {detalle?.is_superuser && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#faf5ff', color: '#7e22ce', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Crown size={9} /> Superusuario
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {detalle?.bloqueado ? (
                <button onClick={() => desbloquear.mutate()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #86efac', background: '#f0fdf4', cursor: 'pointer', fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                  <Unlock size={11} /> Desbloquear
                </button>
              ) : (
                <button onClick={() => setMostrarBloqueo(!mostrarBloqueo)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                  <Lock size={11} /> Bloquear
                </button>
              )}
            </div>
          </div>

          {mostrarBloqueo && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <input style={{ flex: 1, padding: '6px 10px', fontSize: 11, border: '0.5px solid #fecaca', borderRadius: 8, outline: 'none', background: '#fef2f2', color: '#dc2626' }}
                placeholder="Motivo del bloqueo..." value={motivo} onChange={e => setMotivo(e.target.value)} />
              <button onClick={() => bloquear.mutate()} style={{ padding: '6px 12px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Confirmar
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 0, marginTop: 10, borderRadius: 8, overflow: 'hidden', border: `0.5px solid ${T.rowBd}` }}>
            {([['roles', Shield, 'Roles y permisos'], ['datos', User, 'Datos del usuario']] as const).map(([k, Icon, lbl]) => (
              <button key={k} onClick={() => setPanelTab(k as any)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: panelTab === k ? T.accentDk : T.rowBg,
                  color: panelTab === k ? '#fff' : T.rowSub }}>
                <Icon size={12} /> {lbl}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.rowSub, fontSize: 12 }}>Cargando...</div>
          ) : panelTab === 'roles' ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: T.rowTxt, marginBottom: 10 }}>Roles asignados</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {(detalle?.roles ?? []).filter((r: any) => r.activo).length === 0 && (
                    <span style={{ fontSize: 11, color: T.rowSub }}>Sin roles asignados</span>
                  )}
                  {(detalle?.roles ?? []).filter((r: any) => r.activo).map((r: any) => {
                    const codigo = r.rol_codigo ?? ''
                    const c = ROL_COLORS[codigo] ?? ROL_COLORS.SOLO_LECTURA
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: c.bg, border: `0.5px solid ${c.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{r.rol_nombre ?? codigo}</span>
                        <button onClick={() => revocar.mutate(r.rol)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: c.text, padding: 1, opacity: .7, display: 'flex' }}><X size={11} /></button>
                      </div>
                    )
                  })}
                </div>

                <p style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, marginBottom: 6 }}>Agregar rol:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(roles ?? []).map((rol: any) => {
                    const yaAsignado = (detalle?.roles ?? []).filter((r: any) => r.activo).some((r: any) => r.rol === rol.id)
                    const c = ROL_COLORS[rol.codigo] ?? ROL_COLORS.SOLO_LECTURA
                    return (
                      <button key={rol.id} onClick={() => !yaAsignado && asignar.mutate(rol.id)} disabled={yaAsignado}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, cursor: yaAsignado ? 'default' : 'pointer',
                          background: yaAsignado ? T.rowHv : c.bg,
                          border: `0.5px solid ${yaAsignado ? T.rowBd : c.border}`,
                          fontSize: 11, fontWeight: 600,
                          color: yaAsignado ? T.rowSub : c.text,
                          opacity: yaAsignado ? .6 : 1 }}>
                        {yaAsignado ? <Check size={10} /> : <Plus size={10} />}
                        {rol.nombre}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: T.rowTxt, marginBottom: 10 }}>
                  Permisos efectivos {detalle?.is_superuser ? '(Superusuario — acceso total)' : ''}
                </p>
                {MODULOS.map(modulo => {
                  const acciones = detalle?.is_superuser ? ACCIONES_TODAS : Array.from(permisosEfectivos[modulo] ?? [])
                  if (acciones.length === 0) return null
                  return (
                    <div key={modulo} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.06em', minWidth: 80 }}>{modulo}</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {acciones.map(a => (
                            <span key={a} style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: '#e8f1fd', color: '#002f6c' }}>{a}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {Object.keys(permisosEfectivos).length === 0 && !detalle?.is_superuser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
                    <AlertCircle size={13} /> Sin permisos asignados — el usuario no puede acceder a ningún módulo
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Título</label><input style={inputStyle} placeholder="Ing., Lcda., Dr." value={form.titulo ?? ''} onChange={e => setF('titulo', e.target.value)} /></div>
                <div><label style={labelStyle}>Nombres</label><input style={inputStyle} value={form.nombres ?? ''} onChange={e => setF('nombres', e.target.value)} /></div>
              </div>
              <div><label style={labelStyle}>Apellidos</label><input style={inputStyle} value={form.apellidos ?? ''} onChange={e => setF('apellidos', e.target.value)} /></div>
              <div><label style={labelStyle}>Cargo</label><input style={inputStyle} placeholder="Director de Planificación..." value={form.cargo ?? ''} onChange={e => setF('cargo', e.target.value)} /></div>
              <div><label style={labelStyle}>Tipo de cargo</label>
                <select style={inputStyle} value={form.cargo_tipo ?? 0} onChange={e => setF('cargo_tipo', e.target.value)}>
                  <option value={0}>Normal</option><option value={1}>Jefe de área</option><option value={2}>Asistente</option>
                </select>
              </div>
              <div><label style={labelStyle}>Unidad / Dependencia</label>
                <select style={inputStyle} value={form.unidad ?? ''} onChange={e => setF('unidad', e.target.value)}>
                  <option value="">— Sin unidad asignada —</option>
                  {(unidades ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.nombre} {u.siglas ? `(${u.siglas})` : ''}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Email institucional</label><input style={inputStyle} type="email" placeholder="usuario@cotopaxi.gob.ec" value={form.email_institucional ?? ''} onChange={e => setF('email_institucional', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Teléfono móvil</label><input style={inputStyle} placeholder="0999999999" value={form.telefono_movil ?? ''} onChange={e => setF('telefono_movil', e.target.value)} /></div>
                <div><label style={labelStyle}>Teléfono fijo</label><input style={inputStyle} placeholder="032800416" value={form.telefono_fijo ?? ''} onChange={e => setF('telefono_fijo', e.target.value)} /></div>
              </div>
              <button onClick={guardarDatos} disabled={guardando}
                style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', cursor: guardando ? 'default' : 'pointer', background: savedOk ? '#15803d' : T.accentDk, color: '#fff', fontSize: 12, fontWeight: 700, opacity: guardando ? .7 : 1, transition: 'background .3s' }}>
                <Save size={13} />
                {savedOk ? '¡Guardado!' : guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PermisosPage() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const [busqueda, setBusqueda]   = useState('')
  const [selected, setSelected]   = useState<any>(null)
  const [filtroRol, setFiltroRol] = useState('')
  const [tab, setTab]             = useState<'usuarios' | 'roles'>('usuarios')

  const { data: usuarios, isLoading, refetch } = useQuery({
    queryKey: ['usuarios-permisos', busqueda],
    queryFn: () => permisosService.usuarios(busqueda || undefined),
  })

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: permisosService.roles })

  const usuariosFiltrados = (usuarios ?? []).filter((u: any) => {
    if (!filtroRol) return true
    return (u.roles ?? []).some((r: any) => r.activo && (r.rol_codigo ?? r.codigo) === filtroRol)
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {selected && <PanelUsuario usuario={selected} onClose={() => setSelected(null)} />}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: T.rowTxt, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} style={{ color: T.accentDk }} /> Gestión de permisos por rol
        </h1>
        <p style={{ fontSize: 12, color: T.rowSub, marginTop: 4 }}>Asigna y revoca roles a los usuarios del sistema</p>
      </div>

      <div style={{ display: 'flex', background: T.ctHdrBg, borderRadius: 12, border: `0.5px solid ${T.rowBd}`, marginBottom: 16, overflow: 'hidden' }}>
        {[{ key: 'usuarios', label: 'Usuarios y roles', icon: Users }, { key: 'roles', label: 'Matriz de permisos', icon: Settings }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === key ? T.ctHdrBg : T.rowHv,
              color: tab === key ? T.accentDk : T.rowSub,
              borderBottom: `2px solid ${tab === key ? T.accentDk : 'transparent'}` }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'usuarios' && (
        <div style={{ background: T.ctHdrBg, borderRadius: 14, border: `0.5px solid ${T.rowBd}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `0.5px solid ${T.rowBd}`, background: T.rowHv }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
              <input placeholder="Buscar usuario..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 26px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, background: T.rowBg, color: T.rowTxt, outline: 'none' }} />
            </div>
            <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
              style={{ padding: '7px 10px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, background: T.rowBg, color: T.rowTxt, outline: 'none' }}>
              <option value="">Todos los roles</option>
              {(roles ?? []).map((r: any) => <option key={r.id} value={r.codigo}>{r.nombre}</option>)}
            </select>
            <button onClick={() => refetch()}
              style={{ width: 30, height: 30, borderRadius: 8, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub }}>
              <RefreshCw size={13} />
            </button>
            <span style={{ fontSize: 11, color: T.rowSub }}>{usuariosFiltrados.length} usuarios</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 200px 100px', gap: 10, padding: '8px 16px', background: T.rowHv, borderBottom: `0.5px solid ${T.rowBd}` }}>
            {['Usuario', 'Estado', 'Roles activos', 'Acciones'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.rowSub, fontSize: 12 }}>Cargando...</div>
          ) : usuariosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: T.rowSub }}>
              <Users size={28} style={{ opacity: .3, margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 12 }}>No se encontraron usuarios</p>
            </div>
          ) : usuariosFiltrados.map((u: any) => {
            const rolesActivos = (u.roles ?? []).filter((r: any) => r.activo)
            const bloqueado    = u.bloqueado
            return (
              <div key={u.id}
                style={{ display: 'grid', gridTemplateColumns: '1fr 140px 200px 100px', gap: 10, padding: '10px 16px', borderBottom: `0.5px solid ${T.rowBd}`, alignItems: 'center',
                  background: bloqueado ? '#fef9f9' : T.ctHdrBg }}
                onMouseEnter={e => (e.currentTarget.style.background = bloqueado ? '#fef2f2' : T.rowHv)}
                onMouseLeave={e => (e.currentTarget.style.background = bloqueado ? '#fef9f9' : T.ctHdrBg)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#002f6c,#0052cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {(u.nombres?.[0] ?? '') + (u.apellidos?.[0] ?? '')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.nombres} {u.apellidos}
                        {u.is_superuser && <Crown size={10} style={{ color: '#7e22ce', marginLeft: 4, display: 'inline' }} />}
                      </p>
                      <p style={{ fontSize: 10, color: T.rowSub, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.cargo || u.email_institucional || u.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  {bloqueado ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3, width: 'fit-content' }}>
                      <Lock size={9} /> Bloqueado
                    </span>
                  ) : u.activo ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#15803d', display: 'flex', alignItems: 'center', gap: 3, width: 'fit-content' }}>
                      <CheckCircle2 size={9} /> Activo
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: T.rowHv, color: T.rowSub, width: 'fit-content', display: 'block' }}>Inactivo</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {rolesActivos.length === 0 ? (
                    <span style={{ fontSize: 10, color: T.rowSub }}>Sin roles</span>
                  ) : rolesActivos.slice(0, 3).map((r: any) => {
                    const codigo = r.rol_codigo ?? r.codigo ?? ''
                    const c = ROL_COLORS[codigo] ?? ROL_COLORS.SOLO_LECTURA
                    return (
                      <span key={r.id ?? r.rol} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: c.bg, color: c.text, border: `0.5px solid ${c.border}` }}>
                        {r.rol_nombre ?? codigo}
                      </span>
                    )
                  })}
                  {rolesActivos.length > 3 && <span style={{ fontSize: 9, color: T.rowSub }}>+{rolesActivos.length - 3}</span>}
                </div>
                <div>
                  <button onClick={() => setSelected(u)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', fontSize: 11, color: T.rowTxt, fontWeight: 500 }}>
                    <Edit2 size={11} /> Gestionar <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'roles' && (
        <div style={{ background: T.ctHdrBg, borderRadius: 14, border: `0.5px solid ${T.rowBd}`, overflow: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${T.rowBd}`, background: T.rowHv }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: T.rowTxt, margin: 0 }}>Matriz de permisos por rol — referencia de acceso por módulo</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: T.rowHv }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', borderBottom: `0.5px solid ${T.rowBd}`, minWidth: 120 }}>Rol</th>
                  {MODULOS.map(m => (
                    <th key={m} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', borderBottom: `0.5px solid ${T.rowBd}`, minWidth: 100 }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(PERMISOS_ROL).map(([codigo, permisos]) => {
                  const c = ROL_COLORS[codigo] ?? ROL_COLORS.SOLO_LECTURA
                  return (
                    <tr key={codigo} style={{ borderBottom: `0.5px solid ${T.rowBd}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: c.bg, color: c.text, border: `0.5px solid ${c.border}` }}>{codigo}</span>
                      </td>
                      {MODULOS.map(modulo => {
                        const acciones = permisos[modulo] ?? []
                        return (
                          <td key={modulo} style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {acciones.length === 0 ? (
                              <span style={{ color: T.rowBd, fontSize: 14 }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                                {acciones.map(a => (
                                  <span key={a} style={{ fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 4, background: c.bg, color: c.text }}>{a}</span>
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
