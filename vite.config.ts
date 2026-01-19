import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
      host:'0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',     // 👈 без /api/v1/
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api/v1'), // 👈 подмена пути
      },
    },
  },
})