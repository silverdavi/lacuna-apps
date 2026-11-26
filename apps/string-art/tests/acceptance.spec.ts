import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// The spec calls these "sliders". Playwright resolves getByLabel to the
// control the label owns; .fill() sets the value on a native range input.
async function setSlider(page: Page, name: string, value: number) {
  const slider = page.getByLabel(name, { exact: true })
  await slider.fill(String(value))
  await expect(slider).toHaveValue(String(value))
}

async function generate(page: Page, points: number, step: number, color?: string) {
  await setSlider(page, 'Points', points)
  await setSlider(page, 'Step', step)
  if (color !== undefined) await page.getByLabel('Color').first().fill(color)
  await page.getByRole('button', { name: 'Generate' }).click()
}

test('[A1] initial page shows heading and "No pattern generated yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'String Art Generator' })).toBeVisible()
  await expect(page.getByText('No pattern generated yet')).toBeVisible()
})

test('[A2] generating with Points 12 and Step 5 shows a canvas with "Pattern ready"', async ({ page }) => {
  await page.goto('/')
  await generate(page, 12, 5)
  await expect(page.getByText('No pattern generated yet')).not.toBeVisible()
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(0)
  expect(box!.height).toBeGreaterThan(0)
  await expect(page.getByText('Pattern ready')).toBeVisible()
})

test('[A3] changing Color to #FF0000 and regenerating keeps "Pattern ready" and the canvas', async ({ page }) => {
  await page.goto('/')
  await generate(page, 12, 5)
  await expect(page.getByText('Pattern ready')).toBeVisible()
  await generate(page, 12, 5, '#FF0000')
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
  await expect(page.getByText('Pattern ready')).toBeVisible()
})

test('[A4] Points 3 shows "Minimum 4 points required" and keeps "No pattern generated yet"', async ({ page }) => {
  await page.goto('/')
  await setSlider(page, 'Points', 3)
  await setSlider(page, 'Step', 5)
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('Minimum 4 points required')).toBeVisible()
  await expect(page.getByText('No pattern generated yet')).toBeVisible()
})

test('[A5] Export PNG after generating downloads a file named string-art.png with size > 0', async ({ page }) => {
  await page.goto('/')
  await generate(page, 12, 5)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('string-art.png')
  const data = readFileSync((await download.path())!)
  expect(data.length, 'exported file is larger than 0 bytes').toBeGreaterThan(0)
})

test('[A6] Clear after generating Points 10 Step 3 removes the canvas, restores "No pattern generated yet", and resets Points to 8', async ({ page }) => {
  await page.goto('/')
  await generate(page, 10, 3)
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.locator('canvas').first()).toHaveCount(0)
  await expect(page.getByText('No pattern generated yet')).toBeVisible()
  await expect(page.getByLabel('Points', { exact: true })).toHaveValue('8')
})

test('[A7] History tab is inactive initially; after two patterns it lists "12 points, step 5" and "10 points, step 3"', async ({ page }) => {
  await page.goto('/')
  await generate(page, 12, 5)
  await generate(page, 10, 3)
  const history = page.getByRole('tab', { name: 'History' })
  await expect(history).toBeVisible()
  // Initially inactive: the spec fixes the History tab as inactive at start.
  expect(await history.getAttribute('aria-selected')).not.toBe('true')
  await history.click()
  await expect(page.getByText('12 points, step 5')).toBeVisible()
  await expect(page.getByText('10 points, step 3')).toBeVisible()
})

test('[A8] Delete on the "10 points, step 3" item removes it, leaving only "12 points, step 5"', async ({ page }) => {
  await page.goto('/')
  await generate(page, 12, 5)
  await generate(page, 10, 3)
  await page.getByRole('tab', { name: 'History' }).click()
  const item = page.getByRole('listitem').filter({ hasText: '10 points, step 3' })
  await item.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('10 points, step 3')).toHaveCount(0)
  await expect(page.getByText('12 points, step 5')).toBeVisible()
})

test('[A9] reload keeps the generated pattern with Points 12 and "Pattern ready"', async ({ page }) => {
  await page.goto('/')
  await generate(page, 12, 5)
  await expect(page.getByText('Pattern ready')).toBeVisible()
  await page.reload()
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
  await expect(page.getByText('Pattern ready')).toBeVisible()
  await expect(page.getByLabel('Points', { exact: true })).toHaveValue('12')
})
