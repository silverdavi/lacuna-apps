import { expect, test, type Page } from '@playwright/test'

type Pixels = { changed: number; cleared: number }

function canvasOf(page: Page) {
  return page.locator('canvas').first()
}

async function countPixels(page: Page): Promise<Pixels> {
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

async function stroke(page: Page, from: [number, number], to: [number, number]) {
  const box = await canvasOf(page).boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.move(box.x + from[0], box.y + from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 })
  await page.mouse.up()
}

async function drawLine(page: Page, from: [number, number], to: [number, number]) {
  const before = await countPixels(page)
  await stroke(page, from, to)
  const after = await countPixels(page)
  return { before, after }
}

test('[A1] drawing on the canvas changes canvas pixels along the path', async ({ page }) => {
  await page.goto('/')
  const { before, after } = await drawLine(page, [40, 40], [160, 40])
  expect(after.changed).toBeGreaterThan(before.changed)
})

test('[A2] choosing a different color from the palette changes the color of the next stroke', async ({ page }) => {
  await page.goto('/')
  const black = page.getByRole('button', { name: 'Black' })
  const red = page.getByRole('button', { name: 'Red' })
  // whichever of the two is not currently pressed is a different color; the spec fixes no default
  const other = (await black.getAttribute('aria-pressed')) === 'true' ? red : black
  const { after: first } = await drawLine(page, [40, 40], [160, 40])
  expect(first.changed).toBeGreaterThan(0)
  await other.click()
  const { after: second } = await drawLine(page, [40, 60], [160, 60])
  const added = second.changed - first.changed
  expect(added).toBeGreaterThan(0)
  const box = await canvasOf(page).boundingBox()
  if (!box) throw new Error('no canvas box')
  // row 40 was painted before the switch, row 60 after; a palette switch must
  // make the new stroke a different color from the old one
  const a = await page.evaluate(([x, y]) => {
    const canvas = document.querySelector('canvas')
    const [r, g, b, al] = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data
    return { r, g, b, a: al }
  }, [box.x + 100, box.y + 40])
  const c = await page.evaluate(([x, y]) => {
    const canvas = document.querySelector('canvas')
    const [r, g, b, al] = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data
    return { r, g, b, a: al }
  }, [box.x + 100, box.y + 60])
  expect(a.a).toBeGreaterThan(0)
  expect(c.a).toBeGreaterThan(0)
  expect([c.r, c.g, c.b]).not.toEqual([a.r, a.g, a.b])
})

test('[A3] the size slider changes stroke width', async ({ page }) => {
  await page.goto('/')
  const slider = page.getByRole('slider').first()
  const narrow = await drawLine(page, [40, 40], [160, 40])
  // keyboard-only: ArrowRight raises the slider value
  await slider.focus()
  const beforeValue = await slider.getAttribute('aria-valuenow')
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
  const afterValue = await slider.getAttribute('aria-valuenow')
  expect(Number(afterValue)).toBeGreaterThan(Number(beforeValue))
  const wide = await drawLine(page, [40, 80], [160, 80])
  const narrowCount = narrow.after.changed - narrow.before.changed
  const wideCount = wide.after.changed - wide.before.changed
  expect(wideCount).toBeGreaterThan(narrowCount)
})

test('[A4] the eraser tool clears pixels it passes over', async ({ page }) => {
  await page.goto('/')
  const { before } = await drawLine(page, [40, 40], [160, 40])
  expect(before.changed).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Eraser' }).click()
  const { after } = await drawLine(page, [40, 40], [160, 40])
  expect(after.cleared).toBeGreaterThan(before.cleared)
})

test('[A5] Undo and Redo buttons remove and restore the last stroke', async ({ page }) => {
  await page.goto('/')
  const { before, after } = await drawLine(page, [40, 40], [160, 40])
  expect(after.changed).toBeGreaterThan(before.changed)
  await page.getByRole('button', { name: 'Undo' }).click()
  const undone = await countPixels(page)
  expect(undone.changed).toBe(before.changed)
  await page.getByRole('button', { name: 'Redo' }).click()
  const redone = await countPixels(page)
  expect(redone.changed).toBe(after.changed)
})

test('[A5] Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z undo and redo the last stroke', async ({ page }) => {
  await page.goto('/')
  const { before, after } = await drawLine(page, [40, 40], [160, 40])
  expect(after.changed).toBeGreaterThan(before.changed)
  await page.keyboard.press('Meta+z')
  const undone = await countPixels(page)
  expect(undone.changed).toBe(before.changed)
  await page.keyboard.press('Shift+Meta+z')
  const redone = await countPixels(page)
  expect(redone.changed).toBe(after.changed)
})

test('[A6] Clear empties the canvas, and Undo brings the drawing back', async ({ page }) => {
  await page.goto('/')
  const { before, after } = await drawLine(page, [40, 40], [160, 40])
  expect(after.changed).toBeGreaterThan(before.changed)
  await page.getByRole('button', { name: 'Clear' }).click()
  const cleared = await countPixels(page)
  expect(cleared.changed).toBe(before.changed)
  await page.getByRole('button', { name: 'Undo' }).click()
  const restored = await countPixels(page)
  expect(restored.changed).toBe(after.changed)
})

test('[A7] Export PNG downloads a file named paint-<date>.png', async ({ page }) => {
  await page.goto('/')
  await drawLine(page, [40, 40], [160, 40])
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^paint-\d{4}-\d{2}-\d{2}\.png$/)
})

test('[A8] reload keeps the drawing', async ({ page }) => {
  await page.goto('/')
  const { after } = await drawLine(page, [40, 40], [160, 40])
  expect(after.changed).toBeGreaterThan(0)
  await page.reload()
  const restored = await countPixels(page)
  expect(restored.changed).toBe(after.changed)
})

test('[A9] tools, palette and size work from the keyboard; the selected tool is announced with aria-pressed', async ({ page }) => {
  await page.goto('/')
  const eraser = page.getByRole('button', { name: 'Eraser' })
  await eraser.focus()
  expect(eraser).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('Enter')
  expect(eraser).toHaveAttribute('aria-pressed', 'true')
  // the keyboard-selected tool takes effect: the next stroke erases
  const { before, after } = await drawLine(page, [40, 40], [160, 40])
  expect(after.cleared).toBeGreaterThan(before.cleared)
  const brush = page.getByRole('button', { name: 'Brush' })
  await brush.focus()
  await page.keyboard.press('Enter')
  expect(brush).toHaveAttribute('aria-pressed', 'true')
  expect(eraser).toHaveAttribute('aria-pressed', 'false')
  // palette: keyboard-select a color and assert it is the one announced
  const black = page.getByRole('button', { name: 'Black' })
  const red = page.getByRole('button', { name: 'Red' })
  const palette = (await black.getAttribute('aria-pressed')) === 'true' ? red : black
  await palette.focus()
  await page.keyboard.press('Enter')
  expect(palette).toHaveAttribute('aria-pressed', 'true')
  // size: keyboard-only, ArrowRight must raise the value
  const slider = page.getByRole('slider').first()
  await slider.focus()
  const beforeValue = await slider.getAttribute('aria-valuenow')
  await page.keyboard.press('ArrowRight')
  const afterValue = await slider.getAttribute('aria-valuenow')
  expect(Number(afterValue)).toBeGreaterThan(Number(beforeValue))
  const { after: second } = await drawLine(page, [40, 80], [160, 80])
  expect(second.changed).toBeGreaterThan(after.changed)
})
