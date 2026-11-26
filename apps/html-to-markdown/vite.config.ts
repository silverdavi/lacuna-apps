import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const dir = path.dirname(fileURLToPath(import.meta.url))
const toolbox = path.resolve(dir, '../../toolbox')

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@lacuna/html-to-markdown': path.join(toolbox, 'modules/html-to-markdown/0.1.0/src/index.ts'),
      '@lacuna/markdown-to-html': path.join(toolbox, 'modules/markdown-to-html/0.1.0/src/index.ts'),
      '@lacuna/code-area': path.join(toolbox, 'modules/code-area/0.1.0/src/index.ts'),
      '@lacuna/use-clipboard': path.join(toolbox, 'modules/use-clipboard/0.1.0/src/index.ts'),
      '@lacuna/use-local-record': path.join(toolbox, 'modules/use-local-record/0.1.0/src/index.ts'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(dir, '..'), path.resolve(dir, '../..')],
    },
  },
  optimizeDeps: {
    exclude: ['@lacuna/ui', '@lacuna/html-to-markdown', '@lacuna/markdown-to-html', '@lacuna/code-area', '@lacuna/use-clipboard', '@lacuna/use-local-record'],
  },
})
