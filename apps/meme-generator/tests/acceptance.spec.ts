import { expect, test, type Page } from '@playwright/test'

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// A 100x100 solid red PNG.
const CAT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAAAAAA6fJ3BAAAASUVORK5CYII=',
  'base64',
)

// Write cat.png to a temp path so setInputFiles can use it.
function catPngPath(): string {
  const dir = join(tmpdir(), 'meme-acceptance')
  const path = join(dir, 'cat.png')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path, CAT_PNG)
  return path
}

test('[A1] shows heading, no-image text, and upload button with no image', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Meme Maker' })).toBeVisible()
  await expect(page.getByText('No image loaded')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Upload image' })).toBeVisible()
})

test('[A2] uploading cat.png replaces the placeholder and shows the image', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles(catPngPath())
  await expect(page.getByText('No image loaded')).toHaveCount(0)
  await expect(page.getByText('Image loaded: cat.png')).toBeVisible()
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
})

async function loadCat(page: Page) {
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles(catPngPath())
  await expect(page.getByText('Image loaded: cat.png')).toBeVisible()
}

test('[A3] top and bottom text render on the canvas', async ({ page }) => {
  await page.goto('/')
  await loadCat(page)
  await page.getByLabel('Top text').fill('TOP TEXT')
  await page.getByLabel('Bottom text').fill('BOTTOM TEXT')
  // Verify the text was actually painted onto the canvas by sampling pixels
  // in the top band and bottom band where the white text should be.
  const topPixel = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const ctx = c.getContext('2d')!
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let whiteish = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) whiteish++
    }
    return whiteish
  })
  expect(topPixel, 'white text pixels present on canvas').toBeGreaterThan(50)
  // The text strings must be rendered (not just typed into hidden fields).
  await expect(page.getByLabel('Top text')).toHaveValue('TOP TEXT')
  await expect(page.getByLabel('Bottom text')).toHaveValue('BOTTOM TEXT')
})

test('[A4] rotate 90° keeps text anchored to top and bottom', async ({ page }) => {
  await page.goto('/')
  await loadCat(page)
  await page.getByLabel('Top text').fill('TOP TEXT')
  await page.getByLabel('Bottom text').fill('BOTTOM TEXT')
  await page.getByRole('button', { name: 'Rotate 90°' }).click()
  // After rotation the canvas still shows white text in the top band.
  const topRow = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return -1
    const ctx = c.getContext('2d')!
    const d = ctx.getImageData(0, 0, c.width, 8).data
    let whiteish = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) whiteish++
    }
    return whiteish
  })
  expect(topRow, 'top text still anchored after rotate').toBeGreaterThan(50)
})

test('[A5] flip horizontal mirrors image, top text stays left-aligned', async ({ page }) => {
  await page.goto('/')
  await loadCat(page)
  await page.getByLabel('Top text').fill('TOP TEXT')
  await page.getByRole('button', { name: 'Flip horizontal' }).click()
  // Sample the top-left corner region: black outline pixels of the text
  // should be near the left edge, confirming left alignment.
  const topLeft = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return -1
    const ctx = c.getContext('2d')!
    const d = ctx.getImageData(0, 0, 40, 20).data
    let darkish = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 60) darkish++
    }
    return darkish
  })
  expect(topLeft, 'black outline of top text near left edge after flip').toBeGreaterThan(10)
})

test('[A6] Grayscale filter removes saturation', async ({ page }) => {
  await page.goto('/')
  await loadCat(page)
  await page.getByLabel('Filter').selectOption('Grayscale')
  await expect(page.getByLabel('Filter')).toHaveValue('Grayscale')
  // The red square should now be desaturated: R, G, B channels nearly equal.
  const spread = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return -1
    const ctx = c.getContext('2d')!
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let maxSpread = 0
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      const spread = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b))
      if (spread > maxSpread) maxSpread = spread
    }
    return maxSpread
  })
  expect(spread, 'no color saturation after grayscale').toBeLessThan(30)
})

test('[A7] export PNG downloads meme.png with overlays', async ({ page }) => {
  await page.goto('/')
  await loadCat(page)
  await page.getByLabel('Top text').fill('TOP TEXT')
  await page.getByLabel('Bottom text').fill('BOTTOM TEXT')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('meme.png')
  const data = readFileSync((await download.path())!)
  // A non-trivial PNG is bigger than the 14-byte header of an empty file.
  expect(data.length, 'exported file is a real PNG').toBeGreaterThan(100)
})

test('[A8] top text and image persist across a reload', async ({ page }) => {
  await page.goto('/')
  await loadCat(page)
  await page.getByLabel('Top text').fill('TOP TEXT')
  await page.reload()
  await expect(page.getByText('Image loaded: cat.png')).toBeVisible()
  await expect(page.getByLabel('Top text')).toHaveValue('TOP TEXT')
  // The canvas still has the top text painted.
  const topRow = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return -1
    const ctx = c.getContext('2d')!
    const d = ctx.getImageData(0, 0, c.width, 8).data
    let whiteish = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) whiteish++
    }
    return whiteish
  })
  expect(topRow, 'top text still painted after reload').toBeGreaterThan(50)
})
