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
  creador_nombre: string
  area_nombre: string
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
}

export interface QuipuxEstadisticas {
  total_documentos: number
  total_usuarios: number
  fecha_primer_documento: string
  fecha_ultimo_documento: string
  por_estado: Record<string, number>
}

export const quipuxService = {
  buscar: (params: Record<string, string>) =>
    api.get<{ count: number; page: number; results: QuipuxDocumento[] }>('/quipux/documentos/', { params }).then(r => r.data),

  detalle: (radiId: string) =>
    api.get<QuipuxDetalle>(`/quipux/documentos/${radiId}/`).then(r => r.data),

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

  estadisticas: () =>
    api.get<QuipuxEstadisticas>('/quipux/estadisticas/').then(r => r.data),
}
