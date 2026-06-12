import { create } from 'zustand'
import api from '@/services/api'

interface PermisosState {
  permisos: Record<string, string[]>
  roles: string[]
  esAdmin: boolean
  cargado: boolean
  cargar: () => Promise<void>
  puede: (modulo: string, accion: string) => boolean
}

export const usePermisosStore = create<PermisosState>((set, get) => ({
  permisos: {},
  roles:    [],
  esAdmin:  false,
  cargado:  false,

  cargar: async () => {
    try {
      const { data } = await api.get('/usuarios/auth/permisos/')
      set({
        permisos: data.permisos,
        roles:    data.roles,
        esAdmin:  data.es_admin,
        cargado:  true,
      })
    } catch {
      set({ cargado: true })
    }
  },

  puede: (modulo, accion) => {
    const { permisos, esAdmin } = get()
    if (esAdmin) return true
    return (permisos[modulo] ?? []).includes(accion)
  },
}))