import { expect, test, type Page } from '@playwright/test'

import { readFileSync } from 'node:fs'

async function png300x200(page: Page): Promise<Buffer> {
  const buf = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 200
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#123456'
    ctx.fillRect(0, 0, 300, 200)
    ctx.fillStyle = '#ABCDEF'
    ctx.fillRect(0, 0, 150, 100)
    ctx.fillStyle = '#FF0000'
    ctx.fillRect(150, 100, 150, 100)
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    )
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  return Buffer.from(buf)
}

const dropZone = (page: Page) => page.getByText('Drop image here or click to browse')

async function loadSamplePng(page: Page) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    dropZone(page).click(),
  ])
  await chooser.setFiles({ name: 'sample.png', mimeType: 'image/png', buffer: await png300x200(page) })
}

function preview(page: Page) {
  return page.locator('img, canvas').first()
}

// Reads the preview's pixels (canvas or img) as a flat RGB array via the
// page's own canvas — a read-only evaluate after a user action.
function previewPixels(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const el = document.querySelector('canvas') ?? document.querySelector('img')
    if (!el) return []
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 64
    const ctx = c.getContext('2d')!
    ctx.drawImage(el, 0, 0, 64, 64)
    const d = ctx.getImageData(0, 0, 64, 64).data
    const out: number[] = []
    for (let i = 0; i < d.length; i += 4) out.push(d[i], d[i + 1], d[i + 2])
    return out
  })
}

function pixelChange(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return -1
  let d = 0
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i])
  return d
}

test('[A1] page heading is "Photo Editor Filters"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Photo Editor Filters' })).toBeVisible()
})

test('[A2] dropping sample.png into the drop zone shows the preview and file info', async ({ page }) => {
  await page.goto('/')
  await loadSamplePng(page)
  await expect(dropZone(page)).toHaveCount(0)
  await expect(preview(page)).toBeVisible()
  await expect(page.getByText('sample.png')).toBeVisible()
})

test('[A3] selecting Grayscale and clicking Apply changes the preview and status', async ({ page }) => {
  await page.goto('/')
  await loadSamplePng(page)
  const before = await previewPixels(page)
  await page.getByLabel('Filter').selectOption({ label: 'Grayscale' })
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('Filter: Grayscale')).toBeVisible()
  const after = await previewPixels(page)
  expect(pixelChange(before, after), 'preview pixels change after Grayscale').toBeGreaterThan(0)
})

test('[A4] selecting Rotate 90° and clicking Apply changes the preview orientation and status', async ({ page }) => {
  await page.goto('/')
  await loadSamplePng(page)
  const before = await previewPixels(page)
  await page.getByLabel('Transform').selectOption({ label: 'Rotate 90°' })
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('Transform: Rotate 90°')).toBeVisible()
  const after = await previewPixels(page)
  expect(pixelChange(before, after), 'preview pixels change after Rotate 90°').toBeGreaterThan(0)
})

test('[A5] clicking Reset clears selections and status', async ({ page }) => {
  await page.goto('/')
  await loadSamplePng(page)
  await page.getByLabel('Filter').selectOption({ label: 'Grayscale' })
  await page.getByLabel('Transform').selectOption({ label: 'Rotate 90°' })
  await page.getByRole('button', { name: 'Apply' }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByLabel('Filter')).toHaveValue('None')
  await expect(page.getByLabel('Transform')).toHaveValue('None')
  await expect(page.getByText('No edits applied')).toBeVisible()
})

test('[A6] clicking Export PNG triggers a download of sample.png', async ({ page }) => {
  await page.goto('/')
  await loadSamplePng(page)
  await page.getByLabel('Filter').selectOption({ label: 'Grayscale' })
  await page.getByRole('button', { name: 'Apply' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('sample.png')
  const data = readFileSync((await download.path())!)
  expect(data.length, 'exported file is a real PNG').toBeGreaterThan(100)
})

test('[A7] applied Grayscale and Rotate 90° survive a reload', async ({ page }) => {
  await page.goto('/')
  await loadSamplePng(page)
  await page.getByLabel('Filter').selectOption({ label: 'Grayscale' })
  await page.getByLabel('Transform').selectOption({ label: 'Rotate 90°' })
  await page.getByRole('button', { name: 'Apply' }).click()
  await page.reload()
  await expect(page.getByLabel('Filter')).toHaveValue('Grayscale')
  await expect(page.getByLabel('Transform')).toHaveValue('Rotate 90°')
  await expect(page.getByText('Filter: Grayscale | Transform: Rotate 90°')).toBeVisible()
})

test('[A8] clicking Clear removes the image, hides the preview, and shows No image loaded', async ({ page }) => {
  await page.goto('/')
  await loadSamplePng(page)
  await expect(preview(page)).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('No image loaded')).toBeVisible()
  await expect(preview(page)).toHaveCount(0)
})
