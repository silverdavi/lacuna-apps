import { expect, test, type Page } from '@playwright/test'

// The app renders nodes and edges on a canvas; the spec's export and data-attribute
// checks refer to "the canvas element", so the map surface is the first <canvas>.
const canvas = (page: Page) => page.locator('canvas').first()

async function nodeBox(page: Page, label: string) {
  const box = await page.getByText(label, { exact: true }).boundingBox()
  if (!box) throw new Error(`node "${label}" has no box`)
  return box
}

async function drawStroke(page: Page, from: [number, number], to: [number, number]) {
  const box = await canvas(page).boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.move(box.x + from[0], box.y + from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 8 })
  await page.mouse.up()
}

async function strokePixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) throw new Error('no canvas')
    const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height)
    let n = 0
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) n++
    return n
  })
}

// Walks the y=row across the stroke and returns the longest run of drawn pixels,
// which is the stroke's width in device pixels for a horizontal stroke.
async function strokePx(page: Page, from: [number, number], to: [number, number]) {
  const box = await canvas(page).boundingBox()
  if (!box) throw new Error('no canvas box')
  return page.evaluate(([x0, y0, x1, y1]) => {
    const c = document.querySelector('canvas')
    if (!c) throw new Error('no canvas')
    const ctx = c.getContext('2d')!
    const row = Math.round(y1 - y0)
    let run = 0
    let best = 0
    for (let px = 0; px < c.width; px++) {
      const { data } = ctx.getImageData(px, row, 1, 1)
      if (data[3] > 0) {
        run++
        best = Math.max(best, run)
      } else run = 0
    }
    return best
  }, [box.x + from[0], box.y + from[1], box.x + to[0], box.y + to[1]])
}

test('[A1] the page displays the Mind Map heading and the six toolbar buttons', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Mind Map' })).toBeVisible()
  for (const name of ['Add Node', 'Connect', 'Brush', 'Eraser', 'Export PNG', 'Auto Layout']) {
    await expect(page.getByRole('button', { name })).toBeVisible()
  }
})

test('[A2] Add Node creates a node labeled New Idea with a unique id in its title', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await expect(page.getByText('New Idea', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add Node' }).click()
  await expect(page.getByText('New Idea', { exact: true })).toHaveCount(2)
  const titles = await page
    .getByText('New Idea', { exact: true })
    .all()
    .then(async (nodes) => Promise.all(nodes.map((n) => n.getAttribute('title'))))
  expect(titles[0]).toBeTruthy()
  expect(titles[1]).toBeTruthy()
  expect(titles[0]).not.toBe(titles[1])
})

test('[A3] double-clicking New Idea and typing Strategy then Enter renames it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('New Idea', { exact: true }).dblclick()
  await page.keyboard.type('Strategy')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Strategy', { exact: true })).toBeVisible()
  await expect(page.getByText('New Idea', { exact: true })).toHaveCount(0)
})

test('[A4] connecting Strategy to Goal creates a visible edge and shows 1 connection', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('New Idea', { exact: true }).dblclick()
  await page.keyboard.type('Strategy')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('New Idea', { exact: true }).dblclick()
  await page.keyboard.type('Goal')
  await page.keyboard.press('Enter')

  await page.getByRole('button', { name: 'Connect' }).click()
  const before = await strokePixels(page)
  await page.getByText('Strategy', { exact: true }).click()
  await page.getByText('Goal', { exact: true }).click()

  const after = await strokePixels(page)
  expect(after).toBeGreaterThan(before)
  await expect(page.getByText('1 connection')).toBeVisible()
})

test('[A5] a Brush stroke plus Export PNG downloads mind-map.png', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await drawStroke(page, [40, 40], [160, 40])
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('mind-map.png')
})

test('[A6] Auto Layout rearranges nodes without overlap and shows Layout updated', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('New Idea', { exact: true }).dblclick()
  await page.keyboard.type('Strategy')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('New Idea', { exact: true }).dblclick()
  await page.keyboard.type('Goal')
  await page.keyboard.press('Enter')

  await page.getByRole('button', { name: 'Auto Layout' }).click()
  await expect(page.getByText('Layout updated')).toBeVisible()

  const s = await nodeBox(page, 'Strategy')
  const g = await nodeBox(page, 'Goal')
  const overlaps =
    s.x < g.x + g.width && g.x < s.x + s.width && s.y < g.y + g.height && g.y < s.y + s.height
  expect(overlaps).toBe(false)
})

test('[A7] deleting Strategy removes the node and its edge and shows 0 connections', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('New Idea', { exact: true }).dblclick()
  await page.keyboard.type('Strategy')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('New Idea', { exact: true }).dblclick()
  await page.keyboard.type('Goal')
  await page.keyboard.press('Enter')

  await page.getByRole('button', { name: 'Connect' }).click()
  await page.getByText('Strategy', { exact: true }).click()
  await page.getByText('Goal', { exact: true }).click()
  await expect(page.getByText('1 connection')).toBeVisible()

  // the spec fixes the key, not the selection gesture, so a single click selects
  // the node for deletion
  await page.getByText('Strategy', { exact: true }).click()
  await page.keyboard.press('Delete')
  await expect(page.getByText('Strategy', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Goal', { exact: true })).toBeVisible()
  await expect(page.getByText('0 connections')).toBeVisible()
  // the edge to the deleted node is gone: nothing more than a pristine canvas
  const fresh = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) throw new Error('no canvas')
    const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height)
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) return false
    return true
  })
  expect(fresh).toBe(true)
})

test('[A8] a stroke drawn with brush size 5 has a width of 5 pixels', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  const slider = page.getByRole('slider').first()
  await slider.focus()
  const before = await slider.getAttribute('aria-valuenow')
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
  const after = await slider.getAttribute('aria-valuenow')
  expect(Number(after)).toBeGreaterThan(Number(before))

  await drawStroke(page, [40, 40], [160, 40])
  const width = await strokePx(page, [40, 40], [160, 40])
  expect(width).toBe(5)
})

test('[A9] reload keeps the Strategy node and its edge to Goal', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('New Idea', { exact: true }).dblclick()
  await page.keyboard.type('Strategy')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Add Node' }).click()
  await page.getByText('New Idea', { exact: true }).dblclick()
  await page.keyboard.type('Goal')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Connect' }).click()
  await page.getByText('Strategy', { exact: true }).click()
  await page.getByText('Goal', { exact: true }).click()
  await expect(page.getByText('1 connection')).toBeVisible()
  const drawn = await strokePixels(page)
  expect(drawn).toBeGreaterThan(0)

  await page.reload()
  await expect(page.getByText('Strategy', { exact: true })).toBeVisible()
  await expect(page.getByText('Goal', { exact: true })).toBeVisible()
  await expect(page.getByText('1 connection')).toBeVisible()
  const restored = await strokePixels(page)
  expect(restored).toBe(drawn)
})
