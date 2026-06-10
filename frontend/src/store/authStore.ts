import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/services/api'

interface Usuario {
  id: number
  uuid: string
  tipo: string
  nombres: string
  apellidos: string
  nombre_completo: string
  email: string
  email_institucional: string | null
  unidad_id: number | null
  cargo: string
  firma_electronica: boolean
}

interface AuthState {
  usuario: Usuario | null
  access_token: string | null
  refresh_token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      access_token: null,
      refresh_token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await api.post('/auth/login/', { email, password })
          localStorage.setItem('access_token', data.access)
          localStorage.setItem('refresh_token', data.refresh)
          set({
            usuario: data.usuario,
            access_token: data.access,
            refresh_token: data.refresh,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err: any) {
          const msg = err.response?.data?.detail
            || err.response?.data?.non_field_errors?.[0]
            || 'Error al iniciar sesión'
          set({ error: msg, isLoading: false })
          throw new Error(msg)
        }
      },

      logout: async () => {
        try {
          const refresh = get().refresh_token
          if (refresh) {
            await api.post('/auth/logout/', { refresh })
          }
        } finally {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          set({
            usuario: null,
            access_token: null,
            refresh_token: null,
            isAuthenticated: false,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'sgd-auth',
      partialize: (state) => ({
        usuario: state.usuario,
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
