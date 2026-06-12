import api from './api'

export interface BandejaItem {
  id: number
  bandeja: string
  accion_tomada: string
  leido: boolean
  leido_en: string | null
  es_urgente: boolean
  numero_referencia: string
  instrucciones: string
  fecha_limite: string | null
  creado_en: string
  numero_documento: string | null
  asunto: string
  tipo_nombre: string
  tipo_codigo: string
  tipo_prefijo: string
  unidad_origen_nombre: string
  unidad_origen_siglas: string
  creado_por_nombre: string
  estado_documento: string
  fecha_documento: string
  prioridad: string
}

export interface ConteosBandeja {
  [key: string]: { total: number; no_leidos: number }
}

export const bandejaService = {
  conteos: () =>
    api.get<ConteosBandeja>('/documentos/bandeja/conteos/').then(r => r.data),

  porBandeja: (bandeja: string, params?: Record<string, string>) =>
    api.get<{ count: number; results: BandejaItem[] }>(
      '/documentos/bandeja/por_bandeja/',
      { params: { bandeja, ...params } }
    ).then(r => r.data),

  marcarLeido: (id: number) =>
    api.post(`/documentos/bandeja/${id}/marcar_leido/`).then(r => r.data),

  reasignar: (id: number, data: { usuario_id: number; unidad_id?: number; instrucciones?: string }) =>
    api.post(`/documentos/bandeja/${id}/reasignar/`, data).then(r => r.data),

  archivar: (id: number, observacion?: string) =>
    api.post(`/documentos/bandeja/${id}/archivar/`, { observacion }).then(r => r.data),

  comentar: (id: number, comentario: string) =>
    api.post(`/documentos/bandeja/${id}/comentar/`, { comentario }).then(r => r.data),

  nuevaTarea: (id: number, data: Record<string, any>) =>
    api.post(`/documentos/bandeja/${id}/nueva_tarea/`, data).then(r => r.data),

  enviar: (documentoId: number, data: Record<string, any>) =>
    api.post(`/documentos/enviar/${documentoId}/enviar/`, data).then(r => r.data),
}