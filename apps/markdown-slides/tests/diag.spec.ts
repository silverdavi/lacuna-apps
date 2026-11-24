import { test } from '@playwright/test'

test('load only', async ({ page }) => {
  let crashed = false
  page.on('crash', () => { crashed = true; console.log('[diag] CRASH EVENT') })
  page.on('pageerror', (e) => console.log('[diag] PAGEERROR:', String(e).slice(0, 300)))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log(`[diag] CONSOLE ${m.type()}:`, m.text().slice(0, 200))
  })
  page.on('requestfailed', (r) => console.log('[diag] REQFAIL:', r.url(), r.failure()?.errorText))
  try {
    await page.goto('/', { waitUntil: 'load', timeout: 15000 })
    console.log('[diag] LOAD OK')
  } catch (e) {
    console.log('[diag] GOTO ERR:', String(e).slice(0, 200))
  }
  await page.waitForTimeout(1000).catch(() => {})
  console.log('[diag] crashed=', crashed)
  test.skip(true, 'diag')
})
