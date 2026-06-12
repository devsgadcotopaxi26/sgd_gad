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