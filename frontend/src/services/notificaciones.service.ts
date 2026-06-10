import api from './api'

export interface Notificacion {
  id: number
  tipo: string
  titulo: string
  mensaje: string
  url_accion: string
  leido: boolean
  leido_en: string | null
  estado: string
  creado_en: string
  tramite_id: number | null
  documento_id: number | null
}

export const notificacionesService = {
  noLeidas: () =>
    api.get<{ count: number; notificaciones: Notificacion[] }>(
      '/auditoria/notificaciones/no_leidas/'
    ).then(r => r.data),

  listar: () =>
    api.get<{ results: Notificacion[]; count: number }>(
      '/auditoria/notificaciones/'
    ).then(r => r.data),

  marcarLeida: (id: number) =>
    api.post(`/auditoria/notificaciones/${id}/marcar_leida/`).then(r => r.data),

  marcarTodasLeidas: () =>
    api.post('/auditoria/notificaciones/marcar_todas_leidas/').then(r => r.data),
}