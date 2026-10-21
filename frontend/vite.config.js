import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em desenvolvimento o Vite roda em :5173 e repassa /api para o FastAPI (:8080).
// Em produção o build é servido pelo próprio FastAPI, então não há CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['.manus.computer'],
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
