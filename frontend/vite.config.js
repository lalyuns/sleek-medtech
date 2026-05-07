import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')
          if (normalizedId.includes('node_modules')) {
            if (normalizedId.includes('/three/examples/')) {
              return 'vendor-three-loaders'
            }

            if (normalizedId.includes('/three/')) {
              return 'vendor-three'
            }

            if (normalizedId.includes('@react-three/fiber')) {
              return 'vendor-r3f'
            }

            if (normalizedId.includes('gsap')) {
              return 'vendor-gsap'
            }

            if (normalizedId.includes('reactflow')) {
              return 'vendor-flow'
            }

            if (
              normalizedId.includes('/react/') ||
              normalizedId.includes('/react-dom/') ||
              normalizedId.includes('/react-router-dom/') ||
              normalizedId.includes('/zustand/')
            ) {
              return 'vendor-react'
            }

            return 'vendor'
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
