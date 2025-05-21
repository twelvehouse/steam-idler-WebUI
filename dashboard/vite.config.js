import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      // Proxying /api requests to the backend server
      '/api': {
        target: 'http://localhost:3000', // Backend server address
        changeOrigin: true, // Needed for virtual hosted sites
        // secure: false, // Uncomment if backend is not using HTTPS (often true for localhost)
        // rewrite: (path) => path.replace(/^\/api/, '/api') // Default rewrite is fine, but shown for clarity
      }
    }
  }
})
