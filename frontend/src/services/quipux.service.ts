import api from './api'

export interface QuipuxDocumento {
  radi_nume_radi: string
  radi_nume_text: string
  radi_fech_radi: string
  radi_asunto: string
  radi_tipo: number
  esta_codi: number
  estado_nombre: string
  radi_permiso: number
  radi_fech_firma: string | null
  radi_nomb_usua_firma: string
  radi_cuentai: string
  tiene_pdf: boolean
  tiene_pdf_firmado: boolean
  tiene_anexos: boolean
  num_anexos: number
  creador_nombre: string
  area_nombre: string
  // Campos de tarea (solo presentes en tareas_recibidas / tareas_enviadas)
  es_tarea?: boolean
  tarea_codi?: number
  tarea_estado?: number
  tarea_avance?: number
  fecha_maxima?: string | null
}

export interface QuipuxAccionSGD {
  id: number
  accion: 'reasignacion' | 'comentario' | 'archivado'
  observacion: string
  usuario: string
  creado_en: string
}

export interface QuipuxDetalle {
  radi_nume_radi: string
  radi_nume_text: string
  radi_fech_radi: string
  radi_fech_ofic: string | null
  radi_asunto: string
  radi_resumen: string
  radi_cuentai: string
  estado: string
  esta_codi: number
  radi_permiso: number
  radi_fech_firma: string | null
  radi_nomb_usua_firma: string
  tiene_pdf: boolean
  tiene_pdf_firmado: boolean
  creador: { nombre: string; cargo: string; area: string; cedula: string } | null
  usuario_actual: { nombre: string; area: string } | null
  recorrido: { hist_codi: number; hist_fech: string; hist_obse: string; sgd_ttr_codigo: number; usuario_origen: string; usuario_destino: string; transaccion: string }[]
  acciones_sgd: QuipuxAccionSGD[]
}

export interface QuipuxAnexo {
  anex_codigo: string
  anex_nombre: string
  anex_tipo: number
  anex_tipo_ext: string
  anex_fecha: string
  anex_tamano: number
  arch_codi: number
  tiene_archivo: boolean
}

export interface QuipuxBandejas {
  recibidos: number
  enviados: number
  en_elaboracion: number
  no_enviados: number
  archivados: number
  copia: number
  tareas_recibidas: number
  total: number
  // Indicadores de no leídos
  copia_no_leidos: number
  reasig_no_leidas: number
}

