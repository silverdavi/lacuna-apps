import { expect, test } from '@playwright/test'

test('typing 1 meter shows 3.28084 feet', async ({ page }) => {
  await page.goto('/')
  const from = page.getByLabel('Value in Meters')
  await from.fill('1')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByLabel('Value in Feet')).toHaveValue('3.28084')
})
