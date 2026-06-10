import api from './api'

export interface Correo {
  id: number
  numero_registro: string
  tipo: string
  asunto: string
  cuerpo?: string
  remitente_email: string
  remitente_nombre: string
  remitente_entidad: string
  estado: string
  prioridad: string
  etiquetas: string[]
  fecha_recepcion: string
  fecha_limite_resp: string | null
  respondido: boolean
  leido: boolean
  num_adjuntos: number
  unidad_destino_nombre: string | null
  unidad_destino_siglas: string | null
  usuario_asignado_nombre: string | null
  vencido: boolean
  dias_para_vencer: number | null
  doc_generado: number | null
  tramite_generado: number | null
  seguimientos?: any[]
}

export interface CrearCorreo {
  tipo: string
  asunto: string
  cuerpo?: string
  remitente_email?: string
  remitente_nombre?: string
  remitente_entidad?: string
  unidad_destino?: number
  prioridad?: string
  fecha_limite_resp?: string
  etiquetas?: string[]
}

export const correosService = {
  listar: (params?: Record<string, string>) =>
    api.get<{ results: Correo[]; count: number }>('/correos/', { params }).then(r => r.data),

  obtener: (id: number) =>
    api.get<Correo>(`/correos/${id}/`).then(r => r.data),

  crear: (data: CrearCorreo) =>
    api.post<Correo>('/correos/', data).then(r => r.data),

  marcarLeido: (id: number) =>
    api.post(`/correos/${id}/marcar_leido/`).then(r => r.data),

  responder: (id: number, observacion: string) =>
    api.post(`/correos/${id}/responder/`, { observacion }).then(r => r.data),

  archivar: (id: number, observacion?: string) =>
    api.post(`/correos/${id}/archivar/`, { observacion }).then(r => r.data),

  asignar: (id: number, usuario_id: number, unidad_id?: number) =>
    api.post(`/correos/${id}/asignar/`, { usuario_id, unidad_id }).then(r => r.data),

  estadisticas: () =>
    api.get<{
      total: number; nuevos: number; en_proceso: number
      respondidos: number; sin_responder: number
      vencidos: number; por_vencer: number
    }>('/correos/estadisticas/').then(r => r.data),

  sinResponder: () =>
    api.get<Correo[]>('/correos/sin_responder/').then(r => r.data),

  porVencer: () =>
    api.get<Correo[]>('/correos/por_vencer/').then(r => r.data),
}