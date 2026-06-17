import api from './api'

// ── Cuadro General de Clasificación Documental ──────────────────────

export interface Fondo {
  id: number
  nombre: string
  descripcion: string
  activo: boolean
  total_secciones: number
}

export interface Seccion {
  id: number
  fondo: number
  fondo_nombre: string
  unidad: number
  unidad_nombre: string
  unidad_siglas: string
  codigo: string
  nombre: string
  seccion_padre: number | null
  seccion_padre_nombre: string | null
  activo: boolean
  total_series: number
  total_subsecciones: number
}

export interface Serie {
  id: number
  seccion: number
  seccion_nombre: string
  seccion_codigo: string
  serie_padre: number | null
  serie_padre_nombre: string | null
  codigo: string
  nombre: string
  descripcion: string
  origen_documentacion: 'fisico' | 'digital' | 'hibrido'
  condicion_acceso: 'publico' | 'confidencial' | 'reservado'
  anos_gestion: number
  anos_central: number
  base_legal: string
  disposicion_final: 'conservacion' | 'eliminacion'
  tecnica_seleccion: 'completa' | 'parcial' | 'na'
  activo: boolean
  total_expedientes: number
  total_subseries: number
  anos_total_acumulado: number
}

// ── Expedientes (ciclo vital del documento) ──────────────────────────

export interface Expediente {
  id: number
  codigo_expediente: string
  titulo: string
  descripcion: string
  fecha_inicio: string | null
  fecha_cierre: string | null
  num_fojas: number
  soporte: string
  ubicacion_fisica: string
  numero_caja: string
  numero_parte: string
  estado: string
  categoria_actual: string
  expurgado: boolean
  fecha_expurgo: string | null
  foliado: boolean
  fecha_foliacion: string | null
  serie: number
  serie_nombre: string
  serie_codigo: string
  unidad: number
  unidad_nombre: string
  unidad_siglas: string
  creado_por_nombre: string
  total_documentos: number
  fecha_limite_categoria: string | null
  creado_en: string
}

export interface EstadisticasArchivo {
  total: number
  abiertos: number
  cerrados: number
  transferidos: number
  por_vencer: number
  digital: number
  fisico: number
  mixto: number
}

// ── Transferencias documentales ───────────────────────────────────────

export interface Transferencia {
  id: number
  tipo: 'primaria' | 'secundaria' | 'final'
  unidad: number
  unidad_nombre: string
  estado: string
  numero_memorando: string
  fecha_solicitud: string | null
  fecha_revision: string | null
  fecha_aceptacion: string | null
  solicitado_por_nombre: string
  revisado_por_nombre: string | null
  observaciones: string
  total_expedientes: number
  creado_en: string
}

// ── Baja documental ────────────────────────────────────────────────────

export interface BajaDocumental {
  id: number
  estado: string
  unidad: number
  unidad_nombre: string
  caracter_proceso: string
  justificacion: string
  normativa_legal: string
  numero_expedientes: number
  numero_cajas: number
  metros_lineales: number
  fecha_dictamen: string | null
  fecha_ejecucion: string | null
  solicitado_por_nombre: string
  aprobado_por_nombre: string | null
  creado_en: string
}

// ── Préstamo documental ─────────────────────────────────────────────────

export interface PrestamoDocumental {
  id: number
  expediente: number
  expediente_codigo: string
  expediente_titulo: string
  solicitante: number
  solicitante_nombre: string
  autorizado_por: number | null
  fecha_prestamo: string
  fecha_devolucion_esperada: string
  fecha_devolucion_real: string | null
  estado: string
  observaciones: string
}

// ── Copias certificadas ─────────────────────────────────────────────────

export interface CopiaCertificada {
  id: number
  expediente: number
  expediente_codigo: string
  solicitante_nombre: string
  solicitante_cedula: string
  motivo: string
  numero_fojas: number
  certificado_por_nombre: string
  fecha_emision: string
}

