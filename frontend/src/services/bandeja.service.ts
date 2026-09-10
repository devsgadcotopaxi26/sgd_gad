import api from './api'

export interface BandejaItem {
  id: number
  documento_id: number
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
  creado_por_id: number
  estado_documento: string
  fecha_documento: string
  prioridad: string
  remitente_nombre?: string
  remitente_email?: string
  remitente_entidad?: string
}

export interface ConteosBandeja {
  [key: string]: { total: number; no_leidos: number }
}

export const bandejaService = {
  conteos: (usuarioId?: number) =>
    api.get<ConteosBandeja>('/documentos/bandeja/conteos/', {
      params: usuarioId ? { usuario_id: usuarioId } : {},
    }).then(r => r.data),

  porBandeja: (bandeja: string, params?: Record<string, string | number | undefined>) =>
    api.get<{ count: number; results: BandejaItem[] }>(
      '/documentos/bandeja/por_bandeja/',
      { params: { bandeja, ...params } }
    ).then(r => r.data),

  marcarLeido: (id: number) =>
    api.post(`/documentos/bandeja/${id}/marcar_leido/`).then(r => r.data),

  // Marcar leído en lote (acción neutra e idempotente).
  marcarLeidoLote: (documentos: number[], bandeja: string) =>
    api.post<{ detail: string; leidos: number[] }>(
      '/documentos/bandeja/marcar_leido_lote/', { documentos, bandeja },
    ).then(r => r.data),

  reasignar: (id: number, data: { usuario_id: number; unidad_id?: number; instrucciones?: string }) =>
    api.post(`/documentos/bandeja/${id}/reasignar/`, data).then(r => r.data),

  // Reasignación MASIVA (un solo usuario/instrucción para toda la selección).
  reasignarLote: (
    documentos: number[], bandeja: string,
    data: { usuario_id: number; unidad_id?: number | null; instrucciones?: string },
  ) =>
    api.post<{ detail: string; reasignados: number[] }>(
      '/documentos/bandeja/reasignar_lote/', { documentos, bandeja, ...data },
    ).then(r => r.data),

  // Comentario MASIVO — mismo texto para toda la selección; 1 seguimiento por documento.
  comentarLote: (documentos: number[], bandeja: string, comentario: string) =>
    api.post<{ detail: string; comentados: number[] }>(
      '/documentos/bandeja/comentar_lote/', { documentos, bandeja, comentario },
    ).then(r => r.data),

  archivar: (id: number, observacion?: string) =>
    api.post(`/documentos/bandeja/${id}/archivar/`, { observacion }).then(r => r.data),

  // Archivo de gestión personal en lote (mueve a Archivados). NO vincula a expediente.
  archivarLote: (documentos: number[], bandeja: string, observacion?: string) =>
    api.post<{ detail: string; archivados: number[] }>(
      '/documentos/bandeja/archivar_lote/', { documentos, bandeja, observacion },
    ).then(r => r.data),

  // Restaurar desde Archivados a la bandeja de origen (Recibidos / Enviados).
  // `bandejaItemId` = BandejaDocumento.id.
  restaurarArchivado: (bandejaItemId: number, observacion?: string) =>
    api.post(`/documentos/bandeja/${bandejaItemId}/restaurar_archivado/`, { observacion }).then(r => r.data),
  restaurarArchivados: (documentos: number[], observacion?: string) =>
    api.post<{ detail: string; restaurados: number[]; destinos: Record<string, string> }>(
      '/documentos/bandeja/restaurar_archivados/', { documentos, observacion },
    ).then(r => r.data),

  // Informar / poner un documento EN CONOCIMIENTO de otros usuarios.
  informar: (documentoId: number, data: { usuarios: number[]; comentario?: string }) =>
    api.post<{ detail: string; informados: number[]; ya_informados: number[] }>(
      `/documentos/${documentoId}/informar/`, data,
    ).then(r => r.data),
  informarLote: (documentos: number[], usuarios: number[], comentario?: string) =>
    api.post<{ detail: string; resumen: any[] }>(
      '/documentos/informar_lote/', { documentos, usuarios, comentario },
    ).then(r => r.data),
  // Retira la copia de conocimiento de MI bandeja Informados (no borra el documento).
  // `bandejaItemId` = BandejaDocumento.id (item.id de la fila de bandeja).
  quitarInformado: (bandejaItemId: number) =>
    api.post(`/documentos/bandeja/${bandejaItemId}/quitar_informado/`).then(r => r.data),
  quitarInformados: (documentos: number[]) =>
    api.post<{ detail: string; retirados: number[] }>(
      '/documentos/bandeja/quitar_informados/', { documentos },
    ).then(r => r.data),

  comentar: (id: number, comentario: string) =>
    api.post(`/documentos/bandeja/${id}/comentar/`, { comentario }).then(r => r.data),

  nuevaTarea: (id: number, data: Record<string, any>) =>
    api.post(`/documentos/bandeja/${id}/nueva_tarea/`, data).then(r => r.data),

  enviar: (documentoId: number, data: Record<string, any>) =>
    api.post(`/documentos/enviar/${documentoId}/enviar/`, data).then(r => r.data),

  agregarImprimir: (id: number) =>
    api.post(`/documentos/bandeja/${id}/agregar_imprimir/`).then(r => r.data),

  marcarImpreso: (id: number) =>
    api.post(`/documentos/bandeja/${id}/marcar_impreso/`).then(r => r.data),

  eliminarBorrador: (documentoId: number, comentario: string) =>
    api.post(`/documentos/${documentoId}/eliminar_borrador/`, { comentario }).then(r => r.data),

  // Envío MASIVO a papelera desde la selección de "En elaboración" (todo-o-nada).
  enviarPapelera: (documentos: number[], comentario: string) =>
    api.post<{ detail: string; movidos: number[] }>(
      '/documentos/enviar_papelera/', { documentos, comentario },
    ).then(r => r.data),

  restaurarEliminado: (documentoId: number, comentario: string) =>
    api.post(`/documentos/${documentoId}/restaurar_eliminado/`, { comentario }).then(r => r.data),

  // Restauración MASIVA desde la selección de "Eliminados" (todo-o-nada).
  restaurarEliminados: (documentos: number[], comentario: string) =>
    api.post<{ detail: string; restaurados: number[] }>(
      '/documentos/restaurar_eliminados/', { documentos, comentario },
    ).then(r => r.data),

  eliminarDefinitivo: (documentoId: number, comentario: string) =>
    api.post(`/documentos/${documentoId}/eliminar_definitivo/`, { comentario }).then(r => r.data),
}