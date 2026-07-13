import { create } from 'zustand'
import { type ThemeId, THEMES } from '@/constants/themes'

interface ThemeStore {
  tema: ThemeId
  setTema: (tema: ThemeId) => void
}

const stored = localStorage.getItem('sgd_tema') as ThemeId
const initialTema: ThemeId = stored && THEMES[stored] ? stored : 'clasico'

export const useThemeStore = create<ThemeStore>((set) => ({
  tema: initialTema,
  setTema: (tema) => {
    localStorage.setItem('sgd_tema', tema)
    set({ tema })
  },
}))
