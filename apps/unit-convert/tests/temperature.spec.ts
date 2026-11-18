import { expect, test } from '@playwright/test'

test('100 Celsius is 212 Fahrenheit', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Temperature' }).click()
  const celsius = page.getByLabel('Value in Celsius')
  await celsius.fill('100')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByLabel('Value in Fahrenheit')).toHaveValue('212')
})

test('-40 Celsius is -40 Fahrenheit', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Temperature' }).click()
  const celsius = page.getByLabel('Value in Celsius')
  await celsius.fill('-40')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByLabel('Value in Fahrenheit')).toHaveValue('-40')
})
