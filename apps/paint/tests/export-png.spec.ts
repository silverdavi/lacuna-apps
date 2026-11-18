import { expect, test } from '@playwright/test'

async function drawLine(page: import('@playwright/test').Page, y: number) {
  const canvas = page.locator('canvas')
  const box = (await canvas.boundingBox())!
  await canvas.dispatchEvent('pointerdown', { pointerId: 1, clientX: box.x + 40, clientY: y })
  await canvas.dispatchEvent('pointermove', { pointerId: 1, clientX: box.x + 200, clientY: y })
  await canvas.dispatchEvent('pointerup', { pointerId: 1 })
}

test('export downloads a file named paint-<date>.png', async ({ page }) => {
  await page.goto('/')
  await drawLine(page, 120)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])

  const name = download.suggestedFilename()
  expect(name).toMatch(/^paint-\d{4}-\d{2}-\d{2}\.png$/)

  const date = new Date().toISOString().slice(0, 10)
  expect(name).toBe(`paint-${date}.png`)
})
