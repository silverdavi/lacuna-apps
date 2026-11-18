import { expect, test } from '@playwright/test'

test('swap exchanges the two units and keeps the value', async ({ page }) => {
  await page.goto('/')
  const meters = page.getByLabel('Value in Meters')
  await meters.fill('2')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByLabel('Value in Feet')).toHaveValue('6.56168')

  await page.getByRole('button', { name: 'Swap units' }).click()

  const feetInput = page.getByLabel('Value in Feet')
  const metersInput = page.getByLabel('Value in Meters')
  await expect(feetInput).toHaveValue('6.56168')
  await expect(metersInput).toHaveValue('2')

  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(feetInput).toHaveValue('6.56168')
  await expect(metersInput).toHaveValue('2')
})
