import { expect, test, type Page } from '@playwright/test'

type Pixel = { a: number; r: number; g: number; b: number }

// The canvas is the only drawing surface; pixel reads go through page.evaluate after a user action.
async function pixelAt(page: Page, x: number, y: number): Promise<Pixel> {
  return page.evaluate(([px, py]) => {
    const canvas = document.querySelector('canvas')!
    const [r, g, b, a] = canvas.getContext('2d')!.getImageData(px, py, 1, 1).data
    return { r, g, b, a }
  }, [x, y])
}

// Maps a 0-based grid coordinate to the center of that pixel on the canvas.
async function clickPixel(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) throw new Error('no canvas box')
  const size = box.width / 16
  await page.mouse.click(box.x + size * (x + 0.5), box.y + size * (y + 0.5))
}

// Sets the active color by typing the hex value into the ColorPicker's hex field.
async function setHex(page: Page, hex: string) {
  const field = page.getByRole('group', { name: /color/i }).getByLabel('Hex')
  await field.fill(hex)
  await field.press('Enter')
}

test('[A1] page shows the "Pixel Art Editor" heading and a 16x16 pixel grid', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Pixel Art Editor' })).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()
  await expect(page.getByText('16x16')).toBeVisible()
})

test('[A2] Brush with "#FF0000" paints the center pixel red and reports it in the status bar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await setHex(page, '#FF0000')
  // (8,8) is the center pixel of the 16x16 grid.
  await clickPixel(page, 8, 8)
  await expect(page.getByText('Pixel (8,8) set to #FF0000')).toBeVisible()
  const px = await pixelAt(page, 8, 8)
  expect(px.a).toBeGreaterThan(0)
  expect(px.r).toBeGreaterThan(200)
  expect(px.g).toBeLessThan(60)
  expect(px.b).toBeLessThan(60)
})

test('[A3] "Add Layer" creates "Layer 2", lists "Layer 1" and "Layer 2", and selects "Layer 2"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Layer' }).click()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
  const selected = page
    .locator('[aria-selected="true"]')
    .or(page.locator('[data-selected="true"]'))
    .or(page.locator('.selected'))
  await expect(selected.getByText('Layer 2', { exact: true })).toBeVisible()
})

test('[A4] a pixel drawn on "Layer 2" is hidden while "Layer 1" is selected and visible on "Layer 2"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Layer' }).click()
  await page.getByRole('button', { name: 'Brush' }).click()
  await setHex(page, '#00FF00')
  await clickPixel(page, 1, 1)
  await page.getByText('Layer 1', { exact: true }).click()
  expect((await pixelAt(page, 1, 1)).a).toBe(0)
  await page.getByText('Layer 2', { exact: true }).click()
  const px = await pixelAt(page, 1, 1)
  expect(px.a).toBeGreaterThan(0)
  expect(px.g).toBeGreaterThan(200)
  expect(px.r).toBeLessThan(60)
  expect(px.b).toBeLessThan(60)
})

test('[A5] "Export PNG" downloads a 16x16 file named "sprite.png"', async ({ page }) => {
  await page.goto('/')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('sprite.png')
  const png = await download.path()
  const buffer = (await import('node:fs')).readFileSync(png)
  // IHDR: width and height are big-endian 32-bit integers at byte offsets 16 and 20.
  expect(buffer.readUInt32BE(16)).toBe(16)
  expect(buffer.readUInt32BE(20)).toBe(16)
})

test('[A6] "Eraser" clears the red pixel at (8,8) and reports it in the status bar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await setHex(page, '#FF0000')
  await clickPixel(page, 8, 8)
  expect((await pixelAt(page, 8, 8)).a).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Eraser' }).click()
  await clickPixel(page, 8, 8)
  await expect(page.getByText('Pixel (8,8) erased')).toBeVisible()
  expect((await pixelAt(page, 8, 8)).a).toBe(0)
})

test('[A7] typing "#0000FF" in the hex field sets the active color to blue with RGB 0, 0, 255', async ({ page }) => {
  await page.goto('/')
  await setHex(page, '#0000FF')
  const values = page.locator('.lc-kpi-value')
  await expect(values.filter({ hasText: '#0000ff' })).toHaveCount(2)
  await expect(values.filter({ hasText: 'rgb(0, 0, 255)' })).toBeVisible()
  await expect(values.filter({ hasText: '0' })).toHaveCount(4)
  await expect(values.filter({ hasText: '255' })).toBeVisible()
})

test('[A8] "Delete Layer" with "Layer 2" selected removes it and leaves "Layer 1" selected', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Layer' }).click()
  await page.getByRole('button', { name: 'Delete Layer' }).click()
  await expect(page.getByText('Layer 2', { exact: true })).toHaveCount(0)
  const selected = page
    .locator('[aria-selected="true"]')
    .or(page.locator('[data-selected="true"]'))
    .or(page.locator('.selected'))
  await expect(selected.getByText('Layer 1', { exact: true })).toBeVisible()
})

test('[A9] reload keeps "Layer 1" and the red pixel at (8,8)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await setHex(page, '#FF0000')
  await clickPixel(page, 8, 8)
  await page.reload()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
  const px = await pixelAt(page, 8, 8)
  expect(px.a).toBeGreaterThan(0)
  expect(px.r).toBeGreaterThan(200)
  expect(px.g).toBeLessThan(60)
  expect(px.b).toBeLessThan(60)
})
