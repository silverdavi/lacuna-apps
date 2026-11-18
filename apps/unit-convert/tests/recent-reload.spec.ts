import { expect, test } from '@playwright/test'

test('the Recent list survives a reload', async ({ page }) => {
  await page.goto('/')
  const meters = page.getByLabel('Value in Meters')
  await meters.fill('5')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByRole('button', { name: '5 Meters = 16.4042 Feet · Length' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: '5 Meters = 16.4042 Feet · Length' })).toBeVisible()
})
