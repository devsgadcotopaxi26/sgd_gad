import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import { usuariosService, CrearUsuario, Usuario } from '@/services/usuarios.service'
import { organizacionService } from '@/services/organizacion.service'
import { quipuxService } from '@/services/quipux.service'
import {
  Users, Search, Plus, Lock, Unlock, X, Eye, EyeOff,
  UserCheck, UserX, Key, Download, ChevronRight, Save,
  Shield, AlertTriangle, CheckCircle,
} from 'lucide-react'

const TIPOS = ['funcionario', 'ciudadano', 'sistema']
const CARGO_TIPOS = [
  { v: 1, l: 'Nombramiento' }, { v: 2, l: 'Contrato' },
  { v: 3, l: 'Comisión' }, { v: 4, l: 'Pasante' },
]

function Avatar({ n, a, size = 36 }: { n: string; a: string; size?: number }) {
  const ini = `${n?.[0] ?? '?'}${a?.[0] ?? ''}`.toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#002f6c,#0052cc)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: '#fff',
    }}>
      {ini}
    </div>
  )
}

function EstadoBadge({ u }: { u: Usuario }) {
  if (u.bloqueado) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 999, background: '#fef2f2', color: '#dc2626' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />Bloqueado</span>
  if (!u.activo)   return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 999, background: '#f9fafb', color: '#6b7280' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af' }} />Inactivo</span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 999, background: '#f0fdf4', color: '#15803d' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />Activo</span>
}

function ModalCrear({ onClose }: { onClose: () => void }) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState<Partial<CrearUsuario>>({ tipo: 'funcionario' })
  const [error, setError] = useState('')

  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const mut = useMutation({
    mutationFn: (d: CrearUsuario) => usuariosService.crear(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); onClose() },
    onError: (e: any) => {
      const d = e.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Error al crear usuario')
    },
  })

  const set = (k: keyof CrearUsuario, v: any) => setForm(f => ({ ...f, [k]: v }))
  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 600, color: T.rowSub, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 16, width: '100%', maxWidth: 512, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: `1px solid ${T.rowBd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${T.rowBd}` }}>
          <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>Nuevo usuario</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Nombres *</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.nombres ?? ''} onChange={e => set('nombres', e.target.value)} /></div>
            <div><label style={labelStyle}>Apellidos *</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.apellidos ?? ''} onChange={e => set('apellidos', e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>Cédula</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} placeholder="0000000000" value={form.cedula ?? ''} onChange={e => set('cedula', e.target.value)} /></div>
          <div><label style={labelStyle}>Correo electrónico *</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Tipo</label>
              <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Unidad</label>
              <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.unidad ?? ''} onChange={e => set('unidad', e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">— Sin asignar —</option>
                {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelStyle}>Cargo</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.cargo ?? ''} onChange={e => set('cargo', e.target.value)} /></div>
          <div><label style={labelStyle}>Contraseña *</label>
            <div style={{ position: 'relative' }}>
              <input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ ...inputStyle, paddingRight: 40 }} type={showPw ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={form.password ?? ''} onChange={e => set('password', e.target.value)} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: `1px solid ${T.rowBd}` }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 14, fontWeight: 500, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => {
            if (!form.nombres || !form.apellidos || !form.email || !form.password) { setError('Completa los campos obligatorios.'); return }
            mut.mutate(form as CrearUsuario)
          }} disabled={mut.isPending} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 14, fontWeight: 700, color: '#fff', background: T.accentDk, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
            <Plus size={15} /> Crear usuario
          </button>
        </div>
      </div>
    </div>
  )
}

type PanelTab = 'datos' | 'seguridad' | 'quipux'

