import { expect, test, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/')
}

test('[A1] page shows the heading "Morse Code Translator"', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Morse Code Translator' })).toBeVisible()
})

test('[A2] typing "SOS" and clicking Convert shows "…–– …–– …––"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Input').fill('SOS')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByText('…–– …–– …––')).toBeVisible()
})

test('[A3] clicking Swap moves "…–– …–– …––" to the input and "SOS" to the output', async ({ page }) => {
  await open(page)
  await page.getByLabel('Input').fill('SOS')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByText('…–– …–– …––')).toBeVisible()

  await page.getByRole('button', { name: 'Swap' }).click()

  await expect(page.getByLabel('Input')).toHaveValue('…–– …–– …––')
  await expect(page.getByText('SOS')).toBeVisible()
})

test('[A4] typing "HELLO" and clicking Convert shows "…… .–. .–. –––"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Input').fill('HELLO')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByText('…… .–. .–. –––')).toBeVisible()
})

test('[A5] typing "123" and clicking Convert shows "––––– ––––– …––––"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Input').fill('123')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByText('––––– ––––– …––––')).toBeVisible()
})

test('[A6] clicking Copy after converting "SOS" copies "…–– …–– …––" to the clipboard', async ({ page, context }) => {
  // the user action that copies must happen after the clipboard permission is granted
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)
  await page.getByLabel('Input').fill('SOS')
  await page.getByRole('button', { name: 'Convert' }).click()
  await page.getByRole('button', { name: 'Copy' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const after = await page.evaluate(() => navigator.clipboard.readText())
  expect(after).toBe('…–– …–– …––')
})

test('[A7] converting "SOS" and "HELLO" shows two history items containing them', async ({ page }) => {
  await open(page)
  await page.getByLabel('Input').fill('SOS')
  await page.getByRole('button', { name: 'Convert' }).click()
  await page.getByLabel('Input').fill('HELLO')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByText('SOS', { exact: true })).toBeVisible()
  await expect(page.getByText('HELLO', { exact: true })).toBeVisible()
  await expect(page.locator('li')).toHaveCount(2)
})

test('[A8] clicking Clear history removes all items from the history list', async ({ page }) => {
  await open(page)
  await page.getByLabel('Input').fill('SOS')
  await page.getByRole('button', { name: 'Convert' }).click()
  await page.getByLabel('Input').fill('HELLO')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByText('SOS', { exact: true })).toBeVisible()
  await expect(page.getByText('HELLO', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Clear history' }).click()

  await expect(page.getByText('SOS', { exact: true })).toHaveCount(0)
  await expect(page.getByText('HELLO', { exact: true })).toHaveCount(0)
  await expect(page.locator('li')).toHaveCount(0)
})

test('[A9] reload keeps the history items "SOS" and "HELLO" visible', async ({ page }) => {
  await open(page)
  await page.getByLabel('Input').fill('SOS')
  await page.getByRole('button', { name: 'Convert' }).click()
  await page.getByLabel('Input').fill('HELLO')
  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(page.getByText('SOS', { exact: true })).toBeVisible()
  await expect(page.getByText('HELLO', { exact: true })).toBeVisible()

  await page.reload()

  await expect(page.getByText('SOS', { exact: true })).toBeVisible()
  await expect(page.getByText('HELLO', { exact: true })).toBeVisible()
})
