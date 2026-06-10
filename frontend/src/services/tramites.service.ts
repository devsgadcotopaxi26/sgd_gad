import api from './api'

export interface Persona {
  id: number
  tipo_persona: string
  tipo_identificacion: string
  numero_identificacion: string
  nombres: string
  apellidos: string
  nombre_completo: string
  email: string
  telefono_movil: string
  activo: boolean
}

export interface Categoria {
  id: number
  codigo: string
  nombre: string
  activo: boolean
}

export interface TipoTramite {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  dias_plazo: number
  costo: number
  categoria_nombre: string
  unidad_responsable_nombre: string
  unidad_responsable_siglas: string
  en_linea: boolean
  activo: boolean
}

export interface Tramite {
  id: number
  uuid: string
  numero_tramite: string
  asunto: string
  estado: string
  prioridad: string
  canal_ingreso: string
  fecha_ingreso: string
  fecha_limite: string
  fecha_resolucion: string | null
  dentro_plazo: boolean | null
  calificacion: number | null
  persona_nombre: string
  persona_identificacion: string
  tipo_tramite_nombre: string
  categoria_nombre: string
  unidad_responsable_nombre: string
  unidad_responsable_siglas: string
  analista_nombre: string | null
  dias_restantes: number | null
}

export const tramitesService = {
  listar: (params?: Record<string, string>) =>
    api.get<{ results: Tramite[]; count: number }>('/tramites/', { params }).then(r => r.data),

  obtener: (id: number) =>
    api.get<Tramite>(`/tramites/${id}/`).then(r => r.data),

  crear: (data: Record<string, any>) =>
    api.post<Tramite>('/tramites/', data).then(r => r.data),

  cambiarEstado: (id: number, data: Record<string, any>) =>
    api.post(`/tramites/${id}/cambiar_estado/`, data).then(r => r.data),

  seguimientoPublico: (numero: string) =>
    api.get('/tramites/seguimiento_publico/', { params: { numero } }).then(r => r.data),

  categorias: () =>
    api.get<Categoria[]>('/tramites/categorias/').then(r => r.data),

  tipos: (params?: Record<string, string>) =>
    api.get<{ results: TipoTramite[]; count: number }>('/tramites/tipos/', { params }).then(r => r.data),

  buscarPersona: (identificacion: string) =>
    api.get<Persona>('/tramites/personas/buscar/', { params: { identificacion } }).then(r => r.data),

  crearPersona: (data: Record<string, any>) =>
    api.post<Persona>('/tramites/personas/', data).then(r => r.data),
}