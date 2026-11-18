import { expect, test } from '@playwright/test'

test('switching category resets units to defaults and clears fields', async ({ page }) => {
  await page.goto('/')
  const meters = page.getByLabel('Value in Meters')
  await meters.fill('7')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByLabel('Value in Feet')).toHaveValue('22.9659')

  const massTab = page.getByRole('tab', { name: 'Mass' })
  await massTab.click()
  await expect(massTab).toHaveAttribute('aria-selected', 'true')

  const kilograms = page.getByLabel('Value in Kilograms')
  const grams = page.getByLabel('Value in Grams')
  await expect(kilograms).toHaveValue('')
  await expect(grams).toHaveValue('')
})
