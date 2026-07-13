import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import { usuariosService } from '@/services/usuarios.service'
import {
  User, Mail, Phone, Building2, Calendar,
  Lock, Save, Shield, CheckCircle, Eye, EyeOff, Info
} from 'lucide-react'

export default function PerfilPage() {
  const { usuario: authUser } = useAuthStore()
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const [tabActiva, setTab]     = useState<'info' | 'password'>('info')
  const [guardado, setGuardado] = useState(false)
  const [showPwActual, setShowPwActual] = useState(false)
  const [showPwNuevo,  setShowPwNuevo]  = useState(false)
  const [formPw, setFormPw] = useState({ password_actual: '', password_nuevo: '', confirmar: '' })
  const [errorPw, setErrorPw]   = useState('')
  const [exitoPw, setExitoPw]   = useState(false)

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil'],
    queryFn:  usuariosService.perfil,
  })

  const [form, setForm] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const actualizarMutation = useMutation({
    mutationFn: (data: any) => usuariosService.actualizar(authUser!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil'] })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    },
  })

  const cambiarPwMutation = useMutation({
    mutationFn: usuariosService.cambiarPassword,
    onSuccess: () => {
      setFormPw({ password_actual: '', password_nuevo: '', confirmar: '' })
      setErrorPw('')
      setExitoPw(true)
      setTimeout(() => setExitoPw(false), 4000)
    },
    onError: (e: any) => {
      const data = e.response?.data
      if (data?.password_actual) setErrorPw(Array.isArray(data.password_actual) ? data.password_actual[0] : data.password_actual)
      else setErrorPw(data?.detail || data?.non_field_errors?.[0] || 'Error al cambiar contraseña')
    },
  })

  const handleGuardar = () => {
    if (Object.keys(form).length === 0) return
    actualizarMutation.mutate(form)
  }

  const handleCambiarPw = () => {
    setErrorPw('')
    if (!formPw.password_actual || !formPw.password_nuevo) {
      setErrorPw('Completa todos los campos'); return
    }
    if (formPw.password_nuevo !== formPw.confirmar) {
      setErrorPw('Las contraseñas nuevas no coinciden'); return
    }
    if (formPw.password_nuevo.length < 8) {
      setErrorPw('La contraseña debe tener al menos 8 caracteres'); return
    }
    cambiarPwMutation.mutate({
      password_actual: formPw.password_actual,
      password_nuevo:  formPw.password_nuevo,
    })
  }

  const inputStyle = { background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = T.accentDk)
  const inputBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = T.rowBd)
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: T.rowSub, marginBottom: 6 }

  const iniciales = perfil
    ? `${perfil.nombres?.[0] ?? ''}${perfil.apellidos?.[0] ?? ''}`.toUpperCase()
    : '??'

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, color: T.rowSub, fontSize: 14 }}>
      Cargando perfil...
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.rowTxt }}>Mi perfil</h1>
        <p style={{ fontSize: 14, color: T.rowSub, marginTop: 2 }}>Consulta tu información y actualiza tus datos de contacto</p>
      </div>

      {/* Card de perfil */}
      <div style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, flexShrink: 0, background: 'linear-gradient(135deg,#002f6c,#0052cc)', color: '#fff' }}>
            {iniciales}
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.rowTxt }}>{perfil?.nombre_completo}</h2>
            <p style={{ fontSize: 14, color: T.rowSub, marginTop: 2 }}>{perfil?.cargo || 'Sin cargo asignado'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#e8f1fd', color: '#002f6c' }}>
                {perfil?.tipo}
              </span>
              {perfil?.firma_electronica && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#f0fdf4', color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Shield size={11} /> Firma BCE activa
                </span>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: perfil?.activo ? '#f0fdf4' : '#fef2f2', color: perfil?.activo ? '#15803d' : '#dc2626' }}>
                {perfil?.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['info','Información personal'],['password','Cambiar contraseña']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all .15s',
              background: tabActiva === k ? T.accentDk : T.rowHv,
              color: tabActiva === k ? '#fff' : T.rowSub }}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab: Información personal */}
      {tabActiva === 'info' && (
        <div style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, padding: 24 }}>

          {/* Aviso de solo lectura */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, marginBottom: 20, background: '#fffbeb', border: '0.5px solid #fcd34d', color: '#92400e', fontSize: 12 }}>
            <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Los datos personales, cargo y unidad son gestionados por Administración. Solo puedes actualizar tus datos de contacto.</span>
          </div>

          {/* Datos de identidad — solo lectura */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.rowSub, marginBottom: 12 }}>Datos personales</p>
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
              <div>
                <label style={labelStyle}><User size={11} className="inline mr-1" />Nombres</label>
                <div style={{ background: T.rowHv, color: T.rowSub, border: `1px solid ${T.rowBd}`, padding: '10px 12px', borderRadius: 12, fontSize: 14 }}>{perfil?.nombres || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Apellidos</label>
                <div style={{ background: T.rowHv, color: T.rowSub, border: `1px solid ${T.rowBd}`, padding: '10px 12px', borderRadius: 12, fontSize: 14 }}>{perfil?.apellidos || '—'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Cédula</label>
                <div style={{ background: T.rowHv, color: T.rowSub, border: `1px solid ${T.rowBd}`, padding: '10px 12px', borderRadius: 12, fontSize: 14 }}>{perfil?.cedula || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}><Calendar size={11} className="inline mr-1" />Fecha de ingreso</label>
                <div style={{ background: T.rowHv, color: T.rowSub, border: `1px solid ${T.rowBd}`, padding: '10px 12px', borderRadius: 12, fontSize: 14 }}>{perfil?.fecha_ingreso || '—'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}><Building2 size={11} className="inline mr-1" />Unidad</label>
                <div style={{ background: T.rowHv, color: T.rowSub, border: `1px solid ${T.rowBd}`, padding: '10px 12px', borderRadius: 12, fontSize: 14 }}>{perfil?.unidad_nombre || '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Cargo</label>
                <div style={{ background: T.rowHv, color: T.rowSub, border: `1px solid ${T.rowBd}`, padding: '10px 12px', borderRadius: 12, fontSize: 14 }}>{perfil?.cargo || '—'}</div>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: `1px solid ${T.rowBd}`, margin: '20px 0' }} />

          {/* Datos de contacto — editables */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.rowSub, marginBottom: 12 }}>
              Datos de contacto <span style={{ color: T.accentDk }}>(editables)</span>
            </p>

            {guardado && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
                <CheckCircle size={15} /> Cambios guardados correctamente
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}><Mail size={11} className="inline mr-1" />Correo personal</label>
                <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                  style={inputStyle} type="email"
                  defaultValue={perfil?.email}
                  onChange={e => set('email', e.target.value)}
                  onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label style={labelStyle}><Mail size={11} className="inline mr-1" />Correo institucional</label>
                <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                  style={inputStyle} type="email"
                  defaultValue={perfil?.email_institucional ?? ''}
                  onChange={e => set('email_institucional', e.target.value)}
                  onFocus={inputFocus} onBlur={inputBlur} />
              </div>
              <div>
                <label style={labelStyle}><Phone size={11} className="inline mr-1" />Teléfono móvil</label>
                <input className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                  style={inputStyle}
                  defaultValue={perfil?.telefono_movil ?? ''}
                  onChange={e => set('telefono_movil', e.target.value)}
                  onFocus={inputFocus} onBlur={inputBlur} />
              </div>
            </div>
          </div>

          {/* Info sistema */}
          <div style={{ paddingTop: 20, borderTop: `1px solid ${T.rowBd}`, marginTop: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.rowSub, marginBottom: 12 }}>Información del sistema</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Último acceso', value: perfil?.ultimo_acceso ? new Date(perfil.ultimo_acceso).toLocaleString('es-EC') : 'Nunca' },
                { label: 'Cuenta creada',  value: perfil?.creado_en    ? new Date(perfil.creado_en).toLocaleDateString('es-EC')    : '—'     },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: 12, borderRadius: 12, background: T.statsBg }}>
                  <p style={{ fontSize: 10, color: T.rowSub, fontWeight: 500 }}>{label}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, marginTop: 2 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16 }}>
            <button onClick={handleGuardar} disabled={actualizarMutation.isPending || Object.keys(form).length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#fff', borderRadius: 12, border: 'none',
                background: Object.keys(form).length === 0 ? T.rowBd : actualizarMutation.isPending ? '#4a90e2' : T.accentDk,
                cursor: Object.keys(form).length === 0 ? 'not-allowed' : 'pointer' }}>
              {actualizarMutation.isPending
                ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                : <Save size={15} />}
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* Tab: Cambiar contraseña */}
      {tabActiva === 'password' && (
        <div style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {errorPw && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{errorPw}</div>
          )}
          {exitoPw && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              <CheckCircle size={15} /> Contraseña cambiada correctamente
            </div>
          )}

          <div>
            <label style={labelStyle}><Lock size={11} className="inline mr-1" />Contraseña actual</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwActual ? 'text' : 'password'}
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none pr-10"
                style={inputStyle}
                placeholder="••••••••"
                value={formPw.password_actual}
                onChange={e => setFormPw(f => ({ ...f, password_actual: e.target.value }))}
                onFocus={inputFocus} onBlur={inputBlur} />
              <button type="button" onClick={() => setShowPwActual(!showPwActual)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.rowSub }}>
                {showPwActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nueva contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwNuevo ? 'text' : 'password'}
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none pr-10"
                style={inputStyle}
                placeholder="Mínimo 8 caracteres"
                value={formPw.password_nuevo}
                onChange={e => setFormPw(f => ({ ...f, password_nuevo: e.target.value }))}
                onFocus={inputFocus} onBlur={inputBlur} />
              <button type="button" onClick={() => setShowPwNuevo(!showPwNuevo)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.rowSub }}>
                {showPwNuevo ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Confirmar nueva contraseña</label>
            <input
              type="password"
              className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
              style={{ ...inputStyle, borderColor: formPw.confirmar && formPw.confirmar !== formPw.password_nuevo ? '#f87171' : T.rowBd }}
              placeholder="Repite la nueva contraseña"
              value={formPw.confirmar}
              onChange={e => setFormPw(f => ({ ...f, confirmar: e.target.value }))}
              onFocus={e => (e.currentTarget.style.borderColor = T.accentDk)}
              onBlur={e => (e.currentTarget.style.borderColor = formPw.confirmar && formPw.confirmar !== formPw.password_nuevo ? '#f87171' : T.rowBd)} />
            {formPw.confirmar && formPw.confirmar !== formPw.password_nuevo && (
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Las contraseñas no coinciden</p>
            )}
          </div>

          <div style={{ padding: 16, borderRadius: 12, fontSize: 12, color: T.rowSub, background: T.statsBg }}>
            <p style={{ fontWeight: 600, color: T.rowTxt, marginBottom: 8 }}>Requisitos:</p>
            {([
              ['Mínimo 8 caracteres',         formPw.password_nuevo.length >= 8],
              ['Al menos una mayúscula',        /[A-Z]/.test(formPw.password_nuevo)],
              ['Al menos un número',            /[0-9]/.test(formPw.password_nuevo)],
            ] as [string, boolean][]).map(([req, ok]) => (
              <div key={req} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: ok ? '#f0fdf4' : T.rowHv, border: `1px solid ${ok ? '#86efac' : T.rowBd}` }}>
                  {ok && <CheckCircle size={9} style={{ color: '#15803d' }} />}
                </div>
                <span style={{ color: ok ? '#15803d' : T.rowSub }}>{req}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <button onClick={handleCambiarPw} disabled={cambiarPwMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: cambiarPwMutation.isPending ? '#4a90e2' : T.accentDk }}>
              {cambiarPwMutation.isPending
                ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                : <Lock size={15} />}
              Cambiar contraseña
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
