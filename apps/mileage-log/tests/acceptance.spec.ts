import { expect, test } from '@playwright/test'

async function addEntry(page, odometer: string, gallons: string, cost: string, note: string) {
  await page.getByRole('button', { name: 'Add entry' }).click()
  await page.getByLabel('Odometer').fill(odometer)
  await page.getByLabel('Gallons').fill(gallons)
  await page.getByLabel('Cost').fill(cost)
  await page.getByLabel('Note').fill(note)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] page heading is "Vehicle Mileage Log"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Vehicle Mileage Log' })).toBeVisible()
})

test('[A2] adding an entry shows it in the list', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  const item = page.locator('li').filter({ hasText: '12500' })
  await expect(item).toContainText('12500')
  await expect(item).toContainText('10.5')
  await expect(item).toContainText('$45.25')
  await expect(item).toContainText('Full tank')
})

test('[A3] summary shows total miles and cost after one entry', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await expect(page.getByText('Total miles: 12500')).toBeVisible()
  await expect(page.getByText('Total cost: $45.25')).toBeVisible()
})

test('[A4] adding a second entry updates the list and summary', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  const item = page.locator('li').filter({ hasText: '12800' })
  await expect(item).toContainText('12800')
  await expect(item).toContainText('8.2')
  await expect(item).toContainText('$38.10')
  await expect(item).toContainText('Half tank')
  await expect(page.getByText('Total miles: 12800')).toBeVisible()
  await expect(page.getByText('Total cost: $83.35')).toBeVisible()
})

test('[A5] deleting the first entry removes it and updates the summary', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  const first = page.locator('li').filter({ hasText: '12500' })
  await first.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('li').filter({ hasText: '12500' })).toHaveCount(0)
  await expect(page.getByText('Total miles: 12800')).toBeVisible()
  await expect(page.getByText('Total cost: $38.10')).toBeVisible()
})

test('[A6] Summary tab shows the average MPG table row', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await page.getByRole('tab', { name: 'Summary' }).click()
  await expect(page.getByRole('cell', { name: 'Average MPG' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Average MPG' }).locator('..')).toContainText('14.4')
})

test('[A7] Export CSV copies the CSV to the clipboard', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('odometer,gallons,cost,note')
  expect(clip).toContain('12800,8.2,38.10,Half tank')
})

test('[A8] searching filters the list', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await page.getByLabel('Search').fill('Half')
  await expect(page.locator('li').filter({ hasText: 'Half tank' })).toHaveCount(1)
  await expect(page.locator('li').filter({ hasText: 'Full tank' })).toHaveCount(0)
})

test('[A9] entries persist across reload', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await page.reload()
  await expect(page.locator('li').filter({ hasText: '12800' })).toContainText('Half tank')
  await expect(page.getByText('Total cost: $38.10')).toBeVisible()
})
