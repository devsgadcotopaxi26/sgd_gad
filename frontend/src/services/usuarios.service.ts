import api from './api'

export interface Usuario {
  id: number
  uuid: string
  tipo: string
  cedula: string
  nombres: string
  apellidos: string
  nombre_completo: string
  email: string
  email_institucional: string | null
  telefono_movil: string | null
  telefono_fijo: string | null
  unidad_id: number | null
  unidad_nombre: string | null
  unidad_siglas: string | null
  cargo: string
  titulo: string
  cargo_tipo: number
  fecha_ingreso: string | null
  firma_electronica: boolean
  activo: boolean
  bloqueado: boolean
  motivo_bloqueo?: string
  ultimo_acceso: string | null
  creado_en: string
  is_superuser?: boolean
  roles?: { id: number; rol: number; rol_codigo: string; rol_nombre: string; activo: boolean }[]
}

export interface CrearUsuario {
  cedula?: string
  nombres: string
  apellidos: string
  email: string
  email_institucional?: string
  telefono_movil?: string
  telefono_fijo?: string
  unidad?: number
  cargo?: string
  titulo?: string
  cargo_tipo?: number
  tipo: string
  password: string
}

export const usuariosService = {
  listar: (params?: Record<string, string>) =>
    api.get<{ results: Usuario[]; count: number }>('/usuarios/', { params }).then(r => r.data),

  obtener: (id: number) =>
    api.get<Usuario>(`/usuarios/${id}/`).then(r => r.data),

  crear: (data: CrearUsuario) =>
    api.post<Usuario>('/usuarios/', data).then(r => r.data),

  actualizar: (id: number, data: Partial<Usuario>) =>
    api.patch<Usuario>(`/usuarios/${id}/`, data).then(r => r.data),

  bloquear: (id: number, motivo: string) =>
    api.post(`/usuarios/${id}/bloquear/`, { motivo }).then(r => r.data),

  desbloquear: (id: number) =>
    api.post(`/usuarios/${id}/desbloquear/`).then(r => r.data),

  activar: (id: number) =>
    api.post(`/usuarios/${id}/activar/`).then(r => r.data),

  desactivar: (id: number) =>
    api.post(`/usuarios/${id}/desactivar/`).then(r => r.data),

  resetPassword: (id: number, password: string) =>
    api.post(`/usuarios/${id}/reset_password/`, { password }).then(r => r.data),

  asignarRol: (id: number, data: { rol: number; unidad?: number }) =>
    api.post(`/usuarios/${id}/asignar_rol/`, data).then(r => r.data),

  revocarRol: (id: number, rol_id: number) =>
    api.post(`/usuarios/${id}/revocar_rol/`, { rol_id }).then(r => r.data),

  perfil: () =>
    api.get<Usuario>('/usuarios/auth/perfil/').then(r => r.data),

  cambiarPassword: (data: { password_actual: string; password_nuevo: string }) =>
    api.post<{ detail: string }>('/usuarios/auth/cambiar-password/', data).then(r => r.data),

  roles: () =>
    api.get<{ count: number; results: { id: number; codigo: string; nombre: string; nivel: number }[] }>('/usuarios/roles/')
      .then(r => Array.isArray(r.data) ? r.data : (r.data.results ?? [])),
}
