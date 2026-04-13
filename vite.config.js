import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BUILD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://connectivity.gstatic.com",
  "worker-src 'self' blob:",
  "frame-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const DEV_CSP = [
  "default-src 'self' data: blob: https: http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://127.0.0.1:* http://localhost:*",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://connectivity.gstatic.com http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*",
  "worker-src 'self' blob:",
  "frame-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function cspMetaPlugin(isBuild) {
  return {
    name: 'app-csp-meta',
    transformIndexHtml(html) {
      return html.replace('__CSP__', isBuild ? BUILD_CSP : DEV_CSP)
    },
  }
}

export default defineConfig(({ command }) => ({
  base: './',

  plugins: [
    react(),
    cspMetaPlugin(command === 'build'),
  ],

  resolve: {
    alias: { '@': '/src' },
  },

  build: {
    chunkSizeWarningLimit: 2000,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfmake/build/vfs_fonts')) return 'pdf-fonts'
          if (id.includes('pdfmake')) return 'pdf-engine'
          if (id.includes('node_modules')) return 'vendor'
        },

        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  worker: {
    format: 'es',
  },
}))
