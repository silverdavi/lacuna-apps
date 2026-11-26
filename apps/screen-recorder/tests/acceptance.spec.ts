import { expect, test, type Page } from '@playwright/test'

// Capture a still frame in the Camera tab.
async function captureFrame(page: Page) {
  await page.getByRole('tab', { name: 'Camera' }).click()
  await page.getByRole('button', { name: 'Capture frame' }).click()
}

test('[A1] empty app shows the Screen Recorder heading and "No recordings yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Screen Recorder' })).toBeVisible()
  await expect(page.getByText('No recordings yet')).toBeVisible()
})

test('[A2] recording the screen for 3 seconds adds a Screen item with 0:03 and resets the button', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Record screen' }).click()
  await page.waitForTimeout(3000)
  await page.getByRole('button', { name: 'Stop' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Screen' })
  await expect(item).toContainText('0:03')
  await expect(page.getByRole('button', { name: 'Record screen' })).toBeVisible()
})

test('[A3] deleting the screen recording removes the item and shows "No recordings yet"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Record screen' }).click()
  await page.waitForTimeout(3000)
  await page.getByRole('button', { name: 'Stop' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Screen' })
  await item.getByRole('button', { name: 'Delete' }).click()
  await expect(item).toHaveCount(0)
  await expect(page.getByText('No recordings yet')).toBeVisible()
})

test('[A4] capturing a frame in the Camera tab adds a Frame item with 0:00', async ({ page }) => {
  await page.goto('/')
  await captureFrame(page)
  const item = page.getByRole('listitem').filter({ hasText: 'Frame' })
  await expect(item).toContainText('0:00')
})

test('[A5] every Library item has a Download button and Download exports a .webm', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Record screen' }).click()
  await page.waitForTimeout(3000)
  await page.getByRole('button', { name: 'Stop' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Screen' })
  await expect(item.getByRole('button', { name: 'Download' })).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    item.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename().endsWith('.webm')).toBe(true)
})

test('[A6] a 1080p 2-second screen clip adds a 1080p item with 0:02', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Resolution').selectOption({ label: '1080p' })
  await page.getByRole('button', { name: 'Record screen' }).click()
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: 'Stop' }).click()
  const item = page.getByRole('listitem').filter({ hasText: '1080p' })
  await expect(item).toContainText('0:02')
})

test('[A7] a screen recording and a camera frame survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Record screen' }).click()
  await page.waitForTimeout(3000)
  await page.getByRole('button', { name: 'Stop' }).click()
  await captureFrame(page)
  await expect(page.getByRole('listitem').filter({ hasText: 'Screen' })).toContainText('0:03')
  await expect(page.getByRole('listitem').filter({ hasText: 'Frame' })).toContainText('0:00')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Screen' })).toContainText('0:03')
  await expect(page.getByRole('listitem').filter({ hasText: 'Frame' })).toContainText('0:00')
})

test('[A8] Clear all in the Library tab removes every item and shows "No recordings yet"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Record screen' }).click()
  await page.waitForTimeout(3000)
  await page.getByRole('button', { name: 'Stop' }).click()
  await captureFrame(page)
  await page.getByRole('tab', { name: 'Library' }).click()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No recordings yet')).toBeVisible()
})
