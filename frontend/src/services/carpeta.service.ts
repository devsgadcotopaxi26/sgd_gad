import api from './api'

// Carpetas Virtuales (F2-F) — CLASIFICACIÓN OPERATIVA por Unidad.
// NO es bandeja/expediente/archivo. Clasificar no modifica el documento.

export interface CarpetaNodo {
  id: number
  nombre: string
  padre: number | null
  activa: boolean
  n_docs: number
}

export interface CarpetaCreada {
  id: number
  nombre: string
  ruta: string
  padre: number | null
  activa: boolean
  unidad: number
  unidad_siglas: string
}

export interface ClasificacionDoc {
  carpeta_id: number
  ruta: string
  asignado_en: string
}

export const carpetaService = {
  // Árbol (plano) de la unidad. Sin `unidad` → la del usuario. El frontend
  // arma la jerarquía con `padre`. `puede_administrar` = el usuario puede
  // crear/renombrar/mover/desactivar (R2: solo ADMIN_GENERAL / superusuario).
  arbol: (unidad?: number, incluirInactivas?: boolean) =>
    api.get<{ unidad: number; puede_administrar: boolean; carpetas: CarpetaNodo[] }>(
      '/documentos/carpetas/', { params: {
        ...(unidad ? { unidad } : {}),
        ...(incluirInactivas ? { incluir_inactivas: 'true' } : {}),
      } },
    ).then(r => r.data),

  // ── Administración del árbol — solo ADMIN_GENERAL / superusuario ──
  crear: (nombre: string, padre?: number | null, unidad?: number) =>
    api.post<CarpetaCreada>('/documentos/carpetas/',
      { nombre, ...(padre ? { padre } : {}), ...(unidad ? { unidad } : {}) },
    ).then(r => r.data),

  renombrar: (id: number, nombre: string) =>
    api.patch<CarpetaCreada>(`/documentos/carpetas/${id}/`, { nombre }).then(r => r.data),

  mover: (id: number, padre: number | null) =>
    api.patch<CarpetaCreada>(`/documentos/carpetas/${id}/`, { padre }).then(r => r.data),

  // Desactivación LÓGICA recursiva (no borra filas ni documentos).
  desactivar: (id: number) =>
    api.delete(`/documentos/carpetas/${id}/`).then(r => r.data),

  activar: (id: number) =>
    api.post<CarpetaCreada>(`/documentos/carpetas/${id}/activar/`).then(r => r.data),

  // Documentos clasificados en la carpeta (ACL de lectura aplicada — la
  // carpeta NO concede acceso).
  documentos: (id: number, params?: { incluir_subcarpetas?: boolean; page?: number }) =>
    api.get<{ count: number; results: any[] }>(
      `/documentos/carpetas/${id}/documentos/`,
      { params: {
        ...(params?.incluir_subcarpetas ? { incluir_subcarpetas: 'true' } : {}),
        ...(params?.page ? { page: params.page } : {}),
      } },
    ).then(r => r.data),

  quitarDocumento: (carpetaId: number, documentoId: number) =>
    api.post(`/documentos/carpetas/${carpetaId}/quitar_documento/`, { documento_id: documentoId }).then(r => r.data),

  // ── Clasificación de documentos (individual o masiva; TODO-O-NADA) ──
  clasificar: (documentos: number[], carpeta_id: number) =>
    api.post<{
      detail: string
      clasificados: number[]; reclasificados: number[]; sin_cambio: number[]
    }>('/documentos/clasificar_carpeta/', { documentos, carpeta_id }).then(r => r.data),

  // Clasificación actual de un documento para la unidad del usuario (o null).
  deDocumento: (documentoId: number) =>
    api.get<ClasificacionDoc | null>(`/documentos/${documentoId}/carpeta/`).then(r => r.data),

  quitarDeDocumento: (documentoId: number) =>
    api.post(`/documentos/${documentoId}/quitar_de_carpeta/`, {}).then(r => r.data),
}
