import api from './api'

export interface Adjunto {
  id: number
  nombre: string
  tipo: string
  tamanio: number
  tamanio_legible: string
  mime_type: string
  subido_por_nombre: string
  creado_en: string
  url_descarga: string
  documento?: number
  tramite?: number
  correo?: number

  // Metadatos de digitalización (Regla Técnica Nacional, Art. 68-79)
  origen_digitalizacion?: 'institucional' | 'quipux' | 'nativo_digital' | null
  resolucion_ppp?: number | null
  formato_archivo?: string
  fecha_digitalizacion?: string | null
  digitalizado_por_nombre?: string
  numero_folios?: number | null
  hoja_testigo?: boolean
  ubicacion_fisica?: string
  calidad_control: 'pendiente' | 'aprobado' | 'rechazado'
  calidad_observacion?: string
  calidad_revisado_por_nombre?: string
  calidad_revisado_en?: string | null
  hash_integridad?: string
  cumple_norma_institucional?: boolean | null
}

export interface MetadatosDigitalizacion {
  origen_digitalizacion?: 'institucional' | 'quipux' | 'nativo_digital'
  resolucion_ppp?: number
  formato_archivo?: string
  numero_folios?: number
  hoja_testigo?: boolean
  ubicacion_fisica?: string
}

export const adjuntosService = {
  listar: (params: { documento?: number; tramite?: number; correo?: number }) =>
    api.get<{ results: Adjunto[]; count: number }>('/documentos/adjuntos/', { params }).then(r => r.data),

  subir: (formData: FormData) =>
    api.post<Adjunto>('/documentos/adjuntos/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  eliminar: (id: number) =>
    api.delete(`/documentos/adjuntos/${id}/`).then(r => r.data),

  controlCalidad: (id: number, resultado: 'aprobado' | 'rechazado', observacion?: string) =>
    api.post<Adjunto>(`/documentos/adjuntos/${id}/control-calidad/`, { resultado, observacion }).then(r => r.data),

  descargar: async (id: number, nombre: string) => {
    const response = await api.get(`/documentos/adjuntos/${id}/descargar/`, {
      responseType: 'blob',
    })
    const blob = new Blob([response.data])
    const link = document.createElement('a')
    link.href  = URL.createObjectURL(blob)
    link.download = nombre
    link.click()
    URL.revokeObjectURL(link.href)
  },
}