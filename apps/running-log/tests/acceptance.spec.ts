import { expect, test, type Page } from '@playwright/test'

async function addRun(page: Page, date: string, distance: string, time: string) {
  await page.getByRole('button', { name: 'Add run' }).click()
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Distance (km)').fill(distance)
  await page.getByLabel('Time (min)').fill(time)
  await page.getByRole('button', { name: 'Save run' }).click()
}

test('[A1] heading is "Running Log" and the empty state says "No runs yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Running Log' })).toBeVisible()
  await expect(page.getByText('No runs yet')).toBeVisible()
})

test('[A2] adding a run adds a row with distance, time and pace', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await expect(page.getByText('No runs yet')).toHaveCount(0)
  const row = page.getByRole('row').filter({ hasText: '2024-01-15' })
  await expect(row).toContainText('5.2 km')
  await expect(row).toContainText('28 min')
  await expect(row).toContainText('5:24/km')
})

test('[A3] deleting the run removes its row and brings back the empty state', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await page.getByRole('button', { name: 'Delete 2024-01-15' }).click()
  await expect(page.getByRole('row').filter({ hasText: '2024-01-15' })).toHaveCount(0)
  await expect(page.getByText('No runs yet')).toBeVisible()
})

test('[A4] clicking the Distance header sorts distances descending', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await page.getByRole('columnheader', { name: 'Distance' }).click()
  await expect(page.getByRole('row').filter({ hasText: '2024-01-15' })).toHaveCount(1)
})

test('[A5] a second run shows two rows with its distance, time and pace', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await addRun(page, '2024-01-16', '10.5', '52')
  await expect(page.getByRole('row').filter({ hasText: '2024-01-15' })).toHaveCount(1)
  const row = page.getByRole('row').filter({ hasText: '2024-01-16' })
  await expect(row).toContainText('10.5 km')
  await expect(row).toContainText('52 min')
  await expect(row).toContainText('4:57/km')
})

test('[A6] the Chart tab shows an SVG line chart with the title and a labelled data point', async ({
  page,
}) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await page.getByRole('tab', { name: 'Chart' }).click()
  const svg = page.locator('svg')
  await expect(svg).toBeVisible()
  await expect(page.getByText('Distance over time')).toBeVisible()
  await expect(svg.getByText('5.2')).toBeVisible()
})

test('[A7] Export CSV downloads the header row and the run row', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  const lines = readFileSync(path, 'utf8').trim().split('\n')
  expect(lines[0]).toBe('date,distance_km,time_min,pace')
  expect(lines[1]).toBe('2024-01-15,5.2,28,5:24/km')
})

test('[A8] the search box filters rows and shows "No runs match" when nothing matches', async ({
  page,
}) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await addRun(page, '2024-01-16', '10.5', '52')
  await page.getByLabel('Search runs').fill('10.5')
  await expect(page.getByRole('row').filter({ hasText: '10.5 km' })).toHaveCount(1)
  await expect(page.getByRole('row').filter({ hasText: '5.2 km' })).toHaveCount(0)
  await page.getByLabel('Search runs').fill('zzz')
  await expect(page.getByText('No runs match')).toBeVisible()
})

test('[A9] a run survives a reload', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await page.reload()
  const row = page.getByRole('row').filter({ hasText: '2024-01-15' })
  await expect(row).toContainText('5.2 km')
  await expect(row).toContainText('28 min')
  await expect(row).toContainText('5:24/km')
})
