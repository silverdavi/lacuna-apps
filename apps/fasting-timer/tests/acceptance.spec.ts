import { expect, test } from '@playwright/test'

test('[A1] empty state shows heading, no active fast, and empty history', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Fasting Timer' })).toBeVisible()
  await expect(page.getByText('No active fast')).toBeVisible()
  await expect(page.getByText('No fasts logged yet')).toBeVisible()
})

test('[A2] selecting 16:8 sets duration and start fast begins the timer', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Preset').selectOption({ label: '16:8' })
  await expect(page.getByLabel('Duration')).toHaveValue('16h 0m')
  await page.getByRole('button', { name: 'Start fast' }).click()
  await expect(page.getByText('16:00:00')).toBeVisible()
  await expect(page.getByText('Fasting')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start fast' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('[A3] pause switches phase to Paused and Pause button to Resume', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Preset').selectOption({ label: '16:8' })
  await page.getByRole('button', { name: 'Start fast' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByText('Paused')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await expect(page.getByText('16:00:00')).toBeVisible()
})

test('[A4] resume switches phase back to Fasting and Resume button to Pause', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Preset').selectOption({ label: '16:8' })
  await page.getByRole('button', { name: 'Start fast' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByText('Fasting')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('[A5] end fast removes active display, shows no active fast, and logs the fast', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Preset').selectOption({ label: '16:8' })
  await page.getByRole('button', { name: 'Start fast' }).click()
  await page.getByRole('button', { name: 'End fast' }).click()
  await expect(page.getByText('No active fast')).toBeVisible()
  await expect(page.getByText('16h 0m')).toBeVisible()
  await expect(page.getByText('No fasts logged yet')).not.toBeVisible()
})

test('[A6] custom duration 20h 30m starts the timer and is logged on end', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Duration').fill('20h 30m')
  await page.getByRole('button', { name: 'Start fast' }).click()
  await expect(page.getByText('20:30:00')).toBeVisible()
  await page.getByRole('button', { name: 'End fast' }).click()
  await expect(page.getByText('20h 30m')).toBeVisible()
})

test('[A7] delete removes the first history item and reverts to empty state when none remain', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Preset').selectOption({ label: '16:8' })
  await page.getByRole('button', { name: 'Start fast' }).click()
  await page.getByRole('button', { name: 'End fast' }).click()
  await page.getByLabel('Duration').fill('20h 30m')
  await page.getByRole('button', { name: 'Start fast' }).click()
  await page.getByRole('button', { name: 'End fast' }).click()
  const deleteButtons = page.getByRole('button', { name: 'Delete' })
  await expect(deleteButtons).toHaveCount(2)
  await deleteButtons.first().click()
  await expect(deleteButtons).toHaveCount(1)
  await deleteButtons.click()
  await expect(page.getByText('No fasts logged yet')).toBeVisible()
})

test('[A8] copy summary shows a toast when history is not empty', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Preset').selectOption({ label: '16:8' })
  await page.getByRole('button', { name: 'Start fast' }).click()
  await page.getByRole('button', { name: 'End fast' }).click()
  await page.getByRole('button', { name: 'Copy summary' }).click()
  await expect(page.getByText('Summary copied to clipboard')).toBeVisible()
})

test('[A9] active fast state survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Preset').selectOption({ label: '16:8' })
  await page.getByRole('button', { name: 'Start fast' }).click()
  await page.reload()
  await expect(page.getByText('16:00:00')).toBeVisible()
  await expect(page.getByText('Fasting')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})
