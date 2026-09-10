import api from './api'
import type { Usuario } from './usuarios.service'

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
  // 'principal' | 'copia' | 'conocimiento' — determina si va en "Para" o "Con copia a".
  tipo: string
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
  pdf_firmado_url: string | null
  seguimiento: SeguimientoItem[]
  destinatarios: DestinatarioItem[]
  creado_por: number
  // Remitente/DE persistido en el documento (distinto del creador cuando se
  // redacta en nombre de otra persona). null = el remitente es el creador.
  remitente: number | null
  remitente_detalle: Usuario | null
  creado_por_detalle: Usuario | null
  // Número del documento Quipux histórico al que este responde, si aplica.
  quipux_origen: string
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
  remitente_id?: number | null
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

  enviar: (id: number) =>
    api.post(`/documentos/${id}/enviar/`).then(r => r.data),

  reasignarA: (id: number, usuarioId: number, unidadId: number | null) =>
    api.post(`/documentos/${id}/reasignar_a/`, { usuario_id: usuarioId, unidad_id: unidadId }).then(r => r.data),

  recuperar: (id: number) =>
    api.post<{ detail: string }>(`/documentos/${id}/recuperar/`).then(r => r.data),

  cambiarEstado: (id: number, estado: string) =>
    api.post(`/documentos/${id}/cambiar_estado/`, { estado }).then(r => r.data),

  anular: (id: number, motivo: string) =>
    api.post(`/documentos/${id}/anular/`, { motivo }).then(r => r.data),

  nuevaVersion: (id: number, cuerpo: string, comentario: string) =>
    api.post(`/documentos/${id}/nueva_version/`, { cuerpo, comentario }).then(r => r.data),

  tipos: () =>
    api.get<{ results: TipoDocumento[] }>('/documentos/tipos/').then(r => r.data.results),

  tiposDocumento: () =>
    api.get<{ results: TipoDocumento[] }>('/documentos/tipos/').then(r => r.data),
descargarPDF: async (id: number, numero: string) => {
  const response = await api.get(`/documentos/${id}/pdf/`, { responseType: 'blob' })
  const blob     = new Blob([response.data], { type: 'application/pdf' })
  const link     = document.createElement('a')
  link.href      = URL.createObjectURL(blob)
  link.download  = `${numero || `doc_${id}`}.pdf`
  link.click()
  URL.revokeObjectURL(link.href)
},

descargarUrlAdjunto: async (url: string, nombre: string) => {
  const response = await api.get(url, { responseType: 'blob' })
  const blob     = new Blob([response.data], { type: 'application/pdf' })
  const link     = document.createElement('a')
  link.href      = URL.createObjectURL(blob)
  link.download  = nombre
  link.click()
  URL.revokeObjectURL(link.href)
},

generarTokenFirmaEC: async (id: number) =>
  api.post<{ firmaec_url: string; token: string }>(`/documentos/${id}/firmaec/generar-token/`).then(r => r.data),

registrarFirmaFisica: async (id: number, observacion?: string) =>
  api.post(`/documentos/${id}/firma-fisica/`, { observacion }).then(r => r.data),

obtenerUrlPDF: async (id: number): Promise<string> => {
  const response = await api.get(`/documentos/${id}/pdf/`, { responseType: 'blob' })
  return URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
},

obtenerUrlBlobAdjunto: async (url: string): Promise<string> => {
  const response = await api.get(url, { responseType: 'blob' })
  return URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
},

imprimirPDF: async (id: number) => {
  const response = await api.get(`/documentos/${id}/pdf/`, { responseType: 'blob' })
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)

  // Abre el PDF en ventana nueva — el visor del navegador tiene el diálogo
  // de impresora del sistema (Ctrl+P / ⌘P) con reconocimiento del documento
  const win = window.open(url, '_blank')
  if (!win) {
    // Si popup bloqueado, fallback a anchor
    const a = document.createElement('a')
    a.href = url; a.target = '_blank'; a.click()
  }
  // Liberar blob URL después de que cargue la ventana
  setTimeout(() => URL.revokeObjectURL(url), 10000)
},
}

export interface ListaMiembro {
  id: number
  nombre_completo: string
  cargo: string
  titulo: string
  unidad_nombre: string
  unidad_siglas: string
  unidad_id: number
  orden: number
}

export interface ListaDistribucion {
  id: number
  nombre: string
  descripcion: string
  activo: boolean
  quipux_id: number | null
  total_miembros: number
  preview_miembros: string[]
  miembros: ListaMiembro[]
}

export const listasService = {
  buscar: (q: string) =>
    api.get<ListaDistribucion[]>('/documentos/listas-distribucion/buscar/', { params: { q } })
       .then(r => r.data),

  listar: () =>
    api.get<{ results: ListaDistribucion[] }>('/documentos/listas-distribucion/')
       .then(r => r.data.results),

  crear: (data: { nombre: string; descripcion?: string }) =>
    api.post<ListaDistribucion>('/documentos/listas-distribucion/', data).then(r => r.data),

  actualizar: (id: number, data: Partial<{ nombre: string; descripcion: string; activo: boolean }>) =>
    api.patch<ListaDistribucion>(`/documentos/listas-distribucion/${id}/`, data).then(r => r.data),

  eliminar: (id: number) =>
    api.delete(`/documentos/listas-distribucion/${id}/`).then(r => r.data),
}
