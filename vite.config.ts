import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      allowedHosts: [".patitasinquietas.local"],
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
