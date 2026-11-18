import { expect, test } from '@playwright/test'

function opaqueCount(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let n = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++
    return n
  })
}

async function drawLine(page: import('@playwright/test').Page, relY: number) {
  const canvas = page.locator('canvas')
  const box = (await canvas.boundingBox())!
  await canvas.dispatchEvent('pointerdown', { pointerId: 1, clientX: box.x + 40, clientY: box.y + relY })
  await canvas.dispatchEvent('pointermove', { pointerId: 1, clientX: box.x + 200, clientY: box.y + relY })
  await canvas.dispatchEvent('pointerup', { pointerId: 1 })
}

function expectOpaque(page: import('@playwright/test').Page, expected: number) {
  return expect
    .poll(() => opaqueCount(page), { timeout: 2000 })
    .toBe(expected)
}

test('clear empties the canvas and undo brings the drawing back', async ({ page }) => {
  await page.goto('/')

  await drawLine(page, 100)
  await drawLine(page, 200)
  const withDrawings = await opaqueCount(page)
  expect(withDrawings).toBeGreaterThan(0)

  // Clear empties the canvas.
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect
    .poll(() => opaqueCount(page), { timeout: 2000 })
    .toBe(0)

  // Undo brings the drawing back (async restore, so poll).
  await page.getByRole('button', { name: 'Undo' }).click()
  await expectOpaque(page, withDrawings)
})
