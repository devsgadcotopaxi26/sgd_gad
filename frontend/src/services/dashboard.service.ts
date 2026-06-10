import api from './api'

export interface DashboardStats {
  kpis: {
    tramites_pendientes: number
    tramites_vencen_hoy: number
    tramites_resueltos_mes: number
    correos_sin_atender: number
    docs_pendientes: number
    cumplimiento_plazo: number
    satisfaccion: number
  }
  tramites_categoria: { tipo_tramite__categoria__nombre: string; total: number }[]
  docs_7d: { fecha: string; dia: string; total: number }[]
  tramites_recientes: {
    id: number; numero: string; asunto: string; estado: string
    persona: string; unidad: string; fecha_ingreso: string; dias_restantes: number | null
  }[]
  docs_recientes: {
    id: number; numero: string; asunto: string; estado: string
    tipo: string; unidad: string; fecha: string
  }[]
  actividad: {
    tipo: string; texto: string; unidad: string; fecha: string; color: string
  }[]
  proximos_vencer: {
    numero: string; titulo: string; unidad: string; dias: number; tipo: string
  }[]
}

export const dashboardService = {
  stats: () =>
    api.get<DashboardStats>('/auditoria/dashboard/').then(r => r.data),

  kpiUnidades: () =>
    api.get<{ unidades: any[] }>('/auditoria/kpi-unidades/').then(r => r.data),
}