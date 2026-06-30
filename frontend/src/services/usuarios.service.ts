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
  unidad_id: number | null
  unidad_nombre: string | null
  unidad_siglas: string | null
  cargo: string
  titulo: string
  cargo_tipo: number
  firma_electronica: boolean
  activo: boolean
  bloqueado: boolean
  ultimo_acceso: string | null
  creado_en: string
  roles?: { rol_id: number; codigo: string; nombre: string; unidad_id: number | null }[]
}

export interface CrearUsuario {
  cedula: string
  nombres: string
  apellidos: string
  email: string
  email_institucional?: string
  telefono_movil?: string
  unidad?: number
  cargo?: string
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

  actualizar: (id: number, data: Partial<CrearUsuario>) =>
    api.patch<Usuario>(`/usuarios/${id}/`, data).then(r => r.data),

  bloquear: (id: number, motivo: string) =>
    api.post(`/usuarios/${id}/bloquear/`, { motivo }).then(r => r.data),

  desbloquear: (id: number) =>
    api.post(`/usuarios/${id}/desbloquear/`).then(r => r.data),

  asignarRol: (id: number, data: { rol: number; unidad?: number }) =>
    api.post(`/usuarios/${id}/asignar_rol/`, data).then(r => r.data),

  perfil: () =>
    api.get<Usuario>('/usuarios/auth/perfil/').then(r => r.data),

  roles: () =>
    api.get<{ id: number; codigo: string; nombre: string; nivel: number }[]>('/usuarios/roles/').then(r => r.data),
}