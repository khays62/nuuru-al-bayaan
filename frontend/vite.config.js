import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:7000'

  return {
    plugins: [react(), tailwindcss(),],
    server: {
      proxy: {
        // Dev-server only (does not affect production build).
        '/api': apiProxyTarget,
      },
    },
    build: {
      // This project bundles large libs (e.g., PDF/Excel). Avoid failing CI/builds on size warnings.
      chunkSizeWarningLimit: 1500,
    },
  }
})
