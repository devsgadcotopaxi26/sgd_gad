import api from './api'

export interface Serie {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  anos_retencion: number
  anos_central: number
  disposicion_final: string
  activo: boolean
  num_expedientes: number
}

export interface Expediente {
  id: number
  codigo_expediente: string
  titulo: string
  descripcion: string
  fecha_inicio: string | null
  fecha_cierre: string | null
  num_fojas: number
  soporte: string
  ubicacion_fisica: string
  estado: string
  fecha_expurgo: string | null
  serie_nombre: string
  serie_codigo: string
  unidad_nombre: string
  unidad_siglas: string
  creado_por_nombre: string
  num_documentos: number
  dias_para_expurgo: number | null
  creado_en: string
}

export interface EstadisticasArchivo {
  total: number
  abiertos: number
  cerrados: number
  transferidos: number
  por_vencer: number
  digital: number
  fisico: number
  mixto: number
}

export const archivoService = {
  series: () =>
    api.get<{ results: Serie[]; count: number }>('/archivo/series/').then(r => r.data),

  expedientes: (params?: Record<string, string>) =>
    api.get<{ results: Expediente[]; count: number }>('/archivo/expedientes/', { params }).then(r => r.data),

  obtener: (id: number) =>
    api.get<Expediente>(`/archivo/expedientes/${id}/`).then(r => r.data),

  crear: (data: Record<string, any>) =>
    api.post<Expediente>('/archivo/expedientes/', data).then(r => r.data),

  cerrar: (id: number) =>
    api.post(`/archivo/expedientes/${id}/cerrar/`).then(r => r.data),

  transferir: (id: number) =>
    api.post(`/archivo/expedientes/${id}/transferir/`).then(r => r.data),

  agregarDocumento: (id: number, data: Record<string, any>) =>
    api.post(`/archivo/expedientes/${id}/agregar_documento/`, data).then(r => r.data),

  estadisticas: () =>
    api.get<EstadisticasArchivo>('/archivo/expedientes/estadisticas/').then(r => r.data),
}