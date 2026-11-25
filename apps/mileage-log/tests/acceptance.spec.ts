import { expect, test, type Page } from '@playwright/test'

async function addEntry(
  page: Page,
  odometer: string,
  gallons: string,
  cost: string,
  note: string,
) {
  await page.getByRole('button', { name: 'Add entry' }).click()
  await page.getByLabel('Odometer', { exact: true }).fill(odometer)
  await page.getByLabel('Gallons', { exact: true }).fill(gallons)
  await page.getByLabel('Cost', { exact: true }).fill(cost)
  await page.getByLabel('Note', { exact: true }).fill(note)
  await page.getByRole('button', { name: 'Save' }).click()
}

function item(page: Page, text: string) {
  return page.getByRole('listitem').filter({ hasText: text })
}

test('[A1] the page heading is "Vehicle Mileage Log"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Vehicle Mileage Log' })).toBeVisible()
})

test('[A2] adding an entry shows a list item with all fields', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  const li = item(page, '12500')
  await expect(li).toContainText('12500')
  await expect(li).toContainText('10.5')
  await expect(li).toContainText('$45.25')
  await expect(li).toContainText('Full tank')
})

test('[A3] after adding an entry the summary shows total miles and cost', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await expect(page.getByText('Total miles: 12500')).toBeVisible()
  await expect(page.getByText('Total cost: $45.25')).toBeVisible()
})

test('[A4] adding a second entry updates the list and summary', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await expect(item(page, '12500')).toContainText('Full tank')
  const second = item(page, '12800')
  await expect(second).toContainText('12800')
  await expect(second).toContainText('8.2')
  await expect(second).toContainText('$38.10')
  await expect(second).toContainText('Half tank')
  await expect(page.getByText('Total miles: 12800')).toBeVisible()
  await expect(page.getByText('Total cost: $83.35')).toBeVisible()
})

test('[A5] deleting the first entry leaves the second and updates the summary', async ({
  page,
}) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await item(page, '12500').getByRole('button', { name: 'Delete' }).click()
  await expect(item(page, '12500')).toHaveCount(0)
  await expect(item(page, '12800')).toContainText('Half tank')
  await expect(page.getByText('Total miles: 12800')).toBeVisible()
  await expect(page.getByText('Total cost: $38.10')).toBeVisible()
})

test('[A6] the Summary tab shows an Average MPG table row', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await page.getByRole('tab', { name: 'Summary' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Average MPG' })
  await expect(row).toHaveCount(1)
  await expect(row.getByRole('cell').first()).toHaveText('Average MPG')
  await expect(row.getByRole('cell').nth(1)).toHaveText('16.0')
})

test('[A7] Export CSV puts the CSV on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'CSV starts with the header').toMatch(/^odometer,gallons,cost,note/)
  expect(text, 'CSV contains the second entry line').toContain('12800,8.2,38.10,Half tank')
})

test('[A8] the search box filters the list', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12500', '10.5', '45.25', 'Full tank')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await page.getByLabel('Search').fill('Half')
  await expect(item(page, '12800')).toContainText('Half tank')
  await expect(page.getByText('Full tank')).toHaveCount(0)
})

test('[A9] an entry persists across a reload', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '12800', '8.2', '38.10', 'Half tank')
  await page.reload()
  await expect(item(page, '12800')).toContainText('Half tank')
  await expect(page.getByText('Total cost: $38.10')).toBeVisible()
})
