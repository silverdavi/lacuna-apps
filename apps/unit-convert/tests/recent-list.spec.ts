import { expect, test } from '@playwright/test'

test('completed conversions are added to Recent, newest first', async ({ page }) => {
  await page.goto('/')

  const meters = page.getByLabel('Value in Meters')
  await meters.fill('1')
  await page.getByRole('button', { name: 'Convert' }).click()

  await meters.fill('2')
  await page.getByRole('button', { name: 'Convert' }).click()

  const items = page.getByRole('button', { name: /· Length/ })
  await expect(items).toHaveCount(2)
  const first = await items.first().innerText()
  const second = await items.nth(1).innerText()
  expect(first).toContain('2 Meters')
  expect(second).toContain('1 Meters')
})

test('clicking a recent entry restores it', async ({ page }) => {
  await page.goto('/')
  const meters = page.getByLabel('Value in Meters')
  await meters.fill('1')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByLabel('Value in Feet')).toHaveValue('3.28084')

  await meters.fill('2')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByLabel('Value in Feet')).toHaveValue('6.56168')

  await page.getByRole('button', { name: '1 Meters = 3.28084 Feet · Length' }).click()
  await expect(meters).toHaveValue('1')
  await expect(page.getByLabel('Value in Feet')).toHaveValue('3.28084')
})
