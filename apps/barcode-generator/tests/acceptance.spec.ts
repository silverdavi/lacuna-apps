import { expect, test } from '@playwright/test'

test('[A1] initial page shows heading, barcode type select, data field, and generate button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Barcode Generator' })).toBeVisible()
  await expect(page.getByLabel('Barcode type')).toBeVisible()
  await expect(page.getByLabel('Data')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible()
  const select = page.getByLabel('Barcode type')
  const options = await select.locator('option').allTextContents()
  expect(options).toContain('Code 128')
  expect(options).toContain('EAN-13')
  expect(options).toContain('QR Code')
})

test('[A2] Code 128 for HELLO shows preview image and label', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Data').fill('HELLO')
  await page.getByLabel('Barcode type').selectOption({ label: 'Code 128' })
  await page.getByRole('button', { name: 'Generate' }).click()
  const preview = page.getByText('Code 128: HELLO')
  await expect(preview).toBeVisible()
  await expect(preview.locator('xpath=ancestor::*[2]')).toContainElement(page.locator('img'))
})

test('[A3] EAN-13 from 12 digits appends computed check digit', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Data').fill('123456789012')
  await page.getByLabel('Barcode type').selectOption({ label: 'EAN-13' })
  await page.getByRole('button', { name: 'Generate' }).click()
  const preview = page.getByText('EAN-13: 1234567890123')
  await expect(preview).toBeVisible()
  await expect(preview.locator('xpath=ancestor::*[2]')).toContainElement(page.locator('img'))
})

test('[A4] EAN-13 with 13 digits shows an error and no image', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Data').fill('1234567890123')
  await page.getByLabel('Barcode type').selectOption({ label: 'EAN-13' })
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('EAN-13 requires exactly 12 digits')).toBeVisible()
  const text = await page.getByText('EAN-13 requires exactly 12 digits').innerText()
  expect(text).toBe('EAN-13 requires exactly 12 digits')
  await expect(page.locator('img')).toHaveCount(0)
})

test('[A5] QR Code for Hello World shows preview image and label', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Data').fill('Hello World')
  await page.getByLabel('Barcode type').selectOption({ label: 'QR Code' })
  await page.getByRole('button', { name: 'Generate' }).click()
  const preview = page.getByText('QR Code: Hello World')
  await expect(preview).toBeVisible()
  await expect(preview.locator('xpath=ancestor::*[2]')).toContainElement(page.locator('img'))
})

test('[A6] Download PNG after generating Code 128 downloads a .png file', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Data').fill('HELLO')
  await page.getByLabel('Barcode type').selectOption({ label: 'Code 128' })
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('Code 128: HELLO')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PNG' }).click(),
  ])
  expect(download.suggestedFilename().endsWith('.png')).toBe(true)
})

test('[A7] empty data shows an error and no image', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Data').fill('')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('Enter data to generate a barcode')).toBeVisible()
  await expect(page.locator('img')).toHaveCount(0)
})

test('[A8] preview survives a reload after generating Code 128 for HELLO', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Data').fill('HELLO')
  await page.getByLabel('Barcode type').selectOption({ label: 'Code 128' })
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('Code 128: HELLO')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Code 128: HELLO')).toBeVisible()
})
