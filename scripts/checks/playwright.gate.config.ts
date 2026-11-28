// The gate's browser run: scripts/smoke.spec.ts only, against the app the gate built.
// An app's own tests are never run by the gate; they are code from the pull request.
// Set by scripts/checks/browser.mjs: APP, GATE_DIST, GATE_OUT, PORT. PW_CHANNEL picks an installed browser.
import path from 'node:path'
import { defineConfig } from '@playwright/test'

const dist = process.env.GATE_DIST
const out = process.env.GATE_OUT
if (!dist || !out) throw new Error('run through scripts/checks/browser.mjs')
const port = Number(process.env.PORT ?? 4173)
const root = path.resolve(__dirname, '../..')

export default defineConfig({
  testDir: path.join(root, 'scripts'),
  testMatch: 'smoke.spec.ts',
  outputDir: path.join(out, 'test-results'),
  reporter: [['json', { outputFile: path.join(out, 'playwright.json') }], ['list']],
  timeout: 45_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
    serviceWorkers: 'block',
  },
  webServer: {
    command: `node ${JSON.stringify(path.join(root, 'scripts/serve.mjs'))} ${JSON.stringify(dist)} ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 15_000,
  },
})
