import { expect, test, type Page } from '@playwright/test'

async function saveConversion(page: Page, value: string) {
  await page.getByLabel('Meters').fill(value)
  await page.getByRole('button', { name: 'Save conversion', exact: true }).click()
}

test('[A1] typing 1 in Meters shows 3.28084 in Feet', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Meters', { exact: true }).fill('1')
  await expect(page.getByLabel('Feet', { exact: true })).toHaveValue('3.28084')
})

test('[A2] typing 10 in Feet shows 3.048 in Meters', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Feet', { exact: true }).fill('10')
  await expect(page.getByLabel('Meters', { exact: true })).toHaveValue('3.048')
})

test('[A3] Temperature: 100 Celsius shows 212 Fahrenheit; -40 shows -40', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Temperature', exact: true }).click()
  await page.getByLabel('Celsius', { exact: true }).fill('100')
  await expect(page.getByLabel('Fahrenheit', { exact: true })).toHaveValue('212')
  await page.getByLabel('Celsius', { exact: true }).fill('-40')
  await expect(page.getByLabel('Fahrenheit', { exact: true })).toHaveValue('-40')
})

test('[A4] switching to Mass clears fields and hides Meters', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Meters', { exact: true }).fill('1')
  await page.getByRole('tab', { name: 'Mass', exact: true }).click()
  await expect(page.getByLabel('Kilograms', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Pounds', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Meters', { exact: true })).toHaveCount(0)
})

test('[A5] Swap units puts 1 in Feet and 0.3048 in Meters', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Meters', { exact: true }).fill('1')
  await page.getByRole('button', { name: 'Swap units', exact: true }).click()
  await expect(page.getByLabel('Feet', { exact: true })).toHaveValue('1')
  await expect(page.getByLabel('Meters', { exact: true })).toHaveValue('0.3048')
})

test('[A6] typing abc in Meters shows "Enter a number" and leaves Feet empty', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Meters', { exact: true }).fill('abc')
  await expect(page.getByText('Enter a number', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Feet', { exact: true })).toHaveValue('')
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toContain('NaN')
})

test('[A7] saving three conversions shows 3 recent items in order and restore works', async ({ page }) => {
  await page.goto('/')
  await saveConversion(page, '1')
  await saveConversion(page, '2')
  await saveConversion(page, '3')

  const items = page.getByRole('list', { name: 'Recent' }).getByRole('button')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toHaveText('3 Meters = 9.84252 Feet')
  await expect(items.nth(1)).toHaveText('2 Meters = 6.56168 Feet')
  await expect(items.nth(2)).toHaveText('1 Meters = 3.28084 Feet')

  await items.nth(2).click()
  await expect(page.getByLabel('Meters', { exact: true })).toHaveValue('1')
  await expect(page.getByLabel('Feet', { exact: true })).toHaveValue('3.28084')
})

test('[A8] saving 1 through 11 keeps 10 recent items', async ({ page }) => {
  await page.goto('/')
  for (let i = 1; i <= 11; i++) {
    await saveConversion(page, String(i))
  }

  const items = page.getByRole('list', { name: 'Recent' }).getByRole('button')
  await expect(items).toHaveCount(10)
  await expect(items.nth(0)).toHaveText('11 Meters = 36.08924 Feet')
  await expect(items.nth(1)).toHaveText('10 Meters = 32.8084 Feet')
  await expect(items.nth(9)).toHaveText('2 Meters = 6.56168 Feet')
})

test('[A9] recent items survive a reload', async ({ page }) => {
  await page.goto('/')
  await saveConversion(page, '1')
  await page.reload()
  const item = page.getByRole('list', { name: 'Recent' }).getByRole('button', { name: '1 Meters = 3.28084 Feet', exact: true })
  await expect(item).toHaveCount(1)
})
