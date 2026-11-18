import { expect, test } from '@playwright/test'

test('typing in the feet field updates meters', async ({ page }) => {
  await page.goto('/')
  const feet = page.getByLabel('Value in Feet')
  await feet.fill('1')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByLabel('Value in Meters')).toHaveValue('0.3048')
})
