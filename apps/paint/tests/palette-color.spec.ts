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

test('choosing a different color changes the color of the next stroke', async ({ page }) => {
  await page.goto('/')

  // First stroke with the default (first) color at relY=80.
  await page.locator('.paint-swatch').nth(0).click()
  await drawLine(page, 80)

  // Pick a clearly different color (rust, index 1) and stroke at relY=200.
  await page.locator('.paint-swatch').nth(1).click()
  const pressed = await page.locator('.paint-swatch').nth(1).getAttribute('aria-pressed')
  expect(pressed).toBe('true')
  await drawLine(page, 200)

  const total = await opaqueCount(page)
  expect(total).toBeGreaterThan(0)

  // Sample the midpoint of each stroke. The stroke runs from x=40 to x=200
  // in canvas-relative terms, so midpoint x=120. Y is relY converted to
  // canvas space.
  const colors = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const scaleY = canvas.height / rect.height
    const at = (relY: number) => {
      const d = ctx.getImageData(120, Math.round(relY * scaleY), 1, 1).data
      return [d[0], d[1], d[2], d[3]]
    }
    return { first: at(80), second: at(200) }
  })

  expect(colors.first[3]).toBeGreaterThan(0)
  expect(colors.second[3]).toBeGreaterThan(0)
  expect(JSON.stringify(colors.first)).not.toBe(JSON.stringify(colors.second))
})