export const archivoService = {
  // ── Fondos ──
  listarFondos: () => api.get<{ results: Fondo[] }>('/archivo/fondos/').then(r => r.data.results),
  crearFondo: (data: Partial<Fondo>) => api.post('/archivo/fondos/', data).then(r => r.data),
  actualizarFondo: (id: number, data: Partial<Fondo>) => api.patch(`/archivo/fondos/${id}/`, data).then(r => r.data),

  // ── Secciones ──
  arbolSecciones: () => api.get('/archivo/secciones/arbol/').then(r => r.data),
  listarSecciones: (params?: Record<string, any>) =>
    api.get<{ results: Seccion[] }>('/archivo/secciones/', { params }).then(r => r.data),
  crearSeccion: (data: Partial<Seccion>) => api.post('/archivo/secciones/', data).then(r => r.data),
  actualizarSeccion: (id: number, data: Partial<Seccion>) => api.patch(`/archivo/secciones/${id}/`, data).then(r => r.data),
  eliminarSeccion: (id: number) => api.delete(`/archivo/secciones/${id}/`).then(r => r.data),

  // ── Series ──
  series: () =>
    api.get<{ results: Serie[]; count: number }>('/archivo/series/').then(r => r.data),
  listarSeries: (params?: Record<string, any>) =>
    api.get<{ results: Serie[] }>('/archivo/series/', { params }).then(r => r.data),
  crearSerie: (data: Partial<Serie>) => api.post('/archivo/series/', data).then(r => r.data),
  actualizarSerie: (id: number, data: Partial<Serie>) => api.patch(`/archivo/series/${id}/`, data).then(r => r.data),
  eliminarSerie: (id: number) => api.delete(`/archivo/series/${id}/`).then(r => r.data),

  // ── Expedientes ──
  expedientes: (params?: Record<string, string>) =>
    api.get<{ results: Expediente[]; count: number }>('/archivo/expedientes/', { params }).then(r => r.data),

  obtener: (id: number) =>
    api.get<Expediente>(`/archivo/expedientes/${id}/`).then(r => r.data),

  crear: (data: Record<string, any>) =>
    api.post<Expediente>('/archivo/expedientes/', data).then(r => r.data),

  actualizarExpediente: (id: number, data: Partial<Expediente>) =>
    api.patch<Expediente>(`/archivo/expedientes/${id}/`, data).then(r => r.data),

  cerrar: (id: number) =>
    api.post(`/archivo/expedientes/${id}/cerrar/`).then(r => r.data),

  expurgar: (id: number) =>
    api.post(`/archivo/expedientes/${id}/expurgar/`).then(r => r.data),

  foliar: (id: number, num_fojas?: number) =>
    api.post(`/archivo/expedientes/${id}/foliar/`, { num_fojas }).then(r => r.data),

  transferir: (id: number) =>
    api.post(`/archivo/expedientes/${id}/transferir/`).then(r => r.data),

  agregarDocumento: (id: number, data: Record<string, any>) =>
    api.post(`/archivo/expedientes/${id}/agregar_documento/`, data).then(r => r.data),

  estadisticas: () =>
    api.get<EstadisticasArchivo>('/archivo/expedientes/estadisticas/').then(r => r.data),

  // ── Transferencias documentales ──
  listarTransferencias: (params?: Record<string, any>) =>
    api.get<{ results: Transferencia[]; count: number }>('/archivo/transferencias/', { params }).then(r => r.data),
  crearTransferencia: (data: Record<string, any>) =>
    api.post<Transferencia>('/archivo/transferencias/', data).then(r => r.data),
  actualizarTransferencia: (id: number, data: Partial<Transferencia>) =>
    api.patch(`/archivo/transferencias/${id}/`, data).then(r => r.data),

  // ── Baja documental ──
  listarBajas: (params?: Record<string, any>) =>
    api.get<{ results: BajaDocumental[]; count: number }>('/archivo/bajas-documentales/', { params }).then(r => r.data),
  crearBaja: (data: Record<string, any>) =>
    api.post<BajaDocumental>('/archivo/bajas-documentales/', data).then(r => r.data),
  actualizarBaja: (id: number, data: Partial<BajaDocumental>) =>
    api.patch(`/archivo/bajas-documentales/${id}/`, data).then(r => r.data),

  // ── Préstamo documental ──
  listarPrestamos: (params?: Record<string, any>) =>
    api.get<{ results: PrestamoDocumental[]; count: number }>('/archivo/prestamos/', { params }).then(r => r.data),
  crearPrestamo: (data: Record<string, any>) =>
    api.post<PrestamoDocumental>('/archivo/prestamos/', data).then(r => r.data),
  actualizarPrestamo: (id: number, data: Partial<PrestamoDocumental>) =>
    api.patch(`/archivo/prestamos/${id}/`, data).then(r => r.data),

  // ── Copias certificadas ──
  listarCopias: (params?: Record<string, any>) =>
    api.get<{ results: CopiaCertificada[]; count: number }>('/archivo/copias-certificadas/', { params }).then(r => r.data),
  crearCopia: (data: Record<string, any>) =>
    api.post<CopiaCertificada>('/archivo/copias-certificadas/', data).then(r => r.data),

  agregarDocumentoExpediente: (expedienteId: number, data: { documento_id?: number; tramite_id?: number; correo_id?: number }) =>
    api.post(`/archivo/expedientes/${expedienteId}/agregar-documento/`, data).then(r => r.data),

  expedientesElegibles: (params?: { serie?: number; search?: string }) =>
    api.get<Expediente[]>('/archivo/expedientes/elegibles/', { params }).then(r => r.data),
}