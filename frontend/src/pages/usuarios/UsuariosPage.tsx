import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usuariosService, CrearUsuario } from '@/services/usuarios.service'
import { organizacionService } from '@/services/organizacion.service'
import {
  Users, Search, Plus, Lock, Unlock, Shield,
  Mail, Building2, ChevronDown, X, Eye, EyeOff
} from 'lucide-react'

const TIPOS = ['funcionario', 'ciudadano', 'sistema']

const BADGE: Record<string, { bg: string; text: string }> = {
  funcionario: { bg: '#e8f1fd', text: '#002f6c' },
  ciudadano:   { bg: '#e8f5ee', text: '#1d6a3a' },
  sistema:     { bg: '#f5f3ff', text: '#4c1d95' },
}

function Avatar({ nombre, apellido }: { nombre: string; apellido: string }) {
  const iniciales = `${nombre?.[0] ?? '?'}${apellido?.[0] ?? ''}`.toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: '#e8f1fd', color: '#002f6c' }}>
      {iniciales}
    </div>
  )
}

function ModalCrear({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState<Partial<CrearUsuario>>({ tipo: 'funcionario' })
  const [error, setError] = useState('')

  const { data: unidades } = useQuery({
    queryKey: ['unidades-select'],
    queryFn: () => organizacionService.select(),
  })

  const mutation = useMutation({
    mutationFn: (data: CrearUsuario) => usuariosService.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
    },
    onError: (e: any) => {
      const data = e.response?.data
      setError(
        typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : 'Error al crear usuario'
      )
    },
  })

  const set = (k: keyof CrearUsuario, v: any) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.nombres || !form.apellidos || !form.email || !form.password) {
      setError('Completa los campos obligatorios.')
      return
    }
    mutation.mutate(form as CrearUsuario)
  }

  const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Nuevo usuario</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Nombres *
              </label>
              <input className={inputClass} placeholder="Nombres"
                value={form.nombres ?? ''} onChange={e => set('nombres', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Apellidos *
              </label>
              <input className={inputClass} placeholder="Apellidos"
                value={form.apellidos ?? ''} onChange={e => set('apellidos', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Correo electrónico *
            </label>
            <input className={inputClass} type="email" placeholder="usuario@cotopaxi.gob.ec"
              value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Cédula
              </label>
              <input className={inputClass} placeholder="0000000000"
                value={form.cedula ?? ''} onChange={e => set('cedula', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Tipo *
              </label>
              <select className={inputClass}
                value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Unidad organizativa
            </label>
            <select className={inputClass}
              value={form.unidad ?? ''} onChange={e => set('unidad', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">— Sin asignar —</option>
              {unidades?.map(u => (
                <option key={u.id} value={u.id}>
                  {u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Cargo
            </label>
            <input className={inputClass} placeholder="Ej: Analista de sistemas"
              value={form.cargo ?? ''} onChange={e => set('cargo', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Contraseña *
            </label>
            <div className="relative">
              <input className={inputClass + ' pr-10'} type={showPw ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={form.password ?? ''} onChange={e => set('password', e.target.value)} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={mutation.isPending}
            className="px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-colors flex items-center gap-2"
            style={{ background: mutation.isPending ? '#4a90e2' : '#002f6c' }}>
            {mutation.isPending ? (
              <span className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
            ) : <Plus size={15} />}
            Crear usuario
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios', busqueda, filtroTipo],
    queryFn: () => usuariosService.listar({
      ...(busqueda   ? { search: busqueda }   : {}),
      ...(filtroTipo ? { tipo: filtroTipo }   : {}),
    }),
  })

  const bloquearMutation = useMutation({
    mutationFn: ({ id, bloqueado }: { id: number; bloqueado: boolean }) =>
      bloqueado ? usuariosService.desbloquear(id) : usuariosService.bloquear(id, 'Bloqueado manualmente'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const usuarios = data?.results ?? []

  return (
    <div>
      {mostrarModal && <ModalCrear onClose={() => setMostrarModal(false)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuarios del sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.count ?? 0} usuarios registrados
          </p>
        </div>
        <button onClick={() => setMostrarModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-colors"
          style={{ background: '#002f6c' }}>
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre, email o cédula..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] bg-white">
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Cargando usuarios...
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No se encontraron usuarios</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unidad</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar nombre={u.nombres} apellido={u.apellidos} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.nombre_completo}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail size={11} /> {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Building2 size={13} className="text-gray-400" />
                      <span className="truncate max-w-[180px]">
                        {u.unidad_siglas
                          ? <><span className="font-medium">{u.unidad_siglas}</span> · {u.cargo || '—'}</>
                          : <span className="text-gray-400">Sin asignar</span>
                        }
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: BADGE[u.tipo]?.bg, color: BADGE[u.tipo]?.text }}>
                      {u.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                      u.bloqueado
                        ? 'bg-red-50 text-red-700'
                        : u.activo
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        u.bloqueado ? 'bg-red-500' : u.activo ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      {u.bloqueado ? 'Bloqueado' : u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => bloquearMutation.mutate({ id: u.id, bloqueado: u.bloqueado })}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title={u.bloqueado ? 'Desbloquear' : 'Bloquear'}>
                        {u.bloqueado
                          ? <Unlock size={15} className="text-green-600" />
                          : <Lock size={15} className="text-gray-400" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}