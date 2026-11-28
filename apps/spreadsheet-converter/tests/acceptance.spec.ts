import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Sheet Converter and builds Excel XLSX workbook', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Sheet Converter' })).toBeVisible()
  await expect(page.getByLabel('Converted table')).toHaveValue(/Binary Excel Workbook/)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download products.xlsx' }).click()
  expect((await dl).suggestedFilename()).toBe('products.xlsx')
})

test('[A2] Converts to SQL INSERT and Markdown and persists across reload', async ({ page }) => {
  await page.getByLabel('Output format').selectOption('sql')
  await expect(page.getByLabel('Converted table')).toHaveValue(/INSERT INTO products/)

  await page.getByLabel('Output format').selectOption('markdown')
  await expect(page.getByLabel('Converted table')).toHaveValue(/\| id \| product \|/)

  await page.reload()
  await expect(page.getByLabel('Output format')).toHaveValue('markdown')
})
