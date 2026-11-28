import { expect, test, type Page } from '@playwright/test'
import * as path from 'node:path'

const jpegBuffer = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/If4mK//Z',
  'base64',
)

function dropFile(page: Page, name: string, buffer: Buffer, mimeType = 'image/jpeg') {
  const input = page.locator('input[type="file"]').first()
  return input.setInputFiles({ name, mimeType, buffer })
}

async function addSunset(page: Page) {
  await dropFile(page, 'sunset.jpg', jpegBuffer)
}

function pngBuffer(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )
}

// Reads the lightbox image's pixels so rotation can be verified deterministically.
async function lightboxImage(page: Page): Promise<{ data: number[]; width: number; height: number }> {
  return page.evaluate(() => {
    const img = Array.from(document.querySelectorAll('img')).reverse().find((el) => el.closest('[role="dialog"], .lightbox, .overlay')) ?? document.querySelector('img')
    if (!img) return { data: [], width: 0, height: 0 }
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    return { data: Array.from(ctx.getImageData(0, 0, c.width, c.height).data), width: c.width, height: c.height }
  })
}

function pixelDiff(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let d = 0
  for (let i = 0; i < n; i++) d += Math.abs(a[i] - b[i])
  return d
}

test('[A1] page shows heading and empty-state text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Local Photo Gallery' })).toBeVisible()
  await expect(page.getByText('No photos yet')).toBeVisible()
})

test('[A2] dropping sunset.jpg adds a labeled grid item with thumbnail and removes the empty state', async ({ page }) => {
  await page.goto('/')
  await addSunset(page)
  await expect(page.getByText('No photos yet')).toHaveCount(0)
  const item = page.locator('li, article, figure').filter({ hasText: 'sunset.jpg' }).first()
  await expect(item.getByText('sunset.jpg')).toBeVisible()
  await expect(item.locator('img')).toBeVisible()
})

test('[A3] clicking the grid item opens a lightbox with the image and a Close button', async ({ page }) => {
  await page.goto('/')
  await addSunset(page)
  await page.getByText('sunset.jpg').click()
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()
  await expect(page.locator('img').last()).toBeVisible()
})

test('[A4] Rotate 90 rotates the lightbox image clockwise and the label is unchanged', async ({ page }) => {
  await page.goto('/')
  await addSunset(page)
  await page.getByText('sunset.jpg').click()
  const before = await lightboxImage(page)
  await page.getByRole('button', { name: 'Rotate 90' }).click()
  const after = await lightboxImage(page)
  expect(pixelDiff(before.data, after.data), 'image changed after rotation').toBeGreaterThan(0)
  // a 90-degree rotation of a 4x6 source must swap width and height
  expect([after.width, after.height]).toEqual([before.height, before.width])
  await expect(page.getByRole('button', { name: 'Rotate 90' })).toBeVisible()
})

test('[A5] Export downloads sunset_rotated.jpg and the lightbox stays open', async ({ page }) => {
  await page.goto('/')
  await addSunset(page)
  await page.getByText('sunset.jpg').click()
  await page.getByRole('button', { name: 'Rotate 90' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ])
  expect(path.basename(download.suggestedFilename())).toBe('sunset_rotated.jpg')
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()
})

test('[A6] closing the lightbox returns to the grid and the item persists', async ({ page }) => {
  await page.goto('/')
  await addSunset(page)
  await page.getByText('sunset.jpg').click()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0)
  await expect(page.getByText('sunset.jpg')).toBeVisible()
})

test('[A7] dragging beach.png above sunset.jpg reorders the grid', async ({ page }) => {
  await page.goto('/')
  await addSunset(page)
  await dropFile(page, 'beach.png', pngBuffer(), 'image/png')
  const names = page.locator('li, article, figure').filter({ hasText: /\.(jpg|png)$/ })
  await names.first().getByText('beach.png').click()
  await page.getByRole('button', { name: 'Close' }).click()
  await names.first().dragTo(names.last())
  const order = await names.allInnerTexts()
  expect(order[0]).toContain('beach.png')
  expect(order[1]).toContain('sunset.jpg')
})

test('[A8] Delete beach.png removes the item and leaves sunset.jpg', async ({ page }) => {
  await page.goto('/')
  await addSunset(page)
  await dropFile(page, 'beach.png', pngBuffer(), 'image/png')
  await page.getByRole('button', { name: 'Delete beach.png' }).click()
  await expect(page.getByText('beach.png')).toHaveCount(0)
  await expect(page.getByText('sunset.jpg')).toBeVisible()
})

test('[A9] reload keeps sunset.jpg and the heading', async ({ page }) => {
  await page.goto('/')
  await addSunset(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Local Photo Gallery' })).toBeVisible()
  await expect(page.getByText('sunset.jpg')).toBeVisible()
  await expect(page.getByText('No photos yet')).toHaveCount(0)
})
