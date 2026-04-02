import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Browser hits :3000 while Vite listens on :5173 in Docker — HMR WebSocket must use the mapped port.
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    ...(process.env.VITE_DEV_CLIENT_PORT
      ? { hmr: { clientPort: Number(process.env.VITE_DEV_CLIENT_PORT) } }
      : {}),
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === '1',
    },
  },
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
