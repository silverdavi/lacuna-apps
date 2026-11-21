import { expect, test } from '@playwright/test'

test('A3-repro', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (m) => logs.push(m.text()))
  await page.goto('/')
  // Wait for the app to fully mount
  await page.waitForTimeout(500)
  for (const l of 'CRANE') await page.keyboard.press(l)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  const tiles: string[] = []
  for (let c = 0; c < 5; c++) tiles.push(await page.locator('[data-row]').first().locator('[data-letter]').nth(c).innerText())
  const status = await page.locator('footer span').first().innerText()
  console.log('REPRO: row0=' + tiles.join('') + ' status=' + status)
  expect(status).toBe('SOLVED IN 1')
})
