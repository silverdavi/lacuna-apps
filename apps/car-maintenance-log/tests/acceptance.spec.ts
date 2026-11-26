import { expect, test } from '@playwright/test'

async function addRecord(
  page: import('@playwright/test').Page,
  rec: { title: string; date: string; mileage: string; cost: string; type: string },
) {
  await page.getByRole('button', { name: 'Add record' }).click()
  await page.getByLabel('Title').fill(rec.title)
  await page.getByLabel('Date').fill(rec.date)
  await page.getByLabel('Mileage').fill(rec.mileage)
  await page.getByLabel('Cost').fill(rec.cost)
  await page.getByLabel('Type').selectOption(rec.type)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] page heading is "Car Maintenance Log"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Car Maintenance Log' })).toBeVisible()
})

test('[A2] adding an oil change record lists it with formatted mileage and cost', async ({ page }) => {
  await page.goto('/')
  await addRecord(page, { title: 'Oil Change', date: '2024-01-15', mileage: '5000', cost: '85.50', type: 'Service' })
  const item = page.locator('li').filter({ hasText: 'Oil Change' })
  await expect(item).toContainText('2024-01-15')
  await expect(item).toContainText('5,000 mi')
  await expect(item).toContainText('$85.50')
})

test('[A3] a second record appears alongside the first', async ({ page }) => {
  await page.goto('/')
  await addRecord(page, { title: 'Oil Change', date: '2024-01-15', mileage: '5000', cost: '85.50', type: 'Service' })
  await addRecord(page, { title: 'Brake Pads', date: '2024-03-20', mileage: '12000', cost: '240.00', type: 'Service' })
  const item = page.locator('li').filter({ hasText: 'Brake Pads' })
  await expect(item).toContainText('2024-03-20')
  await expect(item).toContainText('12,000 mi')
  await expect(item).toContainText('$240.00')
})

test('[A4] search filters records by text', async ({ page }) => {
  await page.goto('/')
  await addRecord(page, { title: 'Oil Change', date: '2024-01-15', mileage: '5000', cost: '85.50', type: 'Service' })
  await addRecord(page, { title: 'Brake Pads', date: '2024-03-20', mileage: '12000', cost: '240.00', type: 'Service' })
  await page.getByLabel('Search').fill('oil')
  await expect(page.getByText('Oil Change')).toBeVisible()
  await expect(page.getByText('Brake Pads')).toHaveCount(0)
})

test('[A5] delete button removes the record', async ({ page }) => {
  await page.goto('/')
  await addRecord(page, { title: 'Oil Change', date: '2024-01-15', mileage: '5000', cost: '85.50', type: 'Service' })
  await addRecord(page, { title: 'Brake Pads', date: '2024-03-20', mileage: '12000', cost: '240.00', type: 'Service' })
  await page.getByRole('button', { name: 'Delete Oil Change' }).click()
  await expect(page.getByText('Oil Change')).toHaveCount(0)
  await expect(page.getByText('Brake Pads')).toBeVisible()
})

test('[A6] upcoming tab lists a saved upcoming task with due mileage', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Upcoming' }).click()
  await expect(page.getByRole('heading', { name: 'Upcoming Maintenance' })).toBeVisible()
  await page.getByRole('button', { name: 'Add upcoming' }).click()
  await page.getByLabel('Task').fill('Tire Rotation')
  await page.getByLabel('Due Mileage').fill('15000')
  await page.getByLabel('Interval').fill('5000')
  await page.getByRole('button', { name: 'Save' }).click()
  const item = page.locator('li').filter({ hasText: 'Tire Rotation' })
  await expect(item).toContainText('Due at 15,000 mi')
})

test('[A7] upcoming task shows status against current mileage', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Upcoming' }).click()
  await page.getByRole('button', { name: 'Add upcoming' }).click()
  await page.getByLabel('Task').fill('Tire Rotation')
  await page.getByLabel('Due Mileage').fill('15000')
  await page.getByLabel('Interval').fill('5000')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByLabel('Current Mileage').fill('14000')
  const item = page.locator('li').filter({ hasText: 'Tire Rotation' })
  await expect(item).toContainText('Due in 1,000 mi')
})

test('[A8] exporting shows a toast with the exported record count', async ({ page }) => {
  await page.goto('/')
  await addRecord(page, { title: 'Oil Change', date: '2024-01-15', mileage: '5000', cost: '85.50', type: 'Service' })
  await addRecord(page, { title: 'Brake Pads', date: '2024-03-20', mileage: '12000', cost: '240.00', type: 'Service' })
  await page.getByRole('button', { name: 'Export CSV' }).click()
  await expect(page.getByText('Exported 2 records to CSV')).toBeVisible()
})

test('[A9] reload keeps records visible', async ({ page }) => {
  await page.goto('/')
  await addRecord(page, { title: 'Oil Change', date: '2024-01-15', mileage: '5000', cost: '85.50', type: 'Service' })
  await page.reload()
  const item = page.locator('li').filter({ hasText: 'Oil Change' })
  await expect(item).toContainText('2024-01-15')
  await expect(item).toContainText('$85.50')
})
