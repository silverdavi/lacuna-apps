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

test('the size slider changes stroke width; wider covers more pixels', async ({ page }) => {
  await page.goto('/')

  const slider = page.locator('input[type="range"]')
  const before = await opaqueCount(page)

  // Narrow stroke.
  await slider.fill('2')
  await drawLine(page, 100)
  const narrow = await opaqueCount(page)
  expect(narrow).toBeGreaterThan(before)

  // Undo back to blank, then a wide stroke.
  await page.keyboard.press('Control+z')
  await expectOpaque(page, before)

  await slider.fill('30')
  await drawLine(page, 100)
  const wide = await opaqueCount(page)
  expect(wide).toBeGreaterThan(narrow)
})
