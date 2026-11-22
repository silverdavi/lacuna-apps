import { expect, test } from '@playwright/test'

test('debug render', async ({ page }) => {
  page.on('console', (m) => console.log('CONSOLE:', m.type(), m.text()))
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  page.on('requestfailed', (r) => console.log('REQFAIL:', r.url(), r.failure()?.errorText))
  await page.goto('/')
  await page.waitForTimeout(2000)
  const text = await page.locator('#root').innerText().catch((e) => `ERR ${e}`)
  console.log('ROOT TEXT:', JSON.stringify(text.slice(0, 200)))
  const html = await page.locator('#root').innerHTML().catch((e) => `ERR ${e}`)
  console.log('ROOT HTML:', html.slice(0, 600))
  expect(true).toBe(true)
})
