export default {
  outputDir: 'artifacts/markdown-slides/test-results',
  reporter: [['list']],
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4193',
    channel: 'chromium',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'node scripts/serve.mjs apps/markdown-slides/dist 4193',
    url: 'http://127.0.0.1:4193/',
    reuseExistingServer: false,
    timeout: 15000,
  },
  projects: [
    { name: 'smoke', testDir: 'scripts', testMatch: 'smoke.spec.ts' },
    { name: 'app', testDir: 'apps/markdown-slides/tests', testMatch: '**/*.spec.ts' },
  ],
}
