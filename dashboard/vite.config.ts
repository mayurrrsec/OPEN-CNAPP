import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts')) return 'vendor-recharts'
          if (id.includes('d3')) return 'vendor-d3'
          if (id.includes('@tanstack')) return 'vendor-tanstack'
          if (id.includes('cmdk')) return 'vendor-cmdk'
          if (id.includes('lucide-react')) return 'vendor-icons'
        },
      },
    },
  },
})
