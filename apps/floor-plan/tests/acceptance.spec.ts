import { test, expect, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

test('[A1] the page heading is "Floor Plan Editor"', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Floor Plan Editor' })).toBeVisible()
})

test('[A2] clicking "Add layer" adds "Layer 1" to the layer list', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Add layer' }).click()
  await expect(page.getByRole('listitem', { name: 'Layer 1' })).toBeVisible()
})

test('[A3] deleting the selected "Layer 1" removes it and shows "No layers"', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Add layer' }).click()
  await page.getByRole('listitem', { name: 'Layer 1' }).click()
  await page.getByRole('button', { name: 'Delete layer' }).click()
  await expect(page.getByRole('listitem', { name: 'Layer 1' })).toHaveCount(0)
  await expect(page.getByText('No layers')).toBeVisible()
})

test('[A4] the "Layers" and "Canvas" tabs switch the panels', async ({ page }) => {
  await open(page)
  const layersTab = page.getByRole('tab', { name: 'Layers' })
  const canvasTab = page.getByRole('tab', { name: 'Canvas' })
  const layerList = page.getByRole('list')
  const canvas = page.locator('canvas')

  await layersTab.click()
  await expect(layerList).toBeVisible()
  await expect(canvas).not.toBeVisible()

  await canvasTab.click()
  await expect(canvas).toBeVisible()
  await expect(layerList).not.toBeVisible()
})

test('[A5] clicking "Export PNG" downloads "floor-plan.png"', async ({ page }) => {
  await open(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('floor-plan.png')
})

test('[A6] selecting "Grid" in "Background" changes the canvas background to a grid pattern', async ({ page }) => {
  await open(page)
  await page.getByRole('tab', { name: 'Canvas' }).click()
  await page.getByLabel('Background').selectOption({ label: 'Grid' })
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  const backgroundImage = await canvas.evaluate((el) => getComputedStyle(el as HTMLElement).backgroundImage)
  expect(backgroundImage).not.toBe('none')
})

test('[A7] adding the room "Living Room" adds it to the room list', async ({ page }) => {
  await open(page)
  await page.getByLabel('Room name').fill('Living Room')
  await page.getByRole('button', { name: 'Add room' }).click()
  await expect(page.getByRole('listitem', { name: /Living Room/ })).toBeVisible()
})

test('[A8] clicking "Delete Living Room" removes the room', async ({ page }) => {
  await open(page)
  await page.getByLabel('Room name').fill('Living Room')
  await page.getByRole('button', { name: 'Add room' }).click()
  await page.getByRole('button', { name: 'Delete Living Room' }).click()
  await expect(page.getByText('Living Room')).toHaveCount(0)
})

test('[A9] reload keeps "Layer 1" and "Living Room" in their lists', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Add layer' }).click()
  await page.getByLabel('Room name').fill('Living Room')
  await page.getByRole('button', { name: 'Add room' }).click()
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('listitem', { name: 'Layer 1' })).toBeVisible()
  await expect(page.getByRole('listitem', { name: /Living Room/ })).toBeVisible()
})
