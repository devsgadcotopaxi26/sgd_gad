import { create } from 'zustand'
import api from '@/services/api'

interface PermisosState {
  permisos: Record<string, string[]>
  tramitesCanales: Record<string, string[]>
  roles: string[]
  esAdmin: boolean
  cargado: boolean
  cargar: () => Promise<void>
  puede: (modulo: string, accion: string) => boolean
  puedeCanalTramite: (canal: string, accion: string) => boolean
  // "Acceso de gestión" = el usuario tiene al menos un módulo funcional más
  // allá de Documentos/Perfil (lo único que PERMISOS_ROL da al rol USUARIO).
  // Fuente ÚNICA para: destino de HomeRedirect, guard de /dashboard y la
  // decisión de mostrar u ocultar el sidebar general de módulos.
  tieneAccesoGestion: () => boolean
}

export const usePermisosStore = create<PermisosState>((set, get) => ({
  permisos: {},
  tramitesCanales: {},
  roles:    [],
  esAdmin:  false,
  cargado:  false,

  cargar: async () => {
    try {
      const { data } = await api.get('/usuarios/auth/permisos/')
      const { tramites_canales, ...permisos } = data.permisos ?? {}
      set({
        permisos,
        tramitesCanales: tramites_canales ?? {},
        roles:    data.roles,
        esAdmin:  data.es_admin,
        cargado:  true,
      })
    } catch {
      set({ cargado: true })
    }
  },

  puede: (modulo, accion) => {
    const { permisos, esAdmin, cargado } = get()
    if (!modulo)  return true           // Escritorio y rutas sin módulo: siempre visible
    if (!cargado) return false          // Ocultar hasta que carguen los permisos (evita flash)
    if (esAdmin)  return true
    return (permisos[modulo] ?? []).includes(accion)
  },

  // Permiso granular por canal de trámite (ventanilla/email/web). A
  // diferencia de puede('tramites', accion) — que es la unión de los 3
  // canales — esto permite distinguir, por ejemplo, quién solo puede
  // "crear" en ventanilla de quién puede hacerlo en los 3.
  puedeCanalTramite: (canal, accion) => {
    const { tramitesCanales, esAdmin, cargado } = get()
    if (!cargado) return false
    if (esAdmin)  return true
    return (tramitesCanales[canal] ?? []).includes(accion)
  },

  tieneAccesoGestion: () => {
    const { puede } = get()
    return (
      puede('tramites', 'ver') ||
      puede('archivo', 'ver') ||
      puede('usuarios', 'ver') ||
      puede('reportes', 'ver') ||
      puede('ajustes', 'ver')
    )
  },
}))
