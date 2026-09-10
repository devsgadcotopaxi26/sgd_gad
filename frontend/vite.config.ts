import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Bind mount desde Windows (Docker Desktop): los eventos nativos de
    // filesystem (inotify) no siempre cruzan al contenedor de forma
    // confiable, así que Vite puede seguir sirviendo una versión en caché
    // de un archivo aunque el archivo en disco ya haya cambiado. Con
    // polling, Vite relee el archivo periódicamente en vez de depender
    // de esas notificaciones.
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
