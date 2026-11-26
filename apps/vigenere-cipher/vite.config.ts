import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const dir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    fs: {
      allow: [path.resolve(dir, '..'), path.resolve(dir, '../..')],
    },
  },
  optimizeDeps: {
    exclude: ['@lacuna/ui'],
  },
})
