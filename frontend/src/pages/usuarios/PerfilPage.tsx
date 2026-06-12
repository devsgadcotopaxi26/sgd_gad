import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { usuariosService } from '@/services/usuarios.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  User, Mail, Phone, Building2, Calendar,
  Lock, Save, Shield, CheckCircle, Eye, EyeOff
} from 'lucide-react'

export default function PerfilPage() {
  const { usuario: authUser } = useAuthStore()
  const qc = useQueryClient()
  const [tabActiva, setTab]   = useState<'info' | 'password'>('info')
  const [guardado, setGuardado] = useState(false)
  const [showPwActual, setShowPwActual] = useState(false)
  const [showPwNuevo, setShowPwNuevo]   = useState(false)
  const [formPw, setFormPw] = useState({ password_actual: '', password_nuevo: '', confirmar: '' })
  const [errorPw, setErrorPw] = useState('')

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil'],
    queryFn:  usuariosService.perfil,
  })

  const { data: unidades } = useQuery({
    queryKey: ['unidades-select'],
    queryFn: () => organizacionService.select(),
  })

  const [form, setForm] = useState<Record<string, any>>({})

  const actualizarMutation = useMutation({
    mutationFn: (data: any) => usuariosService.actualizar(authUser!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil'] })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    },
  })

  const cambiarPwMutation = useMutation({
    mutationFn: (data: any) =>
      usuariosService.actualizar(authUser!.id, data),
    onSuccess: () => {
      setFormPw({ password_actual: '', password_nuevo: '', confirmar: '' })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    },
    onError: (e: any) => setErrorPw(e.response?.data?.detail || 'Error al cambiar contraseña'),
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
      setErrorPw('Las contraseñas no coinciden'); return
    }
    if (formPw.password_nuevo.length < 8) {
      setErrorPw('La contraseña debe tener al menos 8 caracteres'); return
    }
    cambiarPwMutation.mutate({ password: formPw.password_nuevo })
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const cls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  const iniciales = perfil
    ? `${perfil.nombres?.[0] ?? ''}${perfil.apellidos?.[0] ?? ''}`.toUpperCase()
    : '??'

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Cargando perfil...</div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-400 mt-0.5">Administra tu información personal y credenciales</p>
      </div>

      {/* Card de perfil */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #002f6c, #0052cc)', color: '#fff' }}>
            {iniciales}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{perfil?.nombre_completo}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{perfil?.cargo || 'Sin cargo asignado'}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#e8f1fd', color: '#002f6c' }}>
                {perfil?.tipo}
              </span>
              {perfil?.firma_electronica && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ background: '#f0fdf4', color: '#15803d' }}>
                  <Shield size={11} /> Firma BCE activa
                </span>
              )}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: perfil?.activo ? '#f0fdf4' : '#fef2f2', color: perfil?.activo ? '#15803d' : '#dc2626' }}>
                {perfil?.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[['info','Información personal'],['password','Cambiar contraseña']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className="px-4 py-2 text-sm font-semibold rounded-xl transition-all"
            style={{ background: tabActiva === k ? '#002f6c' : '#f3f4f6', color: tabActiva === k ? '#fff' : '#6b7280' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Alerta guardado */}
      {guardado && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
          <CheckCircle size={15} /> Cambios guardados correctamente
        </div>
      )}

      {/* Tab: Información personal */}
      {tabActiva === 'info' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                <User size={11} className="inline mr-1" /> Nombres
              </label>
              <input className={cls}
                defaultValue={perfil?.nombres}
                onChange={e => set('nombres', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Apellidos</label>
              <input className={cls}
                defaultValue={perfil?.apellidos}
                onChange={e => set('apellidos', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              <Mail size={11} className="inline mr-1" /> Correo electrónico
            </label>
            <input className={cls} type="email"
              defaultValue={perfil?.email}
              onChange={e => set('email', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              <Mail size={11} className="inline mr-1" /> Correo institucional
            </label>
            <input className={cls} type="email"
              defaultValue={perfil?.email_institucional ?? ''}
              onChange={e => set('email_institucional', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                <Phone size={11} className="inline mr-1" /> Teléfono móvil
              </label>
              <input className={cls}
                defaultValue={perfil?.telefono_movil ?? ''}
                onChange={e => set('telefono_movil', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Cédula</label>
              <input className={cls}
                defaultValue={perfil?.cedula ?? ''}
                onChange={e => set('cedula', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              <Building2 size={11} className="inline mr-1" /> Unidad organizativa
            </label>
            <select className={cls}
              defaultValue={perfil?.unidad_id ?? ''}
              onChange={e => set('unidad', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Sin asignar —</option>
              {unidades?.map(u => (
                <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Cargo</label>
            <input className={cls}
              defaultValue={perfil?.cargo ?? ''}
              onChange={e => set('cargo', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              <Calendar size={11} className="inline mr-1" /> Fecha de ingreso
            </label>
            <input type="date" className={cls}
              defaultValue={perfil?.fecha_ingreso ?? ''}
              onChange={e => set('fecha_ingreso', e.target.value)} />
          </div>

          {/* Info de solo lectura */}
          <div className="pt-2 border-t border-gray-50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Información del sistema</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Último acceso', value: perfil?.ultimo_acceso ? new Date(perfil.ultimo_acceso).toLocaleString('es-EC') : 'Nunca' },
                { label: 'Cuenta creada', value: perfil?.creado_en ? new Date(perfil.creado_en).toLocaleDateString('es-EC') : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: '#f8faff' }}>
                  <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleGuardar} disabled={actualizarMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl"
              style={{ background: actualizarMutation.isPending ? '#4a90e2' : '#002f6c' }}>
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
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
          {errorPw && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{errorPw}</div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              <Lock size={11} className="inline mr-1" /> Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showPwActual ? 'text' : 'password'}
                className={cls + ' pr-10'}
                placeholder="••••••••"
                value={formPw.password_actual}
                onChange={e => setFormPw(f => ({ ...f, password_actual: e.target.value }))} />
              <button type="button" onClick={() => setShowPwActual(!showPwActual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPwNuevo ? 'text' : 'password'}
                className={cls + ' pr-10'}
                placeholder="Mínimo 8 caracteres"
                value={formPw.password_nuevo}
                onChange={e => setFormPw(f => ({ ...f, password_nuevo: e.target.value }))} />
              <button type="button" onClick={() => setShowPwNuevo(!showPwNuevo)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwNuevo ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Confirmar nueva contraseña</label>
            <input
              type="password"
              className={cls + (formPw.confirmar && formPw.confirmar !== formPw.password_nuevo ? ' border-red-300' : '')}
              placeholder="Repite la nueva contraseña"
              value={formPw.confirmar}
              onChange={e => setFormPw(f => ({ ...f, confirmar: e.target.value }))} />
            {formPw.confirmar && formPw.confirmar !== formPw.password_nuevo && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <div className="p-4 rounded-xl text-xs text-gray-500 space-y-1" style={{ background: '#f8faff' }}>
            <p className="font-semibold text-gray-700 mb-2">Requisitos de seguridad:</p>
            {[
              ['Mínimo 8 caracteres',           formPw.password_nuevo.length >= 8],
              ['Al menos una letra mayúscula',   /[A-Z]/.test(formPw.password_nuevo)],
              ['Al menos un número',             /[0-9]/.test(formPw.password_nuevo)],
            ].map(([req, ok]) => (
              <div key={req as string} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: ok ? '#f0fdf4' : '#f3f4f6', border: `1px solid ${ok ? '#86efac' : '#e5e7eb'}` }}>
                  {ok && <CheckCircle size={9} style={{ color: '#15803d' }} />}
                </div>
                <span style={{ color: ok ? '#15803d' : '#9ca3af' }}>{req as string}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleCambiarPw} disabled={cambiarPwMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl"
              style={{ background: cambiarPwMutation.isPending ? '#4a90e2' : '#002f6c' }}>
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