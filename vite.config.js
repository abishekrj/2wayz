import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const localBackendProxy = {
  '/api': {
    target: 'http://127.0.0.1:5001',
    changeOrigin: true,
    configure: (proxy) => {
      // The browser is calling this Vite server on the same origin.
      // Remove the forwarded Origin header so the local API does not need
      // a temporary CORS allow-list entry for every HTTPS tunnel URL.
      proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
    }
  },
  '/uploads': {
    target: 'http://127.0.0.1:5001',
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
    }
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: localBackendProxy
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['.trycloudflare.com'],
    proxy: localBackendProxy
  }
})
