// Acceptance tests for unit-converter, one per acceptance check in the spec.
// The app has not been written yet; it is built against this file and must not change it.
import { expect, test } from '@playwright/test'

test('[A1] Length: typing 1 in Meters shows 3.28084 in Feet', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Value in Meters').fill('1')
  await expect(page.getByLabel('Value in Feet')).toHaveValue('3.28084')
})

test('[A2] Typing in the second field updates the first (two-way)', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Value in Feet').fill('1')
  await expect(page.getByLabel('Value in Meters')).toHaveValue('0.3048')
})

test('[A3] Temperature: 100 Celsius shows 212 Fahrenheit; -40 Celsius shows -40 Fahrenheit', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Temperature' }).click()
  const celsius = page.getByLabel('Value in Celsius')
  const fahrenheit = page.getByLabel('Value in Fahrenheit')
  await celsius.fill('100')
  await expect(fahrenheit).toHaveValue('212')
  await celsius.fill('-40')
  await expect(fahrenheit).toHaveValue('-40')
})

// A4 names no default units; A1 fixes the Length defaults as Meters -> Feet, so returning to Length must restore them.
test('[A4] Switching category resets units to defaults and clears the fields', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Value in Meters').fill('1')
  await expect(page.getByLabel('Value in Feet')).toHaveValue('3.28084')
  await page.getByRole('button', { name: 'Mass' }).click()
  const inputs = page.locator('input')
  await expect(inputs.nth(0)).toHaveValue('')
  await expect(inputs.nth(1)).toHaveValue('')
  await page.getByRole('button', { name: 'Length' }).click()
  await expect(page.getByLabel('Value in Meters')).toHaveValue('')
  await expect(page.getByLabel('Value in Feet')).toHaveValue('')
})

test('[A5] The swap button exchanges the two units and keeps the value', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Value in Meters').fill('1')
  await expect(page.getByLabel('Value in Feet')).toHaveValue('3.28084')
  await page.getByRole('button', { name: 'Swap' }).click()
  await expect(page.getByLabel('Value in Feet')).toHaveValue('1')
  await expect(page.getByLabel('Value in Meters')).toHaveValue('3.28084')
})

test('[A6] Non-numeric input shows an inline message and does not show NaN anywhere', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Value in Meters').fill('abc')
  await expect(page.getByText(/not a number|invalid/i)).toBeVisible()
  await expect(page.locator('body')).not.toContainText('NaN')
})

test('[A7] Each completed conversion is added to Recent (newest first, at most 10); clicking one restores it', async ({ page }) => {
  await page.goto('/')
  const meters = page.getByLabel('Value in Meters')
  // More than ten conversions so the cap of 10 is exercised.
  for (let i = 1; i <= 11; i++) {
    await meters.fill(String(i))
    await page.waitForTimeout(0)
  }
  const items = page.getByRole('button', { name: /· Length/ })
  await expect(items).toHaveCount(10)
  // Newest first: 11 Meters is the first entry, and the oldest (1 Meters) has been evicted.
  expect(await items.first().innerText()).toContain('11 Meters')
  expect(await items.last().innerText()).toContain('2 Meters')
  await expect(items.filter({ hasText: '1 Meters = ' })).toHaveCount(0)
  // Clicking an entry restores that conversion (the fields currently hold a different value).
  await meters.fill('7')
  await items.first().click()
  await expect(meters).toHaveValue('11')
  await expect(page.getByLabel('Value in Feet')).toHaveValue('36.09244')
})

test('[A8] Reload keeps the Recent list', async ({ page }) => {
  await page.goto('/')
  const meters = page.getByLabel('Value in Meters')
  await meters.fill('1')
  await expect(page.getByLabel('Value in Feet')).toHaveValue('3.28084')
  await meters.fill('11')
  await page.reload()
  const items = page.getByRole('button', { name: /· Length/ })
  await expect(items).toHaveCount(2)
  expect(await items.first().innerText()).toContain('11 Meters')
  expect(await items.last().innerText()).toContain('1 Meters')
})
