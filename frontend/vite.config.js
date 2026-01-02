import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  server: {
    proxy: {
      '/api': 'http://localhost:7000', // Proxy API requests to the backend server
    },
  },
  build: {
    // This project bundles large libs (e.g., PDF/Excel). Avoid failing CI/builds on size warnings.
    chunkSizeWarningLimit: 1500,
  },
})
