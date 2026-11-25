import { expect, test, type Page } from '@playwright/test'

// Data rows start after the header row: row 0 is the header.

function row(page: Page, n: number) {
  return page.getByRole('row').nth(n + 1)
}

async function enterRow(page: Page, n: number, student: string, math: string, science: string, english: string) {
  await page.getByLabel('Student', { exact: true }).nth(n).fill(student)
  await page.getByLabel('Math', { exact: true }).nth(n).fill(math)
  await page.getByLabel('Science', { exact: true }).nth(n).fill(science)
  await page.getByLabel('English', { exact: true }).nth(n).fill(english)
}

async function aliceAndBob(page: Page) {
  await enterRow(page, 0, 'Alice', '95', '88', '92')
  await page.getByRole('button', { name: 'Add Student' }).click()
  await enterRow(page, 1, 'Bob', '70', '75', '80')
}

test('[A1] shows heading and the empty grid', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Gradebook Manager' })).toBeVisible()
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  await expect(page.getByRole('row').nth(0)).toHaveText(['Student', 'Math', 'Science', 'English', 'Average'])
  const emptyRow = row(page, 0)
  await expect(emptyRow.getByLabel('Student', { exact: true })).toHaveValue('')
  await expect(emptyRow.getByLabel('Math', { exact: true })).toHaveValue('')
  await expect(emptyRow.getByLabel('Science', { exact: true })).toHaveValue('')
  await expect(emptyRow.getByLabel('English', { exact: true })).toHaveValue('')
  await expect(emptyRow.getByRole('cell').last()).toHaveText('')
  await expect(page.getByRole('row')).toHaveCount(2)
})

test('[A2] typing Alice scores shows 91.67 in her Average cell', async ({ page }) => {
  await page.goto('/')
  await enterRow(page, 0, 'Alice', '95', '88', '92')
  await expect(row(page, 0).getByRole('cell').last()).toHaveText('91.67')
})

test('[A3] Add Student adds a second row; typing Bob scores shows 75.00', async ({ page }) => {
  await page.goto('/')
  await enterRow(page, 0, 'Alice', '95', '88', '92')
  await page.getByRole('button', { name: 'Add Student' }).click()
  await expect(page.getByRole('row')).toHaveCount(3)
  await expect(row(page, 1).getByLabel('Student', { exact: true })).toHaveValue('')
  await enterRow(page, 1, 'Bob', '70', '75', '80')
  await expect(row(page, 1).getByRole('cell').last()).toHaveText('75.00')
  await expect(row(page, 0).getByRole('cell').last()).toHaveText('91.67')
})

test('[A4] Add Student from the empty page adds an empty second row', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Student' }).click()
  const r = [0, 1]
  for (const n of r) {
    const dataRow = row(page, n)
    await expect(dataRow.getByLabel('Student', { exact: true })).toHaveValue('')
    await expect(dataRow.getByLabel('Math', { exact: true })).toHaveValue('')
    await expect(dataRow.getByLabel('Science', { exact: true })).toHaveValue('')
    await expect(dataRow.getByLabel('English', { exact: true })).toHaveValue('')
    await expect(dataRow.getByRole('cell').last()).toHaveText('')
  }
  await expect(page.getByRole('row')).toHaveCount(3)
})

test('[A5] Select Alice then Delete Student removes Alice, leaving Bob at 75.00', async ({ page }) => {
  await page.goto('/')
  await aliceAndBob(page)
  await row(page, 0).getByRole('button', { name: 'Select Alice' }).click()
  await page.getByRole('button', { name: 'Delete Student' }).click()
  await expect(page.getByRole('row')).toHaveCount(2)
  await expect(row(page, 0).getByLabel('Student', { exact: true })).toHaveValue('Bob')
  await expect(row(page, 0).getByRole('cell').last()).toHaveText('75.00')
})

test('[A6] Statistics tab shows class average, highest, lowest and median', async ({ page }) => {
  await page.goto('/')
  await aliceAndBob(page)
  await page.getByRole('tab', { name: 'Statistics' }).click()
  await expect(page.getByText('Class Average: 83.33')).toBeVisible()
  await expect(page.getByText('Highest: 95')).toBeVisible()
  await expect(page.getByText('Lowest: 70')).toBeVisible()
  await expect(page.getByText('Median: 84.00')).toBeVisible()
})

test('[A7] Export CSV copies the header and Bob row without trailing rows', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await enterRow(page, 0, 'Bob', '70', '75', '80')
  await page.getByRole('tab', { name: 'Statistics' }).click()
  await page.getByRole('button', { name: 'Export CSV' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard holds the CSV export').toBe('Student,Math,Science,English,Average\nBob,70,75,80,75.00')
})

test('[A8] Math 105 shows 86.67 in Bob row and Highest 105 in Statistics', async ({ page }) => {
  await page.goto('/')
  await enterRow(page, 0, 'Bob', '70', '75', '80')
  await page.getByLabel('Math', { exact: true }).nth(0).fill('105')
  await expect(row(page, 0).getByRole('cell').last()).toHaveText('86.67')
  await page.getByRole('tab', { name: 'Statistics' }).click()
  await expect(page.getByText('Highest: 105')).toBeVisible()
})

test('[A9] reload keeps Bob row and its 75.00 average', async ({ page }) => {
  await page.goto('/')
  await enterRow(page, 0, 'Bob', '70', '75', '80')
  await page.reload()
  await expect(row(page, 0).getByLabel('Student', { exact: true })).toHaveValue('Bob')
  await expect(row(page, 0).getByLabel('Math', { exact: true })).toHaveValue('70')
  await expect(row(page, 0).getByLabel('Science', { exact: true })).toHaveValue('75')
  await expect(row(page, 0).getByLabel('English', { exact: true })).toHaveValue('80')
  await expect(row(page, 0).getByRole('cell').last()).toHaveText('75.00')
})
