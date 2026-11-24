import { expect, test } from '@playwright/test'

test('setup: regex tester page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Regex Tester' })).toBeVisible()
})