export interface QuipuxEstadisticas {
  total_documentos: number
  total_usuarios: number
  fecha_primer_documento: string
  fecha_ultimo_documento: string
  por_estado: Record<string, number>
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const quipuxService = {
  buscar: (params: Record<string, string | undefined>) =>
    api.get<{ count: number; page: number; results: QuipuxDocumento[]; es_admin: boolean }>(
      '/quipux/documentos/', { params }
    ).then(r => r.data),

  misBandejas: (cedula_usuario?: string) =>
    api.get<QuipuxBandejas>('/quipux/mis-bandejas/', {
      params: cedula_usuario ? { cedula_usuario } : {},
    }).then(r => r.data),

  detalle: (radiId: string) =>
    api.get<QuipuxDetalle>(`/quipux/documentos/${radiId}/`).then(r => r.data),

  anexos: (radiId: string) =>
    api.get<QuipuxAnexo[]>(`/quipux/documentos/${radiId}/anexos/`).then(r => r.data),

  descargarAnexo: (anex_codigo: string, nombre: string) => {
    const url = `${BASE_URL}/quipux/anexos/${encodeURIComponent(anex_codigo)}/descargar/`
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''
    const a = document.createElement('a')
    // Usamos fetch para adjuntar el header de autenticación
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        a.href = URL.createObjectURL(blob)
        a.download = nombre
        a.click()
        URL.revokeObjectURL(a.href)
      })
  },

  descargarPDF: async (radiId: string, numero: string, firmado = false) => {
    const response = await api.get(`/quipux/documentos/${radiId}/pdf/`, {
      params: firmado ? { firmado: 'true' } : {},
      responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${numero || radiId}${firmado ? '_firmado' : ''}.pdf`
    link.click()
    URL.revokeObjectURL(link.href)
  },

  obtenerUrlPDF: async (radiId: string, firmado = false): Promise<string> => {
    const response = await api.get(`/quipux/documentos/${radiId}/pdf/`, {
      params: firmado ? { firmado: 'true' } : {},
      responseType: 'blob',
    })
    return URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  },

  reasignar: (radiId: string, data: { usuario_id: number; instrucciones?: string }) =>
    api.post(`/quipux/documentos/${radiId}/reasignar/`, data).then(r => r.data),

  comentar: (radiId: string, observacion: string) =>
    api.post(`/quipux/documentos/${radiId}/comentar/`, { observacion }).then(r => r.data),

  marcarLeido: (radiId: string) =>
    api.post(`/quipux/documentos/${radiId}/marcar_leido/`).then(r => r.data),

  responder: (radiId: string, data: { asunto: string; tipo_documento_id: number; cuerpo?: string }) =>
    api.post<{ documento_id: number; numero: string; quipux_origen: string }>(
      `/quipux/documentos/${radiId}/responder/`, data
    ).then(r => r.data),

  enviar: (radiId: string) =>
    api.post<{ detail: string }>(`/quipux/documentos/${radiId}/enviar/`).then(r => r.data),

  archivar: (radiId: string) =>
    api.post<{ detail: string }>(`/quipux/documentos/${radiId}/archivar/`).then(r => r.data),

  actualizarAvance: (tareaCodi: number, data: { avance: number; observacion?: string }) =>
    api.post(`/quipux/tareas/${tareaCodi}/avance/`, data).then(r => r.data),

  historialAvance: (tareaCodi: number) =>
    api.get<{ id: number; avance: number; observacion: string; usuario: string; creado_en: string }[]>(
      `/quipux/tareas/${tareaCodi}/avance/`
    ).then(r => r.data),

  buscarContenido: (q: string) =>
    api.get<{ resultados: string[]; total: number }>('/quipux/buscar-contenido/', { params: { q } }).then(r => r.data),

  estadoIndexacion: () =>
    api.get<{
      total_quipux_con_pdf: number; total_indexados: number;
      con_texto: number; escaneados: number; pendientes: number; porcentaje: number
    }>('/quipux/indexacion/').then(r => r.data),

  estadisticas: () =>
    api.get<QuipuxEstadisticas>('/quipux/estadisticas/').then(r => r.data),

  secuenciales: (anio?: number) =>
    api.get<{ prefijo: string; anio: string; ultimo_secuencial: number }[]>(
      '/quipux/secuencial/', { params: anio ? { anio } : {} }
    ).then(r => r.data),

  usuariosQuipux: (search?: string) =>
    api.get<{ usua_codi: number; usua_cedula: string; usua_nombre: string; usua_cargo: string; depe_nomb: string; dep_sigla: string }[]>(
      '/quipux/usuarios-quipux/', { params: search ? { search } : {} }
    ).then(r => r.data),

  imprimirRecorrido: async (radiId: string, radi_nume_text?: string) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''
    const url = `${BASE_URL}/quipux/documentos/${encodeURIComponent(radiId)}/recorrido-pdf/`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Error al generar el recorrido')
    }
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    const win = window.open(objUrl, '_blank')
    if (!win) {
      const link = document.createElement('a')
      link.href = objUrl
      link.download = `recorrido_${radi_nume_text || radiId}.pdf`
      link.click()
    }
    setTimeout(() => URL.revokeObjectURL(objUrl), 10000)
  },

  miRespaldo: async (params?: { bandeja?: string; desde?: string; hasta?: string }) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''
    const url = new URL(`${BASE_URL}/quipux/respaldo-bandeja/`)
    if (params?.bandeja) url.searchParams.set('bandeja', params.bandeja)
    if (params?.desde) url.searchParams.set('desde', params.desde)
    if (params?.hasta) url.searchParams.set('hasta', params.hasta)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Error al generar el respaldo')
    }
    const blob = await res.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `quipux_respaldo_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
  },

  respaldoBandeja: async (cedula: string, params?: { bandeja?: string; desde?: string; hasta?: string }) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''
    const url = new URL(`${BASE_URL}/quipux/respaldo-bandeja/`)
    url.searchParams.set('cedula', cedula)
    if (params?.bandeja) url.searchParams.set('bandeja', params.bandeja)
    if (params?.desde) url.searchParams.set('desde', params.desde)
    if (params?.hasta) url.searchParams.set('hasta', params.hasta)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Error al generar el respaldo')
    }
    const blob = await res.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `quipux_${cedula}_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
  },
}
