import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const app = fileURLToPath(new URL('..', import.meta.url))
const scratch = fileURLToPath(new URL('.', import.meta.url))

const alias: Record<string, string> = {
  '@lacuna/code-area': `${app}/node_modules/@lacuna/code-area/src/index.ts`,
  '@lacuna/ui/base.css': `${app}/node_modules/@lacuna/ui/ui/base.css`,
  '@lacuna/ui': `${app}/node_modules/@lacuna/ui/ui/index.tsx`,
}

export default defineConfig({
  root: scratch,
  plugins: [react()],
  resolve: { alias },
  build: { outDir: 'dist' },
})
