import { expect, test, type Page } from '@playwright/test'

async function drawStroke(page: Page, from: [number, number], to: [number, number]) {
  const box = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg'))
    const canvases = Array.from(document.querySelectorAll('canvas'))
    const candidates = [...svgs, ...canvases] as HTMLElement[]
    let best: HTMLElement | null = null
    let bestArea = 0
    for (const el of candidates) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && r.width * r.height > bestArea) {
        bestArea = r.width * r.height
        best = el
      }
    }
    if (!best) throw new Error('no drawing surface found')
    const r = best.getBoundingClientRect()
    return { x: r.x, y: r.y }
  })
  await page.mouse.move(box.x + from[0], box.y + from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 })
  await page.mouse.up()
}

async function shapeCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg'))
    let count = 0
    for (const svg of svgs) {
      count += svg.querySelectorAll('path, rect, ellipse, circle, line, polyline, polygon').length
    }
    return count
  })
}

test('[A1] heading is "SVG Editor" and toolbar shows Brush, Eraser, Rectangle, Ellipse', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'SVG Editor' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Brush' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Eraser' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rectangle' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ellipse' })).toBeVisible()
})

test('[A2] Add layer adds "Layer 1" then "Layer 2" to the layer list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add layer' }).click()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add layer' }).click()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
})

test('[A3] Delete layer removes the selected layer from the list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add layer' }).click()
  await page.getByRole('button', { name: 'Add layer' }).click()
  await page.getByText('Layer 1', { exact: true }).click()
  await page.getByRole('button', { name: 'Delete layer' }).click()
  await expect(page.getByText('Layer 1', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
})

test('[A4] Properties tab shows Stroke width 5; typing 12 and pressing Enter changes the value', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Properties' }).click()
  const field = page.getByLabel('Stroke width')
  await expect(field).toBeVisible()
  await expect(field).toHaveValue('5')
  await field.fill('12')
  await field.press('Enter')
  await expect(field).toHaveValue('12')
})

test('[A5] Export PNG downloads a file named svg-editor.png', async ({ page }) => {
  await page.goto('/')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('svg-editor.png')
})

test('[A6] drawing a stroke with Brush shows "1 path" next to the active layer in the Layers tab', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add layer' }).click()
  await page.getByText('Layer 1', { exact: true }).click()
  await page.getByRole('button', { name: 'Brush' }).click()
  await drawStroke(page, [40, 40], [160, 40])
  await page.getByRole('tab', { name: 'Layers' }).click()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
  await expect(page.getByText('1 path')).toBeVisible()
})

test('[A7] applying canvas width 200 and height 150 changes the canvas dimensions', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Properties' }).click()
  await page.getByLabel('Canvas width').fill('200')
  await page.getByLabel('Canvas height').fill('150')
  await page.getByRole('button', { name: 'Apply' }).click()
  const dims = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg'))
    const canvases = Array.from(document.querySelectorAll('canvas'))
    const candidates = [...svgs, ...canvases] as HTMLElement[]
    let best: HTMLElement | null = null
    let bestArea = 0
    for (const el of candidates) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && r.width * r.height > bestArea) {
        bestArea = r.width * r.height
        best = el
      }
    }
    if (!best) throw new Error('no drawing surface found')
    if (best instanceof SVGSVGElement) {
      const w = Number(best.getAttribute('width')) || best.getBoundingClientRect().width
      const h = Number(best.getAttribute('height')) || best.getBoundingClientRect().height
      return { w, h }
    }
    return { w: (best as HTMLCanvasElement).width, h: (best as HTMLCanvasElement).height }
  })
  expect(dims.w).toBe(200)
  expect(dims.h).toBe(150)
})

test('[A8] Undo removes the last drawn Rectangle shape from the canvas', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add layer' }).click()
  await page.getByRole('button', { name: 'Rectangle' }).click()
  await drawStroke(page, [40, 40], [120, 100])
  const afterDraw = await shapeCount(page)
  expect(afterDraw).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  const afterUndo = await shapeCount(page)
  expect(afterUndo).toBe(0)
})

test('[A9] reload keeps the layer list containing Layer 1 and Layer 2', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add layer' }).click()
  await page.getByRole('button', { name: 'Add layer' }).click()
  await page.reload()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
})
