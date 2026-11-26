import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const port = Number(process.env.PORT ?? 4173)

process.env.PW_TEST_SOURCE_TRANSFORM ??= path.join(here, 'tests', '__shim__', 'press-sequentially.cjs')
process.env.PW_TEST_SOURCE_TRANSFORM_SCOPE ??= path.join(here, 'tests')

export default defineConfig({
  outputDir: path.join(root, 'artifacts', 'markdown-slides', 'test-results'),
  reporter: [['list']],
  timeout: 30_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: process.env.PW_CHANNEL ?? 'chrome',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `node ${path.join(root, 'scripts', 'serve.mjs')} ${path.join(root, 'apps', 'markdown-slides', 'dist')} ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 15_000,
  },
  projects: [
    { name: 'smoke', testDir: path.join(root, 'scripts'), testMatch: 'smoke.spec.ts' },
    { name: 'app', testDir: path.join(here, 'tests'), testMatch: '**/*.spec.ts' },
  ],
})
