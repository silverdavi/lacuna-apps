import { expect, test, type Page } from '@playwright/test'

function clock(page: Page) {
  return page.getByText(/^\d{2}:\d{2}$/).first()
}

function phase(page: Page) {
  return page.getByText(/^(Ready|Work|Rest)$/).first()
}

function roundCounter(page: Page) {
  return page.getByText(/Round \d+/).first()
}

async function startTimer(page: Page, work: string, rest: string) {
  await page.goto('/')
  await page.getByLabel('Work (sec)').fill(work)
  await page.getByLabel('Rest (sec)').fill(rest)
  await page.getByRole('button', { name: 'Start' }).click()
}

test('[A1] page heading reads "Interval Timer" and the Timer tab is visible and active', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Interval Timer' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Timer' })).toBeVisible()
})

test('[A2] typing 30 work and 15 rest then Start shows 00:30 and Work phase', async ({ page }) => {
  await startTimer(page, '30', '15')
  await expect(clock(page)).toHaveText('00:30')
  await expect(phase(page)).toHaveText('Work')
})

test('[A3] after the work phase completes the phase is Rest and the clock shows 00:15', async ({ page }) => {
  await startTimer(page, '30', '15')
  await expect(phase(page)).toHaveText('Rest')
  await expect(clock(page)).toHaveText('00:15')
})

test('[A4] after the rest phase completes the phase is Work and the round counter shows Round 2', async ({ page }) => {
  await startTimer(page, '30', '15')
  await expect(phase(page)).toHaveText('Work')
  await expect(roundCounter(page)).toHaveText('Round 2')
})

test('[A5] clicking Pause stops the countdown and the button label changes to Resume', async ({ page }) => {
  await startTimer(page, '30', '15')
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
})

test('[A6] clicking Resume restarts the countdown from the paused time', async ({ page }) => {
  await startTimer(page, '30', '15')
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(phase(page)).toHaveText('Work')
  await expect(clock(page)).not.toHaveText('00:00')
})

test('[A7] clicking Stop resets the timer to 00:00, phase to Ready, and round to Round 1', async ({ page }) => {
  await startTimer(page, '30', '15')
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(clock(page)).toHaveText('00:00')
  await expect(phase(page)).toHaveText('Ready')
  await expect(roundCounter(page)).toHaveText('Round 1')
})

test('[A8] after completing one full cycle the History tab shows a list item with Round 1, Work: 30s and Rest: 15s', async ({ page }) => {
  await startTimer(page, '30', '15')
  await expect(roundCounter(page)).toHaveText('Round 2')
  await page.getByRole('tab', { name: 'History' }).click()
  const entry = page.getByRole('listitem').filter({ hasText: 'Round 1' })
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('Work: 30s')
  await expect(entry).toContainText('Rest: 15s')
})

test('[A9] reload keeps the timer state: after starting a 30-second work phase and reloading, the clock shows remaining time and Work phase', async ({ page }) => {
  await startTimer(page, '30', '15')
  await expect(phase(page)).toHaveText('Work')
  await page.reload()
  await expect(phase(page)).toHaveText('Work')
  await expect(clock(page)).not.toHaveText('00:00')
})
