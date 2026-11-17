import { defineConfig } from '@playwright/test'

// One app per run: APP=<slug> npx playwright test
// The smoke project runs on every app. The app project runs the app's own tests/.
const app = process.env.APP
if (!app) throw new Error('set APP=<slug>')
const port = Number(process.env.PORT ?? 4173)

export default defineConfig({
  outputDir: `artifacts/${app}/test-results`,
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
    command: `node scripts/serve.mjs apps/${app}/dist ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 15_000,
  },
  projects: [
    { name: 'smoke', testDir: 'scripts', testMatch: 'smoke.spec.ts' },
    { name: 'app', testDir: `apps/${app}/tests`, testMatch: '**/*.spec.ts' },
  ],
})
