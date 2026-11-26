import { expect, test, type Page } from '@playwright/test'

const summary = (page: Page) => page.getByText(/Frames: /)

test('[A1] page heading and drop zone text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'GIF Maker' })).toBeVisible()
  await expect(page.getByText('Drop images or video here')).toBeVisible()
})

test('[A2] Add sample frames adds three frames', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add sample frames' }).click()
  await expect(page.getByText('frame-1.png')).toBeVisible()
  await expect(page.getByText('frame-2.png')).toBeVisible()
  await expect(page.getByText('frame-3.png')).toBeVisible()
  await expect(summary(page)).toHaveText('Frames: 3')
})

test('[A3] applying frame delay updates the summary', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add sample frames' }).click()
  await page.getByLabel('Frame delay (ms)').fill('200')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(summary(page)).toHaveText('Frames: 3, Delay: 200ms')
})

test('[A4] deleting a frame updates the list and summary', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add sample frames' }).click()
  await page.getByRole('button', { name: 'Delete frame-2.png' }).click()
  await expect(page.getByText('frame-2.png')).toHaveCount(0)
  await expect(page.getByText('frame-1.png')).toBeVisible()
  await expect(page.getByText('frame-3.png')).toBeVisible()
  await expect(summary(page)).toHaveText('Frames: 2')
})

test('[A5] Settings tab shows Width 800 and Height 600, Frames tab returns to list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Settings' }).click()
  await expect(page.getByLabel('Width')).toHaveValue('800')
  await expect(page.getByLabel('Height')).toHaveValue('600')
  await page.getByRole('tab', { name: 'Frames' }).click()
  await expect(page.getByText('Drop images or video here')).toBeVisible()
})

test('[A6] applying size updates the summary', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add sample frames' }).click()
  await page.getByLabel('Frame delay (ms)').fill('200')
  await page.getByRole('button', { name: 'Apply' }).click()
  await page.getByRole('button', { name: 'Delete frame-2.png' }).click()
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByLabel('Width').fill('400')
  await page.getByLabel('Height').fill('300')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(summary(page)).toHaveText('Frames: 2, Delay: 200ms, Size: 400x300')
})

test('[A7] Export GIF completes and enables Download', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add sample frames' }).click()
  await page.getByRole('button', { name: 'Export GIF' }).click()
  await expect(page.getByText('GIF ready: gif-maker-800x600.gif')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
})

test('[A8] Download copies the filename and shows a toast', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add sample frames' }).click()
  await page.getByRole('button', { name: 'Export GIF' }).click()
  await expect(page.getByText('GIF ready: gif-maker-800x600.gif')).toBeVisible()
  await page.getByRole('button', { name: 'Download' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
})

test('[A9] reload keeps the frame list and settings', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add sample frames' }).click()
  await page.getByLabel('Frame delay (ms)').fill('200')
  await page.getByRole('button', { name: 'Apply' }).click()
  await page.getByRole('button', { name: 'Delete frame-2.png' }).click()
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByLabel('Width').fill('400')
  await page.getByLabel('Height').fill('300')
  await page.getByRole('button', { name: 'Apply' }).click()
  await page.reload()
  await expect(summary(page)).toHaveText('Frames: 2, Delay: 200ms, Size: 400x300')
  await expect(page.getByText('frame-1.png')).toBeVisible()
  await expect(page.getByText('frame-3.png')).toBeVisible()
})
