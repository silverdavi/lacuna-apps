import { expect, test, type Page } from '@playwright/test'

async function stroke(page: Page, from: [number, number], to: [number, number]) {
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.move(box.x + from[0], box.y + from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 })
  await page.mouse.up()
}

type Pixels = { changed: number; cleared: number }

async function countPixels(page: Page): Promise<Pixels> {
  // read-only: observes canvas pixels after a user action
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('no canvas')
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
    let changed = 0
    let cleared = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) changed++
      else cleared++
    }
    return { changed, cleared }
  })
}

test('[A1] shows the heading "Signature Pad" and the button "Clear canvas"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Signature Pad' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear canvas' })).toBeVisible()
})

test('[A2] "Clear canvas" removes strokes, empties the canvas and disables "Save PNG"', async ({ page }) => {
  await page.goto('/')
  await stroke(page, [40, 40], [160, 40])
  await page.getByRole('button', { name: 'Clear canvas' }).click()
  const pixels = await countPixels(page)
  expect(pixels.changed).toBe(0)
  await expect(page.getByRole('button', { name: 'Save PNG' })).toBeDisabled()
})

test('[A3] drawing a stroke enables "Save PNG" and shows "Signature ready"', async ({ page }) => {
  await page.goto('/')
  await stroke(page, [40, 40], [160, 40])
  await expect(page.getByRole('button', { name: 'Save PNG' })).toBeEnabled()
  await expect(page.getByText('Signature ready')).toBeVisible()
})

test('[A4] selecting "Red" colors the next stroke red and the select shows "Red"', async ({ page }) => {
  await page.goto('/')
  const select = page.getByLabel('Stroke color')
  await select.selectOption({ label: 'Red' })
  await stroke(page, [40, 40], [160, 40])
  // "shows Red as the selected value" means the option labelled "Red" is selected; the value string is app-defined
  const selected = await select.locator('option:checked')
  await expect(selected).toHaveText('Red')
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) throw new Error('no canvas box')
  const { r, g, b } = await page.evaluate(([x, y]) => {
    const canvas = document.querySelector('canvas')
    const [r, g, b] = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data
    return { r, g, b }
  }, [box.x + 100, box.y + 40])
  expect(r).toBeGreaterThan(g)
  expect(r).toBeGreaterThan(b)
})

test('[A5] setting the "Stroke width" slider to 10 draws a thicker line and displays "10"', async ({ page }) => {
  await page.goto('/')
  await stroke(page, [40, 40], [160, 40])
  const thin = await countPixels(page)
  expect(thin.changed).toBeGreaterThan(0)
  const slider = page.getByLabel('Stroke width')
  await slider.fill('10')
  await expect(slider).toHaveValue('10')
  await stroke(page, [40, 80], [160, 80])
  const wide = await countPixels(page)
  // same-length strokes: the width-10 stroke must cover more pixels than the default-width one
  expect(wide.changed - thin.changed).toBeGreaterThan(thin.changed)
})

test('[A6] "Save PNG" downloads "signature.png" and shows the toast "Signature saved"', async ({ page }) => {
  await page.goto('/')
  await stroke(page, [40, 40], [160, 40])
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('signature.png')
  await expect(page.getByText('Signature saved')).toBeVisible()
})

test('[A7] "Undo" removes the most recent of two strokes, leaving only the first', async ({ page }) => {
  await page.goto('/')
  await stroke(page, [40, 40], [160, 40])
  const first = await countPixels(page)
  await stroke(page, [40, 80], [160, 80])
  const both = await countPixels(page)
  expect(first.changed).toBeGreaterThan(0)
  expect(both.changed).toBeGreaterThan(first.changed)
  await page.getByRole('button', { name: 'Undo' }).click()
  const undone = await countPixels(page)
  expect(undone.changed).toBe(first.changed)
})

test('[A8] "Redo" after an undo restores the removed stroke', async ({ page }) => {
  await page.goto('/')
  await stroke(page, [40, 40], [160, 40])
  const first = await countPixels(page)
  await stroke(page, [40, 80], [160, 80])
  const both = await countPixels(page)
  await page.getByRole('button', { name: 'Undo' }).click()
  const undone = await countPixels(page)
  expect(undone.changed).toBe(first.changed)
  await page.getByRole('button', { name: 'Redo' }).click()
  const redone = await countPixels(page)
  expect(redone.changed).toBe(both.changed)
})

test('[A9] reload keeps a Blue stroke and the "Stroke color" select shows "Blue"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Stroke color').selectOption({ label: 'Blue' })
  await stroke(page, [40, 40], [160, 40])
  const drawn = await countPixels(page)
  expect(drawn.changed).toBeGreaterThan(0)
  await page.reload()
  const restored = await countPixels(page)
  expect(restored.changed).toBe(drawn.changed)
  const selected = await page.getByLabel('Stroke color').locator('option:checked')
  await expect(selected).toHaveText('Blue')
})
