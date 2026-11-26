import { expect, test, type Page } from '@playwright/test'

type Pixels = { changed: number; r: number; g: number; b: number }

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

test('[A1] page shows the Sketch Pad heading and "Infinite Canvas" in the canvas area', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sketch Pad' })).toBeVisible()
  await expect(page.getByText('Infinite Canvas')).toBeVisible()
})

test('[A2] New Layer adds "Layer 1" then "Layer 2" to the layer list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Layer' }).click()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'New Layer' }).click()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
})

test('[A3] Delete Layer removes the selected layer and falls back to "No layers"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Layer' }).click()
  await page.getByRole('button', { name: 'Delete Layer' }).click()
  await expect(page.getByText('Layer 1', { exact: true })).toHaveCount(0)
  await expect(page.getByText('No layers')).toBeVisible()
})

test('[A3] Delete Layer on the only layer selects the next layer', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Layer' }).click()
  await page.getByRole('button', { name: 'New Layer' }).click()
  await page.getByRole('button', { name: 'Delete Layer' }).click()
  await expect(page.getByText('Layer 1', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
})

test('[A4] Brush with Red draws a red stroke on the active layer', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Layer' }).click()
  await page.getByText('Brush').click()
  await page.getByLabel('Color').selectOption({ label: 'Red' })
  await drawStroke(page, [40, 40], [160, 40])
  const { changed, r, g, b } = await pixelAt(page, 100, 40)
  expect(changed).toBe(true)
  expect(r).toBeGreaterThan(200)
  expect(g).toBeLessThan(90)
  expect(b).toBeLessThan(90)
})

test('[A5] Export PNG downloads a file named sketch.png', async ({ page }) => {
  await page.goto('/')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('sketch.png')
})

test('[A6] the Layers tab lists all created layers', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Layer' }).click()
  await page.getByRole('button', { name: 'New Layer' }).click()
  await page.getByRole('tab', { name: 'Layers' }).click()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
})

test('[A7] brush size 5 draws a thicker stroke than the default size', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Brush').click()
  const slider = page.getByLabel('Brush size').first()
  await slider.fill('5')
  const wide = await filledPixels(page)
  await drawStroke(page, [40, 60], [160, 60])
  const wideCount = await filledPixels(page) - wide
  await slider.fill('1')
  await drawStroke(page, [40, 100], [160, 100])
  const thinCount = await filledPixels(page) - wideCount - wide
  expect(wideCount).toBeGreaterThan(thinCount)
})

test('[A8] Clear Canvas removes all strokes from the active layer, keeping the layers', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Layer' }).click()
  await drawStroke(page, [40, 40], [160, 40])
  expect(await filledPixels(page)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Clear Canvas' }).click()
  expect(await filledPixels(page)).toBe(0)
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
})

test('[A9] reload keeps the layers and their strokes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Layer' }).click()
  await page.getByRole('button', { name: 'New Layer' }).click()
  await page.getByText('Brush').click()
  await drawStroke(page, [40, 40], [160, 40])
  const drawn = await filledPixels(page)
  expect(drawn).toBeGreaterThan(0)
  await page.reload()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Layers' }).click()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
  expect(await filledPixels(page)).toBe(drawn)
})
