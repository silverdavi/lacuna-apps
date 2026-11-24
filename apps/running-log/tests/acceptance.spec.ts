import { expect, test, type Page } from '@playwright/test'

async function addRun(page: Page, date: string, distance: string, time: string) {
  await page.getByRole('button', { name: 'Add run' }).click()
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Distance (km)').fill(distance)
  await page.getByLabel('Time (min)').fill(time)
  await page.getByRole('button', { name: 'Save run' }).click()
}

test('[A1] empty state shows heading and No runs yet text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Running Log' })).toBeVisible()
  await expect(page.getByText('No runs yet')).toBeVisible()
})

test('[A2] adding a run shows a row with date, distance, time and pace', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await expect(page.getByText('No runs yet')).toHaveCount(0)
  const row = page.getByRole('row').filter({ hasText: '2024-01-15' })
  await expect(row).toContainText('5.2 km')
  await expect(row).toContainText('28 min')
  await expect(row).toContainText('5:24/km')
})

test('[A3] deleting the run removes the row and restores No runs yet', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await page.getByRole('button', { name: 'Delete 2024-01-15' }).click()
  await expect(page.getByRole('row').filter({ hasText: '2024-01-15' })).toHaveCount(0)
  await expect(page.getByText('No runs yet')).toBeVisible()
})

test('[A4] clicking the Distance column header sorts distances descending', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await addRun(page, '2024-01-16', '10.5', '52')
  await page.getByRole('columnheader', { name: 'Distance' }).click()
  const first = page.getByRole('row').filter({ hasText: 'km' }).first()
  await expect(first).toContainText('10.5 km')
})

test('[A5] a second run shows two rows with its date, distance, time and pace', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await addRun(page, '2024-01-16', '10.5', '52')
  await expect(page.getByRole('row').filter({ hasText: 'km' })).toHaveCount(2)
  const row = page.getByRole('row').filter({ hasText: '2024-01-16' })
  await expect(row).toContainText('10.5 km')
  await expect(row).toContainText('52 min')
  await expect(row).toContainText('4:57/km')
})

test('[A6] the Chart tab shows a line chart with a labelled data point', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await page.getByRole('tab', { name: 'Chart' }).click()
  await expect(page.getByText('Distance over time')).toBeVisible()
  const point = page.locator('svg').getByText('5.2', { exact: true })
  await expect(point).toBeVisible()
})

test('[A7] Export CSV downloads the run data with the spec header', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const text = Buffer.concat(chunks).toString('utf8')
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  expect(lines[0]).toBe('date,distance_km,time_min,pace')
  expect(lines[1]).toBe('2024-01-15,5.2,28,5:24/km')
})

test('[A8] search filters rows and shows No runs match when nothing matches', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await addRun(page, '2024-01-16', '10.5', '52')
  const search = page.getByLabel('Search runs')
  await search.fill('10.5')
  await expect(page.getByRole('row').filter({ hasText: '10.5 km' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: '5.2 km' })).toHaveCount(0)
  await search.fill('zzz')
  await expect(page.getByText('No runs match')).toBeVisible()
})

test('[A9] reload keeps the run', async ({ page }) => {
  await page.goto('/')
  await addRun(page, '2024-01-15', '5.2', '28')
  await page.reload()
  const row = page.getByRole('row').filter({ hasText: '2024-01-15' })
  await expect(row).toContainText('5.2 km')
  await expect(row).toContainText('28 min')
  await expect(row).toContainText('5:24/km')
})
