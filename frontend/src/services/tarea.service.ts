import api from './api'

export interface Tarea {
  id: number
  documento: number
  asignada_por: number
  asignada_a: number
  asignada_por_nombre: string
  asignada_a_nombre: string
  descripcion: string
  prioridad: 'normal' | 'urgente' | 'muy_urgente'
  estado: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'
  fecha_limite: string | null
  completada_en: string | null
  respuesta: string
  creado_en: string
}

export const tareaService = {
  listar: (params: { documento?: number; rol?: 'recibidas' | 'enviadas' }) =>
    api.get<{ results: Tarea[]; count: number }>('/documentos/tareas/', { params })
       .then(r => r.data.results),

  iniciar: (id: number) =>
    api.post(`/documentos/tareas/${id}/iniciar/`).then(r => r.data),

  completar: (id: number, respuesta: string) =>
    api.post(`/documentos/tareas/${id}/completar/`, { respuesta }).then(r => r.data),

  cancelar: (id: number, motivo?: string) =>
    api.post(`/documentos/tareas/${id}/cancelar/`, { motivo }).then(r => r.data),
}
