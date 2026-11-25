import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('[A1] page shows the heading and the empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Image To PDF' })).toBeVisible()
  await expect(page.getByText('No images yet')).toBeVisible()
})

test('[A2] clicking Add image adds Image 1 with 1280 x 720 and hides the empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add image' }).click()
  const item = page.locator('li', { hasText: 'Image 1' })
  await expect(item).toContainText('1280 x 720')
  await expect(page.getByText('No images yet')).toHaveCount(0)
})

test('[A3] a second Add image adds Image 2 with 800 x 600 after Image 1', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByRole('button', { name: 'Add image' }).click()
  const list = page.locator('li')
  await expect(list).toHaveCount(2)
  await expect(list.nth(0)).toContainText('Image 1')
  await expect(list.nth(1)).toContainText('Image 2')
  await expect(page.locator('li', { hasText: 'Image 2' })).toContainText('800 x 600')
})

test('[A4] Move up on Image 2 reorders the list so Image 2 comes first', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByRole('button', { name: 'Move up' }).click()
  const list = page.locator('li')
  await expect(list.nth(0)).toContainText('Image 2')
  await expect(list.nth(1)).toContainText('Image 1')
})

test('[A5] Delete Image 1 removes that item, leaving Image 2 and Pages: 1', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByRole('button', { name: 'Delete Image 1' }).click()
  await expect(page.locator('li', { hasText: 'Image 2' })).toHaveCount(1)
  await expect(page.locator('li', { hasText: 'Image 1' })).toHaveCount(0)
  await expect(page.getByText('Pages: 1')).toBeVisible()
})

test('[A6] Download PDF with page size A4 downloads images.pdf larger than 0 bytes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByLabel('Page size').selectOption({ label: 'A4' })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PDF' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('images.pdf')
  const data = readFileSync((await download.path())!)
  expect(data.length, 'downloaded PDF is larger than 0 bytes').toBeGreaterThan(0)
})

// A7 only fixes the file name; the size difference follows from the spec's own example.
test('[A7] Download PDF with page size Letter downloads images.pdf of a different size than A4', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByLabel('Page size').selectOption({ label: 'A4' })
  const [a4] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PDF' }).click(),
  ])
  expect(a4.suggestedFilename()).toBe('images.pdf')
  const a4Bytes = readFileSync((await a4.path())!).length
  await page.getByLabel('Page size').selectOption({ label: 'Letter' })
  const [letter] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PDF' }).click(),
  ])
  expect(letter.suggestedFilename()).toBe('images.pdf')
  const letterBytes = readFileSync((await letter.path())!).length
  expect(letterBytes, 'Letter download differs from the A4 download').not.toBe(a4Bytes)
})

test('[A8] after adding both images, reloading keeps their order and the summary Pages: 2', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.getByRole('button', { name: 'Add image' }).click()
  await page.reload()
  const list = page.locator('li')
  await expect(list).toHaveCount(2)
  await expect(list.nth(0)).toContainText('Image 1')
  await expect(list.nth(1)).toContainText('Image 2')
  await expect(page.getByText('Pages: 2')).toBeVisible()
})

test('[A9] reloading keeps the selected page size A4', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Page size').selectOption({ label: 'A4' })
  await page.reload()
  await expect(page.getByLabel('Page size')).toHaveValue('A4')
})