function PanelDetalle({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const [tab, setTab] = useState<PanelTab>('datos')
  const [form, setForm] = useState<Partial<Usuario>>({})
  const [saved, setSaved] = useState(false)
  const [pwForm, setPwForm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [descargando, setDescargando] = useState(false)
  const [qSearch, setQSearch] = useState('')
  const [qUsuario, setQUsuario] = useState<{ usua_cedula: string; usua_nombre: string } | null>(null)

  const { data: unidades }  = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })
  const { data: rolesDisp } = useQuery({ queryKey: ['roles'], queryFn: usuariosService.roles })
  const { data: detalle, refetch } = useQuery({
    queryKey: ['usuario-detalle', usuario.id],
    queryFn: () => usuariosService.obtener(usuario.id),
  })

  const { data: quipuxUsuarios } = useQuery({
    queryKey: ['quipux-usuarios', qSearch],
    queryFn: () => quipuxService.usuariosQuipux(qSearch || undefined),
    enabled: tab === 'quipux',
    retry: false,
  })

  useEffect(() => { if (detalle) setForm({ ...detalle }) }, [detalle])

  const set = (k: keyof Usuario, v: any) => setForm(f => ({ ...f, [k]: v }))

  const guardar = useMutation({
    mutationFn: () => usuariosService.actualizar(usuario.id, {
      nombres: form.nombres, apellidos: form.apellidos, cedula: form.cedula,
      tipo: form.tipo, cargo: form.cargo, titulo: form.titulo,
      cargo_tipo: form.cargo_tipo, unidad_id: form.unidad_id,
      email: form.email, email_institucional: form.email_institucional,
      telefono_movil: form.telefono_movil, telefono_fijo: form.telefono_fijo,
    } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); refetch(); setSaved(true); setTimeout(() => setSaved(false), 2500) },
  })

  const toggleActivo    = useMutation({ mutationFn: () => detalle?.activo ? usuariosService.desactivar(usuario.id) : usuariosService.activar(usuario.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); refetch() } })
  const toggleBloqueado = useMutation({ mutationFn: () => detalle?.bloqueado ? usuariosService.desbloquear(usuario.id) : usuariosService.bloquear(usuario.id, 'Bloqueado por administrador'), onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); refetch() } })
  const resetPw         = useMutation({ mutationFn: () => usuariosService.resetPassword(usuario.id, pwForm), onSuccess: () => { setPwMsg('Contraseña restablecida correctamente.'); setPwForm('') }, onError: (e: any) => setPwMsg(e.response?.data?.detail || 'Error al restablecer.') })
  const asignarRol      = useMutation({ mutationFn: (rol_id: number) => usuariosService.asignarRol(usuario.id, { rol: rol_id }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] }); refetch() } })
  const revocarRol      = useMutation({ mutationFn: (rol_id: number) => usuariosService.revocarRol(usuario.id, rol_id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] }); refetch() } })

  const u = detalle ?? usuario
  const rolesActivos     = (u.roles ?? []).filter(r => r.activo)
  const rolesNoAsignados = (rolesDisp ?? []).filter(r => !rolesActivos.some(ra => ra.rol === r.id))

  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 600, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }
  const TABS: { id: PanelTab; label: string }[] = [{ id: 'datos', label: 'Datos' }, { id: 'seguridad', label: 'Seguridad' }, { id: 'quipux', label: 'Quipux' }]

  return (
    <div style={{ width: 400, minWidth: 400, background: T.ctHdrBg, borderLeft: `1px solid ${T.rowBd}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 16, borderBottom: `1px solid ${T.rowBd}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <Avatar n={u.nombres} a={u.apellidos} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.rowTxt, margin: 0, lineHeight: 1.3 }}>{u.nombre_completo}</p>
            <p style={{ fontSize: 11, color: T.rowSub, margin: '3px 0 0' }}>{u.cargo || '—'} · {u.unidad_siglas || 'Sin unidad'}</p>
            <div style={{ marginTop: 6 }}><EstadoBadge u={u} /></div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub, padding: 4, flexShrink: 0 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', gap: 0, background: T.rowHv, borderRadius: 10, padding: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all .15s',
              background: tab === t.id ? T.ctHdrBg : 'transparent',
              color: tab === t.id ? T.accentDk : T.rowSub,
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tab === 'datos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid grid-cols-2 gap-3">
              <div><label style={labelStyle}>Nombres</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.nombres ?? ''} onChange={e => set('nombres', e.target.value)} /></div>
              <div><label style={labelStyle}>Apellidos</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.apellidos ?? ''} onChange={e => set('apellidos', e.target.value)} /></div>
            </div>
            <div><label style={labelStyle}>Cédula</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.cedula ?? ''} onChange={e => set('cedula', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label style={labelStyle}>Tipo</label>
                <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.tipo ?? 'funcionario'} onChange={e => set('tipo', e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Contrato</label>
                <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.cargo_tipo ?? ''} onChange={e => set('cargo_tipo', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">—</option>
                  {CARGO_TIPOS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
            </div>
            <div><label style={labelStyle}>Título profesional</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.titulo ?? ''} onChange={e => set('titulo', e.target.value)} /></div>
            <div><label style={labelStyle}>Cargo</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.cargo ?? ''} onChange={e => set('cargo', e.target.value)} /></div>
            <div><label style={labelStyle}>Unidad</label>
              <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.unidad_id ?? ''} onChange={e => set('unidad_id', e.target.value ? Number(e.target.value) : null as any)}>
                <option value="">— Sin asignar —</option>
                {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Email institucional</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} type="email" value={form.email_institucional ?? ''} onChange={e => set('email_institucional', e.target.value)} /></div>
            <div><label style={labelStyle}>Email personal</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label style={labelStyle}>Teléfono móvil</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.telefono_movil ?? ''} onChange={e => set('telefono_movil', e.target.value)} /></div>
              <div><label style={labelStyle}>Teléfono fijo</label><input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} value={form.telefono_fijo ?? ''} onChange={e => set('telefono_fijo', e.target.value)} /></div>
            </div>
            <button onClick={() => guardar.mutate()} disabled={guardar.isPending}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: saved ? '#0f6e56' : T.accentDk, color: '#fff', marginTop: 4 }}>
              {saved ? <><CheckCircle size={15} /> Guardado</> : <><Save size={15} /> {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}</>}
            </button>

            <div style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${T.rowBd}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Roles asignados</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {rolesActivos.length === 0 && <span style={{ fontSize: 12, color: T.rowSub }}>Sin roles</span>}
                {rolesActivos.map(r => (
                  <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: '#e8f1fd', color: '#002f6c', fontSize: 12, fontWeight: 600 }}>
                    <Shield size={11} />
                    {r.rol_codigo}
                    <button onClick={() => revocarRol.mutate(r.rol)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', lineHeight: 1, paddingLeft: 2 }}>×</button>
                  </span>
                ))}
              </div>
              {rolesNoAsignados.length > 0 && (
                <select className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={inputStyle} defaultValue="" onChange={e => { if (e.target.value) asignarRol.mutate(Number(e.target.value)) }}>
                  <option value="">+ Asignar rol…</option>
                  {rolesNoAsignados.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              )}
            </div>
          </div>
        )}

        {tab === 'seguridad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                title: 'Cuenta activa', sub: `El usuario ${u.activo ? 'puede' : 'no puede'} iniciar sesión`,
                badge: <EstadoBadge u={{ ...u, bloqueado: false }} />,
                btn: u.activo ? { label: 'Desactivar cuenta', icon: <UserX size={14} />, bg: '#fef2f2', color: '#dc2626' } : { label: 'Activar cuenta', icon: <UserCheck size={14} />, bg: '#f0fdf4', color: '#15803d' },
                action: () => toggleActivo.mutate(),
              },
              {
                title: 'Bloqueo de cuenta', sub: u.bloqueado ? `Motivo: ${u.motivo_bloqueo || '—'}` : 'No está bloqueado',
                badge: u.bloqueado ? <AlertTriangle size={16} style={{ color: '#dc2626' }} /> : null,
                btn: u.bloqueado ? { label: 'Desbloquear', icon: <Unlock size={14} />, bg: '#f0fdf4', color: '#15803d' } : { label: 'Bloquear', icon: <Lock size={14} />, bg: '#fef2f2', color: '#dc2626' },
                action: () => toggleBloqueado.mutate(),
              },
            ].map(({ title, sub, badge, btn, action }) => (
              <div key={title} style={{ padding: 14, background: T.rowHv, borderRadius: 12, border: `1px solid ${T.rowBd}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.rowTxt, margin: 0 }}>{title}</p>
                    <p style={{ fontSize: 11, color: T.rowSub, margin: '2px 0 0' }}>{sub}</p>
                  </div>
                  {badge}
                </div>
                <button onClick={action} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: btn.bg, color: btn.color }}>
                  {btn.icon} {btn.label}
                </button>
              </div>
            ))}

            <div style={{ padding: 14, background: T.rowHv, borderRadius: 12, border: `1px solid ${T.rowBd}` }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.rowTxt, margin: '0 0 8px' }}>Restablecer contraseña</p>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ ...inputStyle, paddingRight: 40 }} type={showPw ? 'text' : 'password'} placeholder="Nueva contraseña (mín. 8 caracteres)" value={pwForm} onChange={e => setPwForm(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwMsg && <p style={{ fontSize: 11, color: pwMsg.includes('correct') ? '#0f6e56' : '#dc2626', marginBottom: 8 }}>{pwMsg}</p>}
              <button onClick={() => { setPwMsg(''); resetPw.mutate() }} disabled={resetPw.isPending || pwForm.length < 8}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: pwForm.length < 8 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, background: T.accentDk, color: '#fff', opacity: pwForm.length < 8 ? 0.5 : 1 }}>
                <Key size={14} /> Restablecer
              </button>
            </div>

            <div style={{ fontSize: 11, color: T.rowSub }}>
              <p>Último acceso: {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-EC') : '—'}</p>
              <p>Registrado: {u.creado_en ? new Date(u.creado_en).toLocaleDateString('es-EC') : '—'}</p>
            </div>
          </div>
        )}

        {tab === 'quipux' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12, color: T.rowSub, margin: 0 }}>Exporta la bandeja histórica de Quipux de este u otro funcionario a un archivo Excel.</p>

            <div>
              <label style={labelStyle}>Buscar funcionario en Quipux</label>
              <input className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }}
                placeholder="Nombre o cédula…" value={qSearch}
                onChange={e => { setQSearch(e.target.value); setQUsuario(null) }} />
            </div>

            {qSearch.length >= 2 && quipuxUsuarios && quipuxUsuarios.length > 0 && !qUsuario && (
              <div style={{ border: `1px solid ${T.rowBd}`, borderRadius: 10, overflow: 'hidden', maxHeight: 180, overflowY: 'auto' }}>
                {quipuxUsuarios.map(qu => (
                  <div key={qu.usua_codi} onClick={() => { setQUsuario(qu); setQSearch(qu.usua_nombre) }}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid ${T.rowBd}`, fontSize: 12, transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <p style={{ fontWeight: 600, color: T.rowTxt, margin: 0 }}>{qu.usua_nombre}</p>
                    <p style={{ color: T.rowSub, margin: 0 }}>{qu.usua_cedula} · {qu.depe_nomb}</p>
                  </div>
                ))}
              </div>
            )}

            {qUsuario && (
              <div style={{ padding: 12, background: '#e8f1fd', borderRadius: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#002f6c', margin: '0 0 2px' }}>{qUsuario.usua_nombre}</p>
                <p style={{ fontSize: 11, color: '#0052cc', margin: 0 }}>Cédula: {qUsuario.usua_cedula}</p>
              </div>
            )}

            <button
              onClick={async () => {
                const cedula = qUsuario?.usua_cedula || u.cedula
                if (!cedula) return
                setDescargando(true)
                try { await quipuxService.respaldoBandeja(cedula) }
                catch (e: any) { alert(e.message || 'Error al descargar') }
                finally { setDescargando(false) }
              }}
              disabled={descargando || (!qUsuario?.usua_cedula && !u.cedula)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: descargando ? T.rowHv : T.accentDk,
                color: descargando ? T.rowSub : '#fff' }}>
              <Download size={15} />
              {descargando ? 'Generando Excel…' : `Descargar bandeja Quipux${qUsuario ? '' : ` (${u.nombres})`}`}
            </button>

            {!u.cedula && !qUsuario && (
              <p style={{ fontSize: 11, color: '#f59e0b', background: '#fffbeb', padding: '8px 12px', borderRadius: 8 }}>
                Este usuario no tiene cédula registrada. Busca un funcionario en el campo de arriba.
              </p>
            )}
            <p style={{ fontSize: 10, color: T.rowSub }}>El archivo Excel incluirá todas las bandejas con número de oficio, fecha, asunto y estado.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const [busqueda, setBusqueda]     = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroActivo, setFiltroActivo] = useState<'' | 'true' | 'false'>('')
  const [filtroRol, setFiltroRol]   = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [seleccionado, setSeleccionado] = useState<Usuario | null>(null)
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  useEffect(() => { setPage(1) }, [busqueda, filtroTipo, filtroActivo, filtroRol])

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios', busqueda, filtroTipo, filtroActivo, filtroRol, page],
    queryFn: () => usuariosService.listar({
      ...(busqueda     ? { search: busqueda }       : {}),
      ...(filtroTipo   ? { tipo: filtroTipo }        : {}),
      ...(filtroActivo ? { activo: filtroActivo }    : {}),
      ...(filtroRol    ? { rol: filtroRol }          : {}),
      page: String(page),
    }),
  })

  const { data: rolesDisp } = useQuery({ queryKey: ['roles'], queryFn: usuariosService.roles })

  const usuarios = data?.results ?? []

  const hayFiltrosActivos = Boolean(busqueda || filtroTipo || filtroActivo || filtroRol)

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroTipo('')
    setFiltroActivo('')
    setFiltroRol('')
  }

  const rolLabel = rolesDisp?.find(r => r.codigo === filtroRol)?.nombre ?? filtroRol

  const filtrosActivos: { key: string; label: string; onRemove: () => void }[] = [
    ...(busqueda    ? [{ key: 'busqueda', label: `Búsqueda: "${busqueda}"`, onRemove: () => setBusqueda('') }] : []),
    ...(filtroTipo  ? [{ key: 'tipo',     label: `Tipo: ${filtroTipo.charAt(0).toUpperCase()}${filtroTipo.slice(1)}`, onRemove: () => setFiltroTipo('') }] : []),
    ...(filtroActivo ? [{ key: 'activo',  label: `Estado: ${filtroActivo === 'true' ? 'Activo' : 'Inactivo'}`, onRemove: () => setFiltroActivo('') }] : []),
    ...(filtroRol   ? [{ key: 'rol',      label: `Rol: ${rolLabel}`, onRemove: () => setFiltroRol('') }] : []),
  ]

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => activo ? usuariosService.desactivar(id) : usuariosService.activar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const toggleBloqueado = useMutation({
    mutationFn: ({ id, bloqueado }: { id: number; bloqueado: boolean }) => bloqueado ? usuariosService.desbloquear(id) : usuariosService.bloquear(id, 'Bloqueado por administrador'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 96px)', gap: 0, overflow: 'hidden' }}>
      {mostrarModal && <ModalCrear onClose={() => setMostrarModal(false)} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.ctHdrBg, borderRadius: seleccionado ? '14px 0 0 14px' : 14, border: `1px solid ${T.rowBd}` }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.rowBd}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: T.rowTxt, margin: 0 }}>Usuarios del sistema</h1>
              <p style={{ fontSize: 12, color: T.rowSub, margin: '2px 0 0' }}>{data?.count ?? 0} usuarios {hayFiltrosActivos ? 'encontrados' : 'registrados'}</p>
            </div>
            <button onClick={() => setMostrarModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: T.accentDk, color: '#fff' }}>
              <Plus size={15} /> Nuevo usuario
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
              <input type="text" placeholder="Buscar por nombre, email o cédula..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, border: `1px solid ${T.rowBd}`, borderRadius: 10, outline: 'none', background: T.rowBg, color: T.rowTxt, boxSizing: 'border-box' }} />
            </div>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 12, border: `1px solid ${T.rowBd}`, borderRadius: 10, outline: 'none', background: T.rowBg, color: T.rowTxt }}>
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 12, border: `1px solid ${T.rowBd}`, borderRadius: 10, outline: 'none', background: T.rowBg, color: T.rowTxt }}>
              <option value="">Todos los roles</option>
              {(rolesDisp ?? []).map(r => <option key={r.id} value={r.codigo}>{r.nombre}</option>)}
            </select>
            <div style={{ display: 'flex', borderRadius: 10, border: `1px solid ${T.rowBd}`, overflow: 'hidden' }}>
              {([['', 'Todos'], ['true', 'Activos'], ['false', 'Inactivos']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFiltroActivo(val)}
                  style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', borderRight: val !== 'false' ? `1px solid ${T.rowBd}` : 'none',
                    background: filtroActivo === val ? T.accentDk : T.rowBg,
                    color: filtroActivo === val ? '#fff' : T.rowSub }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {hayFiltrosActivos && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.rowSub }}>Filtros activos:</span>
              {filtrosActivos.map(f => (
                <span key={f.key}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '3px 6px 3px 10px', borderRadius: 999, background: T.rowSel, color: T.rowTxt }}>
                  {f.label}
                  <button onClick={f.onRemove} title="Quitar filtro"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, border: 'none', borderRadius: '50%', background: 'transparent', cursor: 'pointer', color: T.rowTxt, opacity: 0.7, padding: 0 }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <button onClick={limpiarFiltros}
                style={{ fontSize: 11, fontWeight: 600, color: T.accentDk, background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 4px' }}>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, fontSize: 13, color: T.rowSub }}>Cargando...</div>
          ) : usuarios.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, color: T.rowSub }}>
              <Users size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>
                {hayFiltrosActivos ? 'No se encontraron usuarios con los filtros seleccionados.' : 'Sin resultados'}
              </p>
              {hayFiltrosActivos && (
                <button onClick={limpiarFiltros}
                  style={{ marginTop: 10, padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', color: T.rowTxt }}>
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.rowBd}` }}>
                  {['Usuario', 'Unidad / Cargo', 'Estado', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const isSel = seleccionado?.id === u.id
                  return (
                    <tr key={u.id} onClick={() => setSeleccionado(isSel ? null : u)}
                      style={{ borderBottom: `1px solid ${T.rowBd}`, cursor: 'pointer', background: isSel ? T.rowSel : 'transparent', transition: 'background .1s' }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.rowHv }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSel ? T.rowSel : 'transparent' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar n={u.nombres} a={u.apellidos} size={34} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: T.rowTxt, margin: 0 }}>{u.nombre_completo}</p>
                            <p style={{ fontSize: 11, color: T.rowSub, margin: '1px 0 0' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <p style={{ fontSize: 12, color: T.rowTxt, margin: 0, fontWeight: 500 }}>{u.unidad_siglas || '—'}</p>
                        <p style={{ fontSize: 11, color: T.rowSub, margin: '1px 0 0' }}>{u.cargo || '—'}</p>
                      </td>
                      <td style={{ padding: '10px 16px' }}><EstadoBadge u={u} /></td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                          <button title={u.activo ? 'Inactivar' : 'Activar'}
                            onClick={() => toggleActivo.mutate({ id: u.id, activo: u.activo })}
                            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: u.activo ? T.rowSub : '#22c55e' }}>
                            {u.activo ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                          <button title={u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                            onClick={() => toggleBloqueado.mutate({ id: u.id, bloqueado: u.bloqueado })}
                            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: u.bloqueado ? '#22c55e' : T.rowSub }}>
                            {u.bloqueado ? <Unlock size={15} /> : <Lock size={15} />}
                          </button>
                          <button title="Ver detalle"
                            style={{ padding: 6, borderRadius: 8, border: 'none', background: isSel ? T.accentDk : 'transparent', cursor: 'pointer', color: isSel ? '#fff' : T.rowSub }}>
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <div style={{ flex: 1 }} />
        </div>

        {(data?.count ?? 0) > 20 && (() => {
          const totalPaginas = Math.ceil((data?.count ?? 0) / 20)
          const desde = (page - 1) * 20 + 1
          const hasta = Math.min(page * 20, data?.count ?? 0)
          return (
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: T.rowSub }}>{desde}–{hasta} de {data?.count} usuarios</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${T.rowBd}`, background: T.rowBg, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? T.rowBd : T.rowTxt }}>
                  ← Anterior
                </button>
                {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => {
                  let p = i + 1
                  if (totalPaginas > 7) { const start = Math.max(1, Math.min(page - 3, totalPaginas - 6)); p = start + i }
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: 30, height: 30, fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${T.rowBd}`, cursor: 'pointer', background: page === p ? T.accentDk : T.rowBg, color: page === p ? '#fff' : T.rowTxt }}>
                      {p}
                    </button>
                  )
                })}
                <button disabled={page === totalPaginas} onClick={() => setPage(p => p + 1)}
                  style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${T.rowBd}`, background: T.rowBg, cursor: page === totalPaginas ? 'not-allowed' : 'pointer', color: page === totalPaginas ? T.rowBd : T.rowTxt }}>
                  Siguiente →
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {seleccionado && <PanelDetalle key={seleccionado.id} usuario={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  )
}
