import { expect, test, type Page } from '@playwright/test'

const selectUnit = async (page: Page, label: string, option: string) => {
  await page.getByLabel(label).selectOption({ label: option })
}

const runConversion = async (page: Page, amount: string, from: string, to: string) => {
  await page.getByLabel('Amount').fill(amount)
  await selectUnit(page, 'From unit', from)
  await selectUnit(page, 'To unit', to)
}

test('[A1] page heading is "Cooking Unit Converter"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Cooking Unit Converter' })).toBeVisible()
})

test('[A2] 1 Cups to Tablespoons shows 16', async ({ page }) => {
  await page.goto('/')
  await runConversion(page, '1', 'Cups', 'Tablespoons')
  await expect(page.getByLabel('Result')).toHaveValue('16')
})

test('[A3] 250 Grams to Ounces shows 8.82', async ({ page }) => {
  await page.goto('/')
  await runConversion(page, '250', 'Grams', 'Ounces')
  await expect(page.getByLabel('Result')).toHaveValue('8.82')
})

test('[A4] 1 1/2 Cups to Teaspoons shows 72', async ({ page }) => {
  await page.goto('/')
  await runConversion(page, '1 1/2', 'Cups', 'Teaspoons')
  await expect(page.getByLabel('Result')).toHaveValue('72')
})

test('[A5] 100 Celsius to Fahrenheit shows 212', async ({ page }) => {
  await page.goto('/')
  await runConversion(page, '100', 'Celsius', 'Fahrenheit')
  await expect(page.getByLabel('Result')).toHaveValue('212')
})

test('[A6] Copy result shows toast', async ({ page }) => {
  await page.goto('/')
  await runConversion(page, '1', 'Cups', 'Tablespoons')
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Copied 16 Tablespoons to clipboard')).toBeVisible()
})

test('[A7] History tab shows the conversion', async ({ page }) => {
  await page.goto('/')
  await runConversion(page, '1', 'Cups', 'Tablespoons')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('listitem', { name: /1 Cups → 16 Tablespoons/ })).toBeVisible()
})

test('[A8] Clear history removes all items and shows placeholder', async ({ page }) => {
  await page.goto('/')
  await runConversion(page, '1', 'Cups', 'Tablespoons')
  await page.getByRole('tab', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No conversions yet')).toBeVisible()
})

test('[A9] History entry persists across reload', async ({ page }) => {
  await page.goto('/')
  await runConversion(page, '1', 'Cups', 'Tablespoons')
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('listitem', { name: /1 Cups → 16 Tablespoons/ })).toBeVisible()
})
