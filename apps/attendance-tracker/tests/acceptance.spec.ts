import { test, expect } from '@playwright/test'

test('[A1] page heading is "Attendance Tracker" and table shows "No entries yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Attendance Tracker' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
})

async function addEntry(page: import('@playwright/test').Page, name: string, date: string, status: string) {
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Status').selectOption({ label: status })
  await page.getByRole('button', { name: 'Add entry' }).click()
}

test('[A2] adding Alice Present 2024-01-15 adds a row and removes "No entries yet"', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice', '2024-01-15', 'Present')
  await expect(page.getByText('Alice')).toBeVisible()
  await expect(page.getByText('2024-01-15')).toBeVisible()
  await expect(page.getByText('Present')).toBeVisible()
  await expect(page.getByText('No entries yet')).not.toBeVisible()
})

test('[A3] adding Bob Absent 2024-01-15 after Alice gives two rows', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice', '2024-01-15', 'Present')
  await addEntry(page, 'Bob', '2024-01-15', 'Absent')
  await expect(page.getByText('Bob')).toBeVisible()
  await expect(page.getByText('2024-01-15')).toBeVisible()
  await expect(page.getByText('Absent')).toBeVisible()
  const rows = page.locator('table tbody tr')
  await expect(rows).toHaveCount(2)
})

test('[A4] clicking "Add entry" with empty Name shows "Name is required" and adds no row', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '', '2024-01-15', 'Present')
  await expect(page.getByText('Name is required')).toBeVisible()
  const rows = page.locator('table tbody tr')
  await expect(rows).toHaveCount(0)
})

test('[A5] clicking "Delete Alice" removes the Alice row leaving only Bob with summary "Total: 1"', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice', '2024-01-15', 'Present')
  await addEntry(page, 'Bob', '2024-01-15', 'Absent')
  await page.getByRole('button', { name: 'Delete Alice' }).click()
  await expect(page.getByText('Alice')).not.toBeVisible()
  await expect(page.getByText('Bob')).toBeVisible()
  await expect(page.getByText('Total: 1')).toBeVisible()
})

test('[A6] typing "Alice" in Search filters the table to only the Alice row', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice', '2024-01-15', 'Present')
  await addEntry(page, 'Bob', '2024-01-15', 'Absent')
  await page.getByLabel('Search').fill('Alice')
  await expect(page.getByText('Alice')).toBeVisible()
  await expect(page.getByText('Bob')).not.toBeVisible()
})

test('[A7] clicking column header "Date" sorts the table by date ascending', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice', '2024-01-15', 'Present')
  await addEntry(page, 'Bob', '2024-01-10', 'Absent')
  await page.getByRole('columnheader', { name: 'Date' }).click()
  const rows = page.locator('table tbody tr')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('2024-01-10')
  await expect(rows.nth(1)).toContainText('2024-01-15')
})

test('[A8] clicking "Export CSV" copies a CSV string to the clipboard', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addEntry(page, 'Alice', '2024-01-15', 'Present')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Name,Date,Status')
  expect(text).toContain('Alice,2024-01-15,Present')
})

test('[A9] reload keeps the Alice entry', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice', '2024-01-15', 'Present')
  await page.reload()
  await expect(page.getByText('Alice')).toBeVisible()
  await expect(page.getByText('2024-01-15')).toBeVisible()
  await expect(page.getByText('Present')).toBeVisible()
})
