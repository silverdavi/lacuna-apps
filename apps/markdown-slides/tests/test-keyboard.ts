import { test, expect } from '@playwright/test'

test('keyboard type basic', async ({ page }) => {
  await page.goto('data:text/html,<input id="t">')
  const input = page.locator('#t')
  await page.keyboard.type('hello')
  await expect(input).toHaveValue('hello')
})
