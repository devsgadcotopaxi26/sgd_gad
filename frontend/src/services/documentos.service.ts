import api from './api'

export interface TipoDocumento {
  id: number
  codigo: string
  nombre: string
  prefijo_numeracion: string
  requiere_firma: boolean
  requiere_aprobacion: boolean
  dias_plazo_default: number
  activo: boolean
}

export interface Documento {
  id: number
  uuid: string
  numero_documento: string | null
  anio: number
  asunto: string
  estado: string
  prioridad: string
  confidencial: boolean
  requiere_respuesta: boolean
  fecha_limite_resp: string | null
  fecha_elaboracion: string
  fecha_firma: string | null
  fecha_envio: string | null
  tipo_nombre: string
  tipo_prefijo: string
  unidad_origen_nombre: string
  unidad_origen_siglas: string
  unidad_destino_nombre: string | null
  unidad_destino_siglas: string | null
  creado_por_nombre: string
  firmado_por_nombre: string | null
  vistas: number
  creado_en: string
}

export interface SeguimientoItem {
  id: number
  etapa: string
  usuario_nombre: string
  unidad_nombre: string | null
  unidad_siglas: string | null
  observacion: string
  creado_en: string
}

export interface DestinatarioItem {
  id: number
  usuario: number
  usuario_nombre: string
  unidad: number | null
  unidad_nombre: string | null
  unidad_siglas: string | null
}

export interface DocumentoDetalle extends Documento {
  tipo_documento: number
  unidad_origen: number | null
  cuerpo: string
  resumen: string
  prioridad: string
  confidencial: boolean
  requiere_respuesta: boolean
  firma_bce_info: Record<string, string> | null
  seguimiento: SeguimientoItem[]
  destinatarios: DestinatarioItem[]
  creado_por: number
}

export interface CrearDocumento {
  tipo_documento: number
  asunto: string
  cuerpo?: string
  resumen?: string
  unidad_origen: number
  unidad_destino?: number
  prioridad?: string
  confidencial?: boolean
  requiere_respuesta?: boolean
  fecha_limite_resp?: string
  destinatarios_ids?: number[]
  palabras_clave?: string[] 
}

export const documentosService = {
  listar: (params?: Record<string, string>) =>
    api.get<{ results: Documento[]; count: number }>('/documentos/', { params }).then(r => r.data),

  obtener: (id: number) =>
    api.get<DocumentoDetalle>(`/documentos/${id}/`).then(r => r.data),

  crear: (data: CrearDocumento) =>
    api.post<Documento>('/documentos/', data).then(r => r.data),

  actualizar: (id: number, data: Partial<CrearDocumento>) =>
    api.patch<Documento>(`/documentos/${id}/`, data).then(r => r.data),

  cambiarEstado: (id: number, estado: string) =>
    api.post(`/documentos/${id}/cambiar_estado/`, { estado }).then(r => r.data),

  anular: (id: number, motivo: string) =>
    api.post(`/documentos/${id}/anular/`, { motivo }).then(r => r.data),

  nuevaVersion: (id: number, cuerpo: string, comentario: string) =>
    api.post(`/documentos/${id}/nueva_version/`, { cuerpo, comentario }).then(r => r.data),

  tipos: () =>
    api.get<{ results: TipoDocumento[] }>('/documentos/tipos/').then(r => r.data.results),
descargarPDF: async (id: number, numero: string) => {
  const response = await api.get(`/documentos/${id}/pdf/`, { responseType: 'blob' })
  const blob     = new Blob([response.data], { type: 'application/pdf' })
  const link     = document.createElement('a')
  link.href      = URL.createObjectURL(blob)
  link.download  = `${numero || `doc_${id}`}.pdf`
  link.click()
  URL.revokeObjectURL(link.href)
},
}
