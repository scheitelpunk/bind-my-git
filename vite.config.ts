import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { componentTagger } from "lovable-tagger"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'versino.camalacode.org',
      '.camalacode.org',
    ],
    hmr: {
      port: 8080,
    },
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "upgrade-insecure-requests; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://versino.camalacode.org http://versino.camalacode.org http://localhost:8180 https://localhost:8180 http://localhost:8080 http://localhost:8000 ws://localhost:*; frame-src 'none'; frame-ancestors 'none'; child-src 'none'; object-src 'none'; worker-src 'self'; media-src 'none';"
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    include: ['recharts'],
  },
}))