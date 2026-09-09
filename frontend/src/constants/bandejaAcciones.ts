import { Trash2, RotateCcw, ArrowRightLeft, MessageSquare, CheckCheck, Archive, BookUser, UserMinus, FolderTree } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { BandejaItem } from '@/services/bandeja.service'

export interface PermisoCtx {
  puede: (modulo: string, accion: string) => boolean
  esAdmin: boolean
}

export interface BandejaAccionDef {
  /** clave estable, mapea a la mutación/confirmación en DocumentosPage. */
  key: string
  /** etiqueta del botón; recibe el nº de seleccionados. */
  label: (n: number) => string
  icon: LucideIcon
  tone: 'default' | 'warn' | 'danger'
  /** filtra la acción por permiso/rol del usuario (además el backend revalida). */
  permiso?: (p: PermisoCtx) => boolean
  /**
   * Compatibilidad de la acción con CADA documento de la selección (§9).
   * Si algún seleccionado no la cumple, la barra muestra el botón
   * deshabilitado con `incompatibleMsg`. Ausente = siempre aplicable.
   */
  aplicableA?: (item: BandejaItem) => boolean
  incompatibleMsg?: string
}

/**
 * Qué filas de una bandeja pueden participar en ALGUNA acción de lote (llevan
 * checkbox). NO depende de una acción concreta — el checkbox representa
 * selección, no una acción (§8). Ausente = todas las filas son seleccionables.
 */
export const FILA_SELECCIONABLE: Record<string, (i: BandejaItem) => boolean> = {
  // Un ítem ya reasignado sigue físicamente en 'en_elaboracion' pero el usuario
  // dejó de ser responsable: ninguna acción de lote de esta bandeja le aplica.
  en_elaboracion: (i) => i.accion_tomada !== 'reasignado',
}

// Fábricas de acciones compartidas por varias bandejas (misma semántica en todas).
const noAnulado = (i: BandejaItem) => i.estado_documento !== 'anulado'
const ACC = {
  reasignar: (): BandejaAccionDef => ({
    key: 'reasignar', label: (n) => (n > 1 ? `Reasignar ${n}` : 'Reasignar'),
    icon: ArrowRightLeft, tone: 'default',
    aplicableA: noAnulado, incompatibleMsg: 'La selección incluye documentos anulados, que no pueden reasignarse.',
  }),
  informar: (): BandejaAccionDef => ({
    key: 'informar', label: (n) => (n > 1 ? `Informar ${n}` : 'Informar'),
    icon: BookUser, tone: 'default',
  }),
  archivar: (): BandejaAccionDef => ({
    key: 'archivar', label: (n) => (n > 1 ? `Archivar ${n}` : 'Archivar'),
    icon: Archive, tone: 'default',
    aplicableA: noAnulado, incompatibleMsg: 'La selección incluye documentos anulados.',
  }),
  comentar: (): BandejaAccionDef => ({
    key: 'comentar', label: (n) => (n > 1 ? `Comentar en ${n}` : 'Comentar'),
    icon: MessageSquare, tone: 'default',
  }),
  marcarLeido: (): BandejaAccionDef => ({
    key: 'marcar_leido', label: (n) => (n > 1 ? `Marcar ${n} leídos` : 'Marcar leído'),
    icon: CheckCheck, tone: 'default',
  }),
  // Carpetas Virtuales — CLASIFICACIÓN OPERATIVA de la unidad. No cambia
  // bandeja/estado/responsable. Disponible en las bandejas donde el documento
  // ya "existe" para el usuario (no en En Elaboración ni Eliminados).
  clasificar: (): BandejaAccionDef => ({
    key: 'clasificar', label: (n) => (n > 1 ? `Clasificar ${n} en carpeta` : 'Clasificar en carpeta'),
    icon: FolderTree, tone: 'default',
  }),
}

/**
 * Acciones de lote por bandeja. Fuente: comportamiento funcional de QUIPUX +
 * capacidades reales del SGDA (solo se declaran acciones con endpoint real).
 * TODAS las acciones declaradas se muestran directamente en la barra (sin menú
 * "Más"); el orden aquí es el orden en pantalla.
 * BRECHAS pendientes: Carpeta virtual, Desarchivar, Resolver tarea,
 * Marcar no leído, Nueva tarea por lote — ver auditoría.
 */
export const BANDEJA_ACCIONES: Record<string, BandejaAccionDef[]> = {
  en_elaboracion: [
    {
      key: 'enviar_papelera',
      label: (n) => `Enviar ${n > 1 ? `${n} ` : ''}a papelera`,
      icon: Trash2,
      tone: 'warn',
    },
  ],
  eliminados: [
    {
      key: 'restaurar',
      label: (n) => `Restaurar ${n}`,
      icon: RotateCcw,
      tone: 'default',
    },
  ],
  recibidos: [
    ACC.reasignar(),
    ACC.informar(),
    ACC.archivar(),
    ACC.clasificar(),
    ACC.comentar(),
    ACC.marcarLeido(),
  ],
  enviados: [
    ACC.informar(),
    ACC.archivar(),
    ACC.clasificar(),
    ACC.comentar(),
  ],
  // Reasignados / Informados: SIN "Clasificar" — matriz QUIPUX de Carpetas
  // Virtuales (F2-F/R5). Reasignados es además físicamente 'en_elaboracion'.
  reasignados: [
    ACC.informar(),
    ACC.comentar(),
  ],
  archivados: [
    {
      key: 'restaurar_archivado',
      label: (n) => (n > 1 ? `Restaurar ${n}` : 'Restaurar'),
      icon: RotateCcw,
      tone: 'default',
    },
    ACC.informar(),
    ACC.clasificar(),
    ACC.comentar(),
  ],
  informados: [
    {
      key: 'quitar_informado',
      label: (n) => (n > 1 ? `Quitar ${n} de Informados` : 'Quitar de Informados'),
      icon: UserMinus,
      tone: 'warn',
    },
    ACC.comentar(),
  ],
  // Tareas: la fila de bandeja ES el Documento (F2-D — 1 ítem por Documento
  // aunque haya varias tareas). Se clasifica el Documento, no la Tarea.
  tareas_recibidas: [
    ACC.clasificar(),
    ACC.marcarLeido(),
  ],
  tareas_enviadas: [
    ACC.clasificar(),
  ],
}

/** Acciones aplicables a una bandeja para un usuario (aplica el filtro de permiso). */
export function accionesDeBandeja(bandeja: string, p: PermisoCtx): BandejaAccionDef[] {
  return (BANDEJA_ACCIONES[bandeja] ?? []).filter(a => !a.permiso || a.permiso(p))
}
