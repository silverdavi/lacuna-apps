import { expect, test, type Page } from '@playwright/test'

async function plot(page: Page, expression: string) {
  await page.getByLabel('Function expression').fill(expression)
  await page.getByRole('button', { name: 'Plot function' }).click()
}

// The spec names the tab "Table"; in tabbed views it is a tab.
function tableTab(page: Page) {
  return page.getByRole('tab', { name: 'Table' })
}

function rowForX(page: Page, x: string) {
  // Rows are keyed by x; match a row whose first column is exactly the value of x
  // so "x = 2" is not confused with "x = 12".
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: x, exact: true }).first() })
}

test('[A1] empty app shows the heading and the empty-state text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Graphing Calculator' })).toBeVisible()
  await expect(page.getByText('No functions plotted yet')).toBeVisible()
})

test('[A2] plotting x^2 adds a list item and clears the empty state', async ({ page }) => {
  await page.goto('/')
  await plot(page, 'x^2')
  await expect(page.getByRole('listitem').filter({ hasText: 'x^2' })).toContainText('x^2')
  await expect(page.getByText('No functions plotted yet')).toHaveCount(0)
})

test('[A3] with x^2 plotted, the Table tab shows y = 4 at x = 2', async ({ page }) => {
  await page.goto('/')
  await plot(page, 'x^2')
  await tableTab(page).click()
  const row = rowForX(page, '2')
  await expect(row).toBeVisible()
  await expect(row.getByRole('cell', { name: '4' })).toBeVisible()
})

test('[A4] deleting x^2 removes it and brings back the empty state', async ({ page }) => {
  await page.goto('/')
  await plot(page, 'x^2')
  await page.getByRole('button', { name: 'Delete x^2' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'x^2' })).toHaveCount(0)
  await expect(page.getByText('No functions plotted yet')).toBeVisible()
})

test('[A5] plotting 2x + 1 adds a list item and the Table tab shows y = 1 at x = 0', async ({ page }) => {
  await page.goto('/')
  await plot(page, '2x + 1')
  await expect(page.getByRole('listitem').filter({ hasText: '2x + 1' })).toContainText('2x + 1')
  await tableTab(page).click()
  const row = rowForX(page, '0')
  await expect(row).toBeVisible()
  await expect(row.getByRole('cell', { name: '1' })).toBeVisible()
})

test('[A6] the X min and X max fields drive which rows the Table tab shows', async ({ page }) => {
  await page.goto('/')
  await plot(page, 'x^2')
  await page.getByLabel('X min').fill('-5')
  await page.getByLabel('X max').fill('5')
  await tableTab(page).click()
  const min = rowForX(page, '-5')
  await expect(min).toBeVisible()
  await expect(min.getByRole('cell', { name: '25' })).toBeVisible()
  const max = rowForX(page, '5')
  await expect(max).toBeVisible()
  await expect(max.getByRole('cell', { name: '25' })).toBeVisible()
})

// A7 only fixes the download name; a non-empty body follows from exporting a plot.
test('[A7] Export PNG downloads a file named graph.png', async ({ page }) => {
  await page.goto('/')
  await plot(page, 'x^2')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('graph.png')
  expect((await download.path()) ?? '', 'download lands on disk').not.toBe('')
})

test('[A8] plotting log(x) adds a list item and the Table tab shows y = 0 at x = 1', async ({ page }) => {
  await page.goto('/')
  await plot(page, 'log(x)')
  await expect(page.getByRole('listitem').filter({ hasText: 'log(x)' })).toContainText('log(x)')
  await tableTab(page).click()
  const row = rowForX(page, '1')
  await expect(row).toBeVisible()
  await expect(row.getByRole('cell', { name: '0' })).toBeVisible()
})

test('[A9] a reload keeps x^2 in the list and the Table row x = 2 showing 4', async ({ page }) => {
  await page.goto('/')
  await plot(page, 'x^2')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'x^2' })).toBeVisible()
  await tableTab(page).click()
  const row = rowForX(page, '2')
  await expect(row).toBeVisible()
  await expect(row.getByRole('cell', { name: '4' })).toBeVisible()
})
