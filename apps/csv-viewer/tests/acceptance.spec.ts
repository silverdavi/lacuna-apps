// Acceptance tests for the csv-viewer app, derived from the spec's checks A1-A8.
// Expected values are copied verbatim from the spec.
import { expect, test, type Page } from '@playwright/test'

async function loadCsv(page: Page, content: string) {
  const input = page.locator('input[type="file"]')
  await input.setInputFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(content),
  })
  await page.waitForLoadState('networkidle')
}

test('[A1] the page displays the heading "CSV Viewer" and the empty-state text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'CSV Viewer' })).toBeVisible()
  await expect(page.getByText('Drop a CSV file or click to browse')).toBeVisible()
})

test('[A2] loading a CSV shows the column header and the first data cell', async ({ page }) => {
  await page.goto('/')
  await loadCsv(page, 'Name,Age,City\nAlice,30,Paris')
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible()
})

test('[A3] typing "Alice" in the Filter input and pressing Enter filters the grid', async ({ page }) => {
  await page.goto('/')
  await loadCsv(page, 'Name,Age,City\nAlice,30,Paris\nBob,25,London')
  await page.getByLabel('Filter').fill('Alice')
  await page.getByLabel('Filter').press('Enter')
  await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Bob' })).toHaveCount(0)
  await expect(page.getByText('1 of 1 rows')).toBeVisible()
})

test('[A4] clicking "Export CSV" downloads export.csv with the current data', async ({ page }) => {
  await page.goto('/')
  await loadCsv(page, 'Name,Age,City\nAlice,30,Paris')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('export.csv')
  const path = await download.path()
  const fs = await import('node:fs/promises')
  const text = await fs.readFile(path, 'utf8')
  expect(text).toBe('Name,Age,City\nAlice,30,Paris')
})

test('[A5] clicking "Clear Filter" removes the filter text and shows all rows', async ({ page }) => {
  await page.goto('/')
  await loadCsv(page, 'Name,Age,City\nAlice,30,Paris')
  await page.getByLabel('Filter').fill('Alice')
  await page.getByLabel('Filter').press('Enter')
  await page.getByRole('button', { name: 'Clear Filter' }).click()
  await expect(page.getByLabel('Filter')).toHaveValue('')
  await expect(page.getByText('1 of 1 rows')).toBeVisible()
})

test('[A6] clicking a cell selects it and the Down arrow moves the selection to the next row', async ({ page }) => {
  await page.goto('/')
  await loadCsv(page, 'Name,Age,City\nAlice,30,Paris\nBob,25,London')
  await page.getByRole('cell', { name: 'Bob' }).click()
  await page.keyboard.press('ArrowDown')
  // A6: two data rows (Alice in row 1, Bob in row 2). Clicking "Bob" selects
  // row 2; Down wraps to row 1, so the "Alice" cell is the selected one.
  const aliceCell = page.getByRole('cell', { name: 'Alice' })
  await expect(aliceCell).toHaveAttribute('aria-selected', 'true')
})

test('[A7] clicking "Reset" clears the loaded file and returns to the empty state', async ({ page }) => {
  await page.goto('/')
  await loadCsv(page, 'Name,Age,City\nAlice,30,Paris')
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByText('Drop a CSV file or click to browse')).toBeVisible()
})

test('[A8] a reload keeps the loaded CSV data and the active filter', async ({ page }) => {
  await page.goto('/')
  await loadCsv(page, 'Name,Age,City\nAlice,30,Paris')
  await page.getByLabel('Filter').fill('Alice')
  await page.getByLabel('Filter').press('Enter')
  await page.reload()
  await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible()
  await expect(page.getByLabel('Filter')).toHaveValue('Alice')
})
