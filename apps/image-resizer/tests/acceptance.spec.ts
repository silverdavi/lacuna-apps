import { expect, test } from '@playwright/test'
import * as path from 'node:path'

function pngFile(width: number, height: number): { name: string; buffer: Buffer } {
  const buffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )
  return { name: `test-${width}x${height}.png`, buffer }
}

test('[A1] page shows the heading and the drop prompt', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Image Resizer' })).toBeVisible()
  await expect(page.getByText('Drop an image to begin')).toBeVisible()
})

test('[A2] dropping a PNG shows a preview and the original size', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  const buffer = pngFile(1000, 800).buffer
  await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer })
  await expect(page.locator('img')).toBeVisible()
  await expect(page.getByLabel('Original size')).toContainText('1000 × 800 px')
})

test('[A3] setting width to 500 and applying resize updates output size and enables download', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pngFile(1000, 800).buffer })
  await page.getByLabel('Width').fill('500')
  await page.getByRole('button', { name: 'Apply resize' }).click()
  await expect(page.getByLabel('Output size')).toContainText('500 × 400 px')
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
})

test('[A4] selecting JPEG and setting quality to 85 then applying keeps output size and shows JPEG', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pngFile(1000, 800).buffer })
  await page.getByLabel('Width').fill('500')
  await page.getByLabel('Format').selectOption('JPEG')
  await page.getByLabel('Quality').fill('85')
  await page.getByRole('button', { name: 'Apply resize' }).click()
  await expect(page.getByLabel('Output size')).toContainText('500 × 400 px')
  await expect(page.getByLabel('Format')).toHaveValue('JPEG')
})

test('[A5] downloading a PNG produces a file named resized-image.png', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pngFile(1000, 800).buffer })
  await page.getByLabel('Width').fill('500')
  await page.getByRole('button', { name: 'Apply resize' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(path.basename(download.suggestedFilename())).toBe('resized-image.png')
})

test('[A5] downloading a JPEG produces a file named resized-image.jpg', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pngFile(1000, 800).buffer })
  await page.getByLabel('Width').fill('500')
  await page.getByLabel('Format').selectOption('JPEG')
  await page.getByRole('button', { name: 'Apply resize' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(path.basename(download.suggestedFilename())).toBe('resized-image.jpg')
})

test('[A6] processing an image adds a history entry with name and dimensions', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pngFile(1000, 800).buffer })
  await page.getByLabel('Width').fill('500')
  await page.getByRole('button', { name: 'Apply resize' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  await download.cancel().catch(() => {})
  const history = page.locator('section[aria-label="History"]')
  await expect(history).toContainText('resized-image.png')
  await expect(history).toContainText('500 × 400 px')
})

test('[A7] deleting a history entry removes it and shows the empty state', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pngFile(1000, 800).buffer })
  await page.getByLabel('Width').fill('500')
  await page.getByRole('button', { name: 'Apply resize' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  await download.cancel().catch(() => {})
  await page.getByRole('button', { name: 'Delete resized-image.png' }).click()
  await expect(page.getByText('No history yet')).toBeVisible()
})

test('[A8] rotating a 1000x800 image by 90 degrees updates the output size', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pngFile(1000, 800).buffer })
  await page.getByRole('button', { name: 'Rotate 90°' }).click()
  await expect(page.getByLabel('Output size')).toContainText('800 × 1000 px')
})

test('[A9] history persists across a reload', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pngFile(1000, 800).buffer })
  await page.getByLabel('Width').fill('500')
  await page.getByRole('button', { name: 'Apply resize' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  await download.cancel().catch(() => {})
  await page.reload()
  const history = page.locator('section[aria-label="History"]')
  await expect(history).toContainText('resized-image.png')
  await expect(history).toContainText('500 × 400 px')
})
