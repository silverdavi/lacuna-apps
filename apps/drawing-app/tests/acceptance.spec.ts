import { expect, test, type Page } from '@playwright/test'

type Pixels = { changed: number; r: number; g: number; b: number }

// The canvas is the only drawing surface; locators for buttons/fields come from the spec's labels.
async function drawStroke(page: Page, from: [number, number], to: [number, number]) {
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.move(box.x + from[0], box.y + from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 })
  await page.mouse.up()
}

async function pixelAt(page: Page, x: number, y: number): Promise<Pixels> {
  return page.evaluate(([px, py]) => {
    const canvas = document.querySelector('canvas')!
    const [r, g, b, a] = canvas.getContext('2d')!.getImageData(px, py, 1, 1).data
    return { changed: a > 0, r, g, b }
  }, [x, y])
}

async function filledPixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
    let n = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++
    return n
  })
}

test('[A1] page shows the "Digital Drawing Canvas" heading and the toolbar buttons', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Digital Drawing Canvas' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Brush' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Eraser' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rectangle' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export PNG' })).toBeVisible()
})

test('[A2] "Add Layer" creates "Layer 2" and selects it by default', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Layer' }).click()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
  const selected = page.locator('[aria-selected="true"]').or(page.locator('.selected')).or(page.locator('[data-selected="true"]'))
  await expect(selected.getByText('Layer 2', { exact: true })).toBeVisible()
})

test('[A3] "Export PNG" downloads a file named "drawing.png"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('drawing.png')
})

test('[A4] "Delete Layer" with "Layer 2" selected leaves only "Layer 1" in the list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Layer' }).click()
  await page.getByRole('button', { name: 'Delete Layer' }).click()
  await expect(page.getByText('Layer 2', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Layer 1', { exact: true })).toHaveCount(1)
})

test('[A5] typing "ff0000" in the "Hex" field and pressing Enter updates the swatch to "#ff0000"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Hex').fill('ff0000')
  await page.getByLabel('Hex').press('Enter')
  await expect(page.getByText('#ff0000')).toBeVisible()
})

test('[A6] "Undo" after a stroke removes it and the canvas is empty', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await drawStroke(page, [40, 40], [160, 40])
  expect(await filledPixels(page)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  expect(await filledPixels(page)).toBe(0)
})

test('[A7] the "Eraser" tool removes a stroke when clicked on it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await drawStroke(page, [40, 40], [160, 40])
  expect(await filledPixels(page)).toBeGreaterThan(0)
  const box = await page.locator('canvas').first().boundingBox()
  await page.getByRole('button', { name: 'Eraser' }).click()
  await page.mouse.click(box!.x + 100, box!.y + 40)
  expect(await filledPixels(page)).toBe(0)
})

test('[A8] "Zoom In" raises the zoom indicator from "100%" to "110%"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('100%')).toBeVisible()
  await page.getByRole('button', { name: 'Zoom In' }).click()
  await expect(page.getByText('110%')).toBeVisible()
})

test('[A9] reload keeps "Layer 2" and the "#ff0000" hex value', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Layer' }).click()
  await page.getByLabel('Hex').fill('ff0000')
  await page.getByLabel('Hex').press('Enter')
  await page.reload()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Hex')).toHaveValue('#ff0000')
})
