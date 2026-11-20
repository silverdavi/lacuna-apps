import { expect, test } from '@playwright/test'

// Replicates the acceptance test's qrPng('Test123') by copying the generator.
// (We re-implement it here so we can feed the real image and read app logs.)
test('zz-debug A6 real', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (m) => {
    const t = m.text()
    if (t.includes('onFile') || t.includes('pageerror')) logs.push(t)
  })
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Upload image' }).click()
  const buf = await (await import('node:fs')).promises.readFile(new URL('./zz-test123.png', import.meta.url))
  await page.locator('input[type="file"]').setInputFiles({ name: 'test-qr.png', mimeType: 'image/png', buffer: buf })
  await page.waitForTimeout(800)
  console.log('[app-logs]', JSON.stringify(logs))
  const body = await page.locator('body').innerText()
  console.log('[body]', JSON.stringify(body.slice(0, 300)))
  expect(true).toBe(true)
})
