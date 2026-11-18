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

test('reload keeps the drawing', async ({ page }) => {
  await page.goto('/')
  await drawLine(page, 100)
  await drawLine(page, 200)

  // Wait for the persist effect to have captured the drawing to localStorage.
  await expect
    .poll(() => opaqueCount(page), { timeout: 2000 })
    .toBeGreaterThanOrEqual(1)

  const before = await opaqueCount(page)
  expect(before).toBeGreaterThan(0)

  // Give the persist effect a moment to write the latest data URL.
  await page.waitForTimeout(300)

  await page.reload()
  await expect
    .poll(() => opaqueCount(page), { timeout: 3000 })
    .toBe(before)
})
