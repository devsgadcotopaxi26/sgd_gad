import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

const INPUT = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white'
const LABEL = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1'

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
  if (u.bloqueado) return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Bloqueado</span>
  if (!u.activo) return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Inactivo</span>
  return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Activo</span>
}

// ─── Modal crear usuario ──────────────────────────────────────────────────────
function ModalCrear({ onClose }: { onClose: () => void }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Nuevo usuario</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Nombres *</label><input className={INPUT} value={form.nombres ?? ''} onChange={e => set('nombres', e.target.value)} /></div>
            <div><label className={LABEL}>Apellidos *</label><input className={INPUT} value={form.apellidos ?? ''} onChange={e => set('apellidos', e.target.value)} /></div>
          </div>
          <div><label className={LABEL}>Cédula</label><input className={INPUT} placeholder="0000000000" value={form.cedula ?? ''} onChange={e => set('cedula', e.target.value)} /></div>
          <div><label className={LABEL}>Correo electrónico *</label><input className={INPUT} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Tipo</label>
              <select className={INPUT} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={LABEL}>Unidad</label>
              <select className={INPUT} value={form.unidad ?? ''} onChange={e => set('unidad', e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">— Sin asignar —</option>
                {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
              </select>
            </div>
          </div>
          <div><label className={LABEL}>Cargo</label><input className={INPUT} value={form.cargo ?? ''} onChange={e => set('cargo', e.target.value)} /></div>
          <div><label className={LABEL}>Contraseña *</label>
            <div className="relative">
              <input className={INPUT + ' pr-10'} type={showPw ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={form.password ?? ''} onChange={e => set('password', e.target.value)} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button onClick={() => {
            if (!form.nombres || !form.apellidos || !form.email || !form.password) { setError('Completa los campos obligatorios.'); return }
            mut.mutate(form as CrearUsuario)
          }} disabled={mut.isPending} className="px-4 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2" style={{ background: '#002f6c' }}>
            <Plus size={15} /> Crear usuario
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel detalle usuario ────────────────────────────────────────────────────
type PanelTab = 'datos' | 'seguridad' | 'quipux'

function PanelDetalle({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
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

  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })
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

  useEffect(() => {
    if (detalle) setForm({ ...detalle })
  }, [detalle])

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

  const toggleActivo = useMutation({
    mutationFn: () => detalle?.activo ? usuariosService.desactivar(usuario.id) : usuariosService.activar(usuario.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); refetch() },
  })

  const toggleBloqueado = useMutation({
    mutationFn: () => detalle?.bloqueado ? usuariosService.desbloquear(usuario.id) : usuariosService.bloquear(usuario.id, 'Bloqueado por administrador'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); refetch() },
  })

  const resetPw = useMutation({
    mutationFn: () => usuariosService.resetPassword(usuario.id, pwForm),
    onSuccess: () => { setPwMsg('Contraseña restablecida correctamente.'); setPwForm('') },
    onError: (e: any) => setPwMsg(e.response?.data?.detail || 'Error al restablecer.'),
  })

  const asignarRol = useMutation({
    mutationFn: (rol_id: number) => usuariosService.asignarRol(usuario.id, { rol: rol_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] }); refetch() },
  })

  const revocarRol = useMutation({
    mutationFn: (rol_id: number) => usuariosService.revocarRol(usuario.id, rol_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] }); refetch() },
  })

  const u = detalle ?? usuario
  const rolesActivos = (u.roles ?? []).filter(r => r.activo)
  const rolesNoAsignados = (rolesDisp ?? []).filter(r => !rolesActivos.some(ra => ra.rol === r.id))

  const TABS: { id: PanelTab; label: string }[] = [
    { id: 'datos', label: 'Datos' },
    { id: 'seguridad', label: 'Seguridad' },
    { id: 'quipux', label: 'Quipux' },
  ]

  return (
    <div style={{
      width: 400, minWidth: 400, background: '#fff',
      borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f5f5f5', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <Avatar n={u.nombres} a={u.apellidos} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0a1628', margin: 0, lineHeight: 1.3 }}>{u.nombre_completo}</p>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0' }}>{u.cargo || '—'} · {u.unidad_siglas || 'Sin unidad'}</p>
            <div style={{ marginTop: 6 }}><EstadoBadge u={u} /></div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, background: '#f9fafb', borderRadius: 10, padding: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 8,
              border: 'none', cursor: 'pointer', transition: 'all .15s',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#002f6c' : '#9ca3af',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ─── TAB DATOS ─── */}
        {tab === 'datos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className={LABEL}>Nombres</label><input className={INPUT} value={form.nombres ?? ''} onChange={e => set('nombres', e.target.value)} /></div>
              <div><label className={LABEL}>Apellidos</label><input className={INPUT} value={form.apellidos ?? ''} onChange={e => set('apellidos', e.target.value)} /></div>
            </div>
            <div><label className={LABEL}>Cédula</label><input className={INPUT} value={form.cedula ?? ''} onChange={e => set('cedula', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className={LABEL}>Tipo</label>
                <select className={INPUT} value={form.tipo ?? 'funcionario'} onChange={e => set('tipo', e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className={LABEL}>Contrato</label>
                <select className={INPUT} value={form.cargo_tipo ?? ''} onChange={e => set('cargo_tipo', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">—</option>
                  {CARGO_TIPOS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
            </div>
            <div><label className={LABEL}>Título profesional</label><input className={INPUT} value={form.titulo ?? ''} onChange={e => set('titulo', e.target.value)} /></div>
            <div><label className={LABEL}>Cargo</label><input className={INPUT} value={form.cargo ?? ''} onChange={e => set('cargo', e.target.value)} /></div>
            <div><label className={LABEL}>Unidad</label>
              <select className={INPUT} value={form.unidad_id ?? ''} onChange={e => set('unidad_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— Sin asignar —</option>
                {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
              </select>
            </div>
            <div><label className={LABEL}>Email institucional</label><input className={INPUT} type="email" value={form.email_institucional ?? ''} onChange={e => set('email_institucional', e.target.value)} /></div>
            <div><label className={LABEL}>Email personal</label><input className={INPUT} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className={LABEL}>Teléfono móvil</label><input className={INPUT} value={form.telefono_movil ?? ''} onChange={e => set('telefono_movil', e.target.value)} /></div>
              <div><label className={LABEL}>Teléfono fijo</label><input className={INPUT} value={form.telefono_fijo ?? ''} onChange={e => set('telefono_fijo', e.target.value)} /></div>
            </div>

            <button onClick={() => guardar.mutate()} disabled={guardar.isPending}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: saved ? '#0f6e56' : '#002f6c', color: '#fff', marginTop: 4 }}>
              {saved ? <><CheckCircle size={15} /> Guardado</> : <><Save size={15} /> {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}</>}
            </button>

            {/* Roles */}
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid #f5f5f5' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Roles asignados</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {rolesActivos.length === 0 && <span style={{ fontSize: 12, color: '#9ca3af' }}>Sin roles</span>}
                {rolesActivos.map(r => (
                  <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: '#e8f1fd', color: '#002f6c', fontSize: 12, fontWeight: 600 }}>
                    <Shield size={11} />
                    {r.rol_codigo}
                    <button onClick={() => revocarRol.mutate(r.rol)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', lineHeight: 1, paddingLeft: 2 }}>×</button>
                  </span>
                ))}
              </div>
              {rolesNoAsignados.length > 0 && (
                <select className={INPUT} defaultValue="" onChange={e => { if (e.target.value) asignarRol.mutate(Number(e.target.value)) }}>
                  <option value="">+ Asignar rol…</option>
                  {rolesNoAsignados.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB SEGURIDAD ─── */}
        {tab === 'seguridad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Estado activo */}
            <div style={{ padding: 14, background: '#f9fafb', borderRadius: 12, border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0a1628', margin: 0 }}>Cuenta activa</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>El usuario {u.activo ? 'puede' : 'no puede'} iniciar sesión</p>
                </div>
                <EstadoBadge u={{ ...u, bloqueado: false }} />
              </div>
              <button onClick={() => toggleActivo.mutate()} disabled={toggleActivo.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: u.activo ? '#fef2f2' : '#f0fdf4', color: u.activo ? '#dc2626' : '#15803d' }}>
                {u.activo ? <><UserX size={14} /> Desactivar cuenta</> : <><UserCheck size={14} /> Activar cuenta</>}
              </button>
            </div>

            {/* Bloqueo */}
            <div style={{ padding: 14, background: '#f9fafb', borderRadius: 12, border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0a1628', margin: 0 }}>Bloqueo de cuenta</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                    {u.bloqueado ? `Motivo: ${u.motivo_bloqueo || '—'}` : 'No está bloqueado'}
                  </p>
                </div>
                {u.bloqueado && <AlertTriangle size={16} className="text-red-500" />}
              </div>
              <button onClick={() => toggleBloqueado.mutate()} disabled={toggleBloqueado.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: u.bloqueado ? '#f0fdf4' : '#fef2f2', color: u.bloqueado ? '#15803d' : '#dc2626' }}>
                {u.bloqueado ? <><Unlock size={14} /> Desbloquear</> : <><Lock size={14} /> Bloquear</>}
              </button>
            </div>

            {/* Reset password */}
            <div style={{ padding: 14, background: '#f9fafb', borderRadius: 12, border: '1px solid #f0f0f0' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0a1628', margin: '0 0 8px' }}>Restablecer contraseña</p>
              <div className="relative" style={{ marginBottom: 8 }}>
                <input className={INPUT + ' pr-10'} type={showPw ? 'text' : 'password'} placeholder="Nueva contraseña (mín. 8 caracteres)" value={pwForm} onChange={e => setPwForm(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwMsg && <p style={{ fontSize: 11, color: pwMsg.includes('correct') ? '#0f6e56' : '#dc2626', marginBottom: 8 }}>{pwMsg}</p>}
              <button onClick={() => { setPwMsg(''); resetPw.mutate() }} disabled={resetPw.isPending || pwForm.length < 8}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: pwForm.length < 8 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, background: '#002f6c', color: '#fff', opacity: pwForm.length < 8 ? 0.5 : 1 }}>
                <Key size={14} /> Restablecer
              </button>
            </div>

            {/* Info acceso */}
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              <p>Último acceso: {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-EC') : '—'}</p>
              <p>Registrado: {u.creado_en ? new Date(u.creado_en).toLocaleDateString('es-EC') : '—'}</p>
            </div>
          </div>
        )}

        {/* ─── TAB QUIPUX ─── */}
        {tab === 'quipux' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
              Exporta la bandeja histórica de Quipux de este u otro funcionario a un archivo Excel.
            </p>

            {/* Buscar usuario Quipux */}
            <div>
              <label className={LABEL}>Buscar funcionario en Quipux</label>
              <input className={INPUT} placeholder="Nombre o cédula…" value={qSearch}
                onChange={e => { setQSearch(e.target.value); setQUsuario(null) }} />
            </div>

            {qSearch.length >= 2 && quipuxUsuarios && quipuxUsuarios.length > 0 && !qUsuario && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', maxHeight: 180, overflowY: 'auto' }}>
                {quipuxUsuarios.map(qu => (
                  <div key={qu.usua_codi} onClick={() => { setQUsuario(qu); setQSearch(qu.usua_nombre) }}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', fontSize: 12 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <p style={{ fontWeight: 600, color: '#0a1628', margin: 0 }}>{qu.usua_nombre}</p>
                    <p style={{ color: '#9ca3af', margin: 0 }}>{qu.usua_cedula} · {qu.depe_nomb}</p>
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
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13,
                background: descargando ? '#e5e7eb' : '#002f6c', color: descargando ? '#6b7280' : '#fff',
              }}>
              <Download size={15} />
              {descargando ? 'Generando Excel…' : `Descargar bandeja Quipux${qUsuario ? '' : ` (${u.nombres})`}`}
            </button>

            {!u.cedula && !qUsuario && (
              <p style={{ fontSize: 11, color: '#f59e0b', background: '#fffbeb', padding: '8px 12px', borderRadius: 8 }}>
                Este usuario no tiene cédula registrada. Busca un funcionario en el campo de arriba.
              </p>
            )}

            <p style={{ fontSize: 10, color: '#9ca3af' }}>
              El archivo Excel incluirá todas las bandejas (recibidos, enviados, en elaboración, archivados, etc.) con número de oficio, fecha, asunto y estado.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroActivo, setFiltroActivo] = useState<'' | 'true' | 'false'>('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [seleccionado, setSeleccionado] = useState<Usuario | null>(null)
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => { setPage(1) }, [busqueda, filtroTipo, filtroActivo])

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios', busqueda, filtroTipo, filtroActivo, page],
    queryFn: () => usuariosService.listar({
      ...(busqueda ? { search: busqueda } : {}),
      ...(filtroTipo ? { tipo: filtroTipo } : {}),
      ...(filtroActivo ? { activo: filtroActivo } : {}),
      page: String(page),
    }),
  })

  const usuarios = data?.results ?? []

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      activo ? usuariosService.desactivar(id) : usuariosService.activar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const toggleBloqueado = useMutation({
    mutationFn: ({ id, bloqueado }: { id: number; bloqueado: boolean }) =>
      bloqueado ? usuariosService.desbloquear(id) : usuariosService.bloquear(id, 'Bloqueado por administrador'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 96px)', gap: 0, overflow: 'hidden' }}>
      {mostrarModal && <ModalCrear onClose={() => setMostrarModal(false)} />}

      {/* Lista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderRadius: seleccionado ? '14px 0 0 14px' : 14, border: '1px solid #f0f0f0' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f5f5', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0a1628', margin: 0 }}>Usuarios del sistema</h1>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{data?.count ?? 0} usuarios registrados</p>
            </div>
            <button onClick={() => setMostrarModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#002f6c', color: '#fff' }}>
              <Plus size={15} /> Nuevo usuario
            </button>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
              <input type="text" placeholder="Buscar por nombre, email o cédula..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 10, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 10, outline: 'none', background: '#fff' }}>
              <option value="">Todos los tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {([['', 'Todos'], ['true', 'Activos'], ['false', 'Inactivos']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFiltroActivo(val)}
                  style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', borderRight: val !== 'false' ? '1px solid #e5e7eb' : 'none', background: filtroActivo === val ? '#002f6c' : '#fff', color: filtroActivo === val ? '#fff' : '#6b7280' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, fontSize: 13, color: '#9ca3af' }}>Cargando...</div>
          ) : usuarios.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, color: '#9ca3af' }}>
              <Users size={28} style={{ marginBottom: 8, opacity: 0.4 }} /><p style={{ fontSize: 13 }}>Sin resultados</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f5f5f5' }}>
                  {['Usuario', 'Unidad / Cargo', 'Estado', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const isSel = seleccionado?.id === u.id
                  return (
                    <tr key={u.id} onClick={() => setSeleccionado(isSel ? null : u)}
                      style={{ borderBottom: '1px solid #f9f9f9', cursor: 'pointer', background: isSel ? '#f0f4ff' : 'transparent', transition: 'background .1s' }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f8faff' }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar n={u.nombres} a={u.apellidos} size={34} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#0a1628', margin: 0 }}>{u.nombre_completo}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <p style={{ fontSize: 12, color: '#374151', margin: 0, fontWeight: 500 }}>{u.unidad_siglas || '—'}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0' }}>{u.cargo || '—'}</p>
                      </td>
                      <td style={{ padding: '10px 16px' }}><EstadoBadge u={u} /></td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                          <button title={u.activo ? 'Inactivar' : 'Activar'}
                            onClick={() => toggleActivo.mutate({ id: u.id, activo: u.activo })}
                            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: u.activo ? '#9ca3af' : '#22c55e' }}>
                            {u.activo ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                          <button title={u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                            onClick={() => toggleBloqueado.mutate({ id: u.id, bloqueado: u.bloqueado })}
                            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: u.bloqueado ? '#22c55e' : '#9ca3af' }}>
                            {u.bloqueado ? <Unlock size={15} /> : <Lock size={15} />}
                          </button>
                          <button title="Ver detalle"
                            style={{ padding: 6, borderRadius: 8, border: 'none', background: isSel ? '#002f6c' : 'transparent', cursor: 'pointer', color: isSel ? '#fff' : '#9ca3af' }}>
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

        {/* Paginación */}
        {(data?.count ?? 0) > 20 && (() => {
          const totalPaginas = Math.ceil((data?.count ?? 0) / 20)
          const desde = (page - 1) * 20 + 1
          const hasta = Math.min(page * 20, data?.count ?? 0)
          return (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                {desde}–{hasta} de {data?.count} usuarios
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#d1d5db' : '#374151' }}>
                  ← Anterior
                </button>
                {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => {
                  // Ventana de páginas centrada en la actual
                  let p = i + 1
                  if (totalPaginas > 7) {
                    const start = Math.max(1, Math.min(page - 3, totalPaginas - 6))
                    p = start + i
                  }
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: 30, height: 30, fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', background: page === p ? '#002f6c' : '#fff', color: page === p ? '#fff' : '#374151' }}>
                      {p}
                    </button>
                  )
                })}
                <button
                  disabled={page === totalPaginas}
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page === totalPaginas ? 'not-allowed' : 'pointer', color: page === totalPaginas ? '#d1d5db' : '#374151' }}>
                  Siguiente →
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Panel detalle */}
      {seleccionado && (
        <PanelDetalle
          key={seleccionado.id}
          usuario={seleccionado}
          onClose={() => setSeleccionado(null)}
        />
      )}
    </div>
  )
}
