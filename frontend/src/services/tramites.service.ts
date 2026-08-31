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
  numero_oficio: string
  fecha_documento: string | null
  procedencia: string
  firmante_oficio: string
  telefono_contacto: string
  correo_contacto: string
  fecha_ingreso: string
  fecha_limite: string
  fecha_resolucion: string | null
  dentro_plazo: boolean | null
  calificacion: number | null
  persona_nombre: string | null
  persona_identificacion: string | null
  tipo_tramite_nombre: string | null
  categoria_nombre: string | null
  unidad_responsable_nombre: string
  unidad_responsable_siglas: string
  analista_nombre: string | null
  dias_restantes: number | null
}
export interface Seguimiento {
  id: number
  estado_anterior: string
  estado_nuevo: string
  observacion: string
  usuario_nombre: string | null
  unidad_nombre: string | null
  visible_ciudadano: boolean
  creado_en: string
}

// Respuesta de GET /tramites/{id}/ (TramiteDetalleSerializer) — incluye el
// historial de actuaciones (Seguimiento) y los snapshots del firmante/
// contacto que el listado no trae (fields='__all__' en el backend).
export interface TramiteDetalle extends Tramite {
  seguimientos: Seguimiento[]
  cedula_firmante: string | null
  cargo_firmante: string
  detalle: string
  persona: Persona | null
  unidad_receptora_nombre: string | null
  receptor_nombre: string | null
}

export const tramitesService = {
  listar: (params?: Record<string, string>) =>
    api.get<{ results: Tramite[]; count: number }>('/tramites/', { params }).then(r => r.data),

  obtener: (id: number) =>
    api.get<TramiteDetalle>(`/tramites/${id}/`).then(r => r.data),

  crear: (data: Record<string, any>) =>
    api.post<Tramite>('/tramites/', data).then(r => r.data),

  editar: (id: number, data: Record<string, any>) =>
    api.patch<Tramite>(`/tramites/${id}/`, data).then(r => r.data),

  cambiarEstado: (id: number, data: Record<string, any>) =>
    api.post(`/tramites/${id}/cambiar_estado/`, data).then(r => r.data),

  seguimientoPublico: (numero: string) =>
    api.get('/tramites/seguimiento_publico/', { params: { numero } }).then(r => r.data),

  categorias: () =>
    api.get<Categoria[]>('/tramites/categorias/').then(r => r.data),

  crearCategoria: (data: Partial<Categoria>) =>
    api.post<Categoria>('/tramites/categorias/', data).then(r => r.data),

  actualizarCategoria: (id: number, data: Partial<Categoria>) =>
    api.patch<Categoria>(`/tramites/categorias/${id}/`, data).then(r => r.data),

  tipos: (params?: Record<string, string>) =>
    api.get<TipoTramite[]>('/tramites/tipos/', { params }).then(r => r.data),

  crearTipo: (data: Record<string, any>) =>
    api.post<TipoTramite>('/tramites/tipos/', data).then(r => r.data),

  actualizarTipo: (id: number, data: Record<string, any>) =>
    api.patch<TipoTramite>(`/tramites/tipos/${id}/`, data).then(r => r.data),

  buscarPersona: (identificacion: string) =>
    api.get<Persona>('/tramites/personas/buscar/', { params: { identificacion } }).then(r => r.data),

  crearPersona: (data: Record<string, any>) =>
    api.post<Persona>('/tramites/personas/', data).then(r => r.data),
  buscarPersonas: (query: string) =>
    api.get<{ results: Persona[] }>('/tramites/personas/', { params: { search: query } }).then(r => r.data.results),
}