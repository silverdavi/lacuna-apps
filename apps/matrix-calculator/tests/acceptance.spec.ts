// Acceptance tests for the matrix-calculator app.
// Derived from the spec's acceptance checks A1–A8; expected values copied verbatim.
import { expect, test, type Page } from '@playwright/test'

const resultCell = (page: Page, r: number, c: number) =>
  page
    .getByRole('table', { name: 'Result' })
    .getByRole('row')
    .nth(r - 1)
    .getByRole('cell')
    .nth(c - 1)

test('[A1] page heading is Matrix Calculator', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Matrix Calculator' })).toBeVisible()
})

test('[A2] default matrices with Add show 6, 8, 10, 12 in the result table', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('select', { name: 'Operation' })).toHaveValue('Add')
  await expect(page.getByRole('select', { name: 'Both sizes' })).toHaveValue('2x2')
  await expect(resultCell(page, 1, 1)).toHaveText('6')
  await expect(resultCell(page, 1, 2)).toHaveText('8')
  await expect(resultCell(page, 2, 1)).toHaveText('10')
  await expect(resultCell(page, 2, 2)).toHaveText('12')
})

test('[A3] default matrices with Multiply show 19, 22, 43, 50 in the result table', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('select', { name: 'Operation' }).selectOption({ label: 'Multiply' })
  await expect(resultCell(page, 1, 1)).toHaveText('19')
  await expect(resultCell(page, 1, 2)).toHaveText('22')
  await expect(resultCell(page, 2, 1)).toHaveText('43')
  await expect(resultCell(page, 2, 2)).toHaveText('50')
})

test('[A4] Copy result puts exactly "6 8 10 12" on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'Copy result' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('6 8 10 12')
})

test('[A5] 3x3 in "Both sizes" gives three rows and columns of zero inputs and an all-zero 3x3 result', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('select', { name: 'Both sizes' }).selectOption({ label: '3x3' })
  for (const m of ['A', 'B']) {
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        await expect(page.getByLabel(`${m}${r}${c}`, { exact: true })).toHaveValue('0')
      }
    }
  }
  await expect(page.getByRole('table', { name: 'Result' }).getByRole('row')).toHaveCount(3)
  for (let r = 1; r <= 3; r++) {
    const row = page.getByRole('table', { name: 'Result' }).getByRole('row').nth(r - 1)
    await expect(row.getByRole('cell')).toHaveCount(3)
    for (let c = 1; c <= 3; c++) {
      await expect(row.getByRole('cell').nth(c - 1)).toHaveText('0')
    }
  }
})

test('[A6] changing A11 from 1 to 9 moves result (1,1) to 14; Undo restores both', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('A11', { exact: true }).fill('9')
  await expect(resultCell(page, 1, 1)).toHaveText('14')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByLabel('A11', { exact: true })).toHaveValue('1')
  await expect(resultCell(page, 1, 1)).toHaveText('6')
})

test('[A7] reload keeps the Multiply operation and the edited A11 value', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('select', { name: 'Operation' }).selectOption({ label: 'Multiply' })
  await page.getByLabel('A11', { exact: true }).fill('10')
  await page.reload()
  await expect(page.getByRole('select', { name: 'Operation' })).toHaveValue('Multiply')
  await expect(page.getByLabel('A11', { exact: true })).toHaveValue('10')
})

test('[A8] A 2x2 with B 3x3 under Multiply shows the dimension mismatch message', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('select', { name: 'Operation' }).selectOption({ label: 'Multiply' })
  await page.getByRole('select', { name: 'Size B' }).selectOption({ label: '3x3' })
  await expect(page.getByText('Dimensions do not match for multiplication')).toBeVisible()
  await expect(page.getByRole('table', { name: 'Result' })).toHaveCount(0)
})
