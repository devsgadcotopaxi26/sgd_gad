import { create } from 'zustand'
import type { ThemeId } from '@/constants/themes'

interface ThemeStore {
  tema: ThemeId
  setTema: (tema: ThemeId) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  tema: (localStorage.getItem('sgd_tema') as ThemeId) || 'clasico',
  setTema: (tema) => {
    localStorage.setItem('sgd_tema', tema)
    set({ tema })
  },
}))
