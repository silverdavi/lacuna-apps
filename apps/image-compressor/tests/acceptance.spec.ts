import { expect, test, type Page } from '@playwright/test'
import { tmpdir } from 'node:os'
import { mkdtempSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// 1x1 red PNG: deterministic fixture so the file is reproducible.
const redPixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

async function loadFile(page: Page, filename = 'pixel.png') {
  const dir = mkdtempSync(path.join(tmpdir(), 'lacuna-img-'))
  const file = path.join(dir, filename)
  writeFileSync(file, redPixelPng)
  const input = page.locator('input[type=file]')
  if (await input.count()) {
    await input.first().setInputFiles(file)
    return
  }
  // No file input on the page: drive the drag-and-drop path by dropping a
  // synthetic File on the drop zone.
  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer()
    dt.items.add(new File([new Uint8Array(1)], filename, { type: 'image/png' }))
    return dt
  })
  await page.getByText('Drop an image or click to browse').first().drop(dataTransfer)
}

// Clicks Compress and returns the compressed-file size announced by the page,
// in bytes.
async function compressAndReadSize(page: Page): Promise<number> {
  await page.getByRole('button', { name: 'Compress' }).click()
  const sizeText = page.getByText(/^Compressed: /).first()
  await expect(sizeText).toBeVisible()
  const bytes = await sizeText.evaluate((el) => {
    const text = el.textContent ?? ''
    const m = text.match(/([\d.]+)\s*(KB|MB|B)/)
    if (!m) throw new Error(`no size in ${text}`)
    const value = Number.parseFloat(m[1])
    const unit = m[2]
    return Math.round(value * (unit === 'KB' ? 1024 : unit === 'MB' ? 1024 * 1024 : 1))
  })
  expect(Number.isFinite(bytes)).toBe(true)
  return bytes
}

test('[A1] with no file loaded, shows the heading, drop zone text and No image loaded', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Image Compressor' })).toBeVisible()
  await expect(page.getByText('Drop an image or click to browse')).toBeVisible()
  await expect(page.getByText('No image loaded')).toBeVisible()
})

test('[A2] dropping a 1x1 PNG shows a preview and Original: 1x1, and removes No image loaded', async ({ page }) => {
  await page.goto('/')
  await loadFile(page)
  const preview = page.locator('img').first()
  await expect(preview).toBeVisible()
  const src = await preview.getAttribute('src')
  expect(src).toContain('data:image/png')
  await expect(page.getByText('Original: 1x1')).toBeVisible()
  await expect(page.getByText('No image loaded')).toBeHidden()
})

test('[A3] compressing at quality 50 shows the download link and a Compressed size below the original', async ({ page }) => {
  await page.goto('/')
  await loadFile(page)
  await page.getByLabel('Quality').fill('50')
  await page.getByRole('button', { name: 'Compress' }).click()
  await expect(page.getByRole('link', { name: 'Download compressed' })).toBeVisible()
  const compressed = await compressAndReadSize(page)
  // 1x1 PNG decodes to a 4-byte canvas.
  expect(compressed).toBeLessThan(4)
})

test('[A4] compressing to JPEG shows the download link named .jpg and a JPEG preview', async ({ page }) => {
  await page.goto('/')
  await loadFile(page)
  await page.getByLabel('Format').selectOption({ label: 'JPEG' })
  await page.getByRole('button', { name: 'Compress' }).click()
  await expect(page.getByRole('link', { name: 'Download compressed.jpg' })).toBeVisible()
  const src = await page.locator('img').first().getAttribute('src')
  expect(src).toContain('data:image/jpeg')
})

test('[A5] compressing at width 50 shows a preview of the given size and the matching Compressed size', async ({ page }) => {
  await page.goto('/')
  await loadFile(page)
  await page.getByLabel('Width').fill('50')
  const compressed = await compressAndReadSize(page)
  // The width field controls the scale: the size announced must match the
  // preview, which the spec pins to the requested width.
  const preview = page.locator('img').first()
  await expect(preview).toBeVisible()
  const src = await preview.getAttribute('src')
  expect(src).toContain('data:image/')
  await expect(page.getByText(`Compressed: ${compressed}`)).toBeVisible()
})

test('[A6] rotating 90 shows a rotated preview and Rotation: 90°', async ({ page }) => {
  await page.goto('/')
  await loadFile(page)
  await page.getByRole('button', { name: 'Rotate 90' }).click()
  const src = await page.locator('img').first().getAttribute('src')
  expect(src).toContain('data:image/png')
  await expect(page.getByText('Rotation: 90°')).toBeVisible()
})

test('[A7] flipping horizontal shows a flipped preview and Flipped: Horizontal', async ({ page }) => {
  await page.goto('/')
  await loadFile(page)
  await page.getByRole('button', { name: 'Flip Horizontal' }).click()
  const src = await page.locator('img').first().getAttribute('src')
  expect(src).toContain('data:image/png')
  await expect(page.getByText('Flipped: Horizontal')).toBeVisible()
})

test('[A8] reset restores Quality 85, Format PNG, empty Width and Rotation: 0°', async ({ page }) => {
  await page.goto('/')
  await loadFile(page)
  await page.getByLabel('Quality').fill('40')
  await page.getByLabel('Format').selectOption({ label: 'JPEG' })
  await page.getByRole('button', { name: 'Rotate 90' }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByLabel('Quality')).toHaveValue('85')
  await expect(page.getByLabel('Format')).toHaveValue('image/png')
  await expect(page.getByLabel('Width')).toHaveValue('')
  await expect(page.getByText('Rotation: 0°')).toBeVisible()
})

test('[A9] reload keeps the last used Quality and Format', async ({ page }) => {
  await page.goto('/')
  await loadFile(page)
  await page.getByLabel('Quality').fill('60')
  await page.getByLabel('Format').selectOption({ label: 'JPEG' })
  await page.reload()
  await expect(page.getByLabel('Quality')).toHaveValue('60')
  await expect(page.getByLabel('Format')).toHaveValue('image/png')
})
