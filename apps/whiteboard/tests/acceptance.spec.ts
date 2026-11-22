import { expect, test, type Page } from '@playwright/test'

// Draws a single stroke with the currently active tool by pressing and moving
// the mouse across the canvas element.
async function drawStroke(page: Page) {
  const canvas = page.getByRole('img').first()
  await canvas.waitFor()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas bounding box not available')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx - 60, cy - 40)
  await page.mouse.down()
  await page.mouse.move(cx + 60, cy + 40, { steps: 12 })
  await page.mouse.up()
}

test('[A1] empty state shows Whiteboard heading and Ready to draw', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Whiteboard' })).toBeVisible()
  await expect(page.getByText('Ready to draw', { exact: true })).toBeVisible()
})

test('[A2] Brush and Eraser buttons update the status bar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await expect(page.getByText('Brush active', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Eraser' }).click()
  await expect(page.getByText('Eraser active', { exact: true })).toBeVisible()
})

test('[A3] Red 10px stroke updates status bar', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Color').selectOption({ label: 'Red' })
  await page.getByLabel('Size').selectOption({ label: '10px' })
  await page.getByRole('button', { name: 'Brush' }).click()
  await drawStroke(page)
  await expect(page.getByText('Stroke added: Red, 10px', { exact: true })).toBeVisible()
})

test('[A4] Add layer and Delete Layer 2 manage the layers panel', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add layer' }).click()
  await expect(page.getByText('Layer 2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Layer 2' }).click()
  await expect(page.getByText('Layer 2', { exact: true })).not.toBeVisible()
  await expect(page.getByText('Layer 1', { exact: true })).toBeVisible()
})

test('[A5] Undo removes the last stroke and Redo restores it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await drawStroke(page)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('Undo: stroke removed', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByText('Redo: stroke restored', { exact: true })).toBeVisible()
})

test('[A6] Export PNG downloads whiteboard.png and shows toast', async ({ page }) => {
  await page.goto('/')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('whiteboard.png')
  await expect(page.getByText('PNG exported successfully', { exact: true })).toBeVisible()
})

test('[A7] Clear canvas shows toast and returns to Ready to draw', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await drawStroke(page)
  await page.getByRole('button', { name: 'Clear canvas' }).click()
  await expect(page.getByText('Canvas cleared', { exact: true })).toBeVisible()
  await expect(page.getByText('Ready to draw', { exact: true })).toBeVisible()
})

test('[A8] entering a zoom level updates the zoom indicator', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Zoom level').fill('125')
  await page.getByLabel('Zoom level').press('Enter')
  await expect(page.getByText('125%', { exact: true })).toBeVisible()
})

test('[A9] reload keeps the stroke and shows Restored status', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Brush' }).click()
  await drawStroke(page)
  await page.reload()
  await expect(page.getByText('Restored: 1 stroke', { exact: true })).toBeVisible()
})
