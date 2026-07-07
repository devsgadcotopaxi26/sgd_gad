import api from './api'

export interface Unidad {
  id: number
  codigo: string
  nombre: string
  nombre_corto: string
  siglas: string
  tipo: string
  activo: boolean
  padre?: number | null
  nivel_nombre?: string
  padre_nombre?: string
  padre_siglas?: string
  email_oficial?: string
  telefono?: string
  piso_ubicacion?: string
  mision?: string
  orden_display?: number
  num_hijos?: number
  hijos?: Unidad[]
  ruta?: string
}

export interface Nivel {
  id: number
  codigo: string
  nombre: string
  orden: number
  activo: boolean
}

export const organizacionService = {
  arbol: () =>
    api.get<Unidad[]>('/organizacion/unidades/arbol/').then(r => r.data),

  listar: (params?: Record<string, string>) =>
    api.get<{ results: Unidad[]; count: number }>('/organizacion/unidades/', { params }).then(r => r.data),

  obtener: (id: number) =>
    api.get<Unidad>(`/organizacion/unidades/${id}/`).then(r => r.data),

  crear: (data: Partial<Unidad>) =>
    api.post<Unidad>('/organizacion/unidades/', data).then(r => r.data),

  actualizar: (id: number, data: Partial<Unidad>) =>
    api.patch<Unidad>(`/organizacion/unidades/${id}/`, data).then(r => r.data),
  activar: (id: number) =>
  api.post(`/organizacion/unidades/${id}/activar/`).then(r => r.data),

desactivar: (id: number) =>
  api.post(`/organizacion/unidades/${id}/desactivar/`).then(r => r.data),

  select: (tipo?: string) =>
    api.get<Unidad[]>('/organizacion/unidades/select/', {
      params: tipo ? { tipo } : undefined,
    }).then(r => r.data),

  niveles: () =>
    api.get<Nivel[]>('/organizacion/niveles/').then(r => r.data),
}