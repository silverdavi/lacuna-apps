// Acceptance tests for the matrix-calculator app.
// Derived from the spec's acceptance checks A1-A8; expected values copied verbatim.
// The spec does not name the table's cells or the clipboard text format; cell
// contents are asserted wherever they appear and the copied text is read back
// from the clipboard after a real click on "Copy result".
import { expect, test, type Page } from '@playwright/test'

async function selectDimension(page: Page, label: string) {
  await page.getByLabel('Dimensions').selectOption({ label })
}

async function selectOperation(page: Page, label: string) {
  await page.getByLabel('Operation').selectOption({ label })
}

test('[A1] heading is "Matrix Calculator"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Matrix Calculator' })).toBeVisible()
})

test('[A2] default 2x2 matrices with Add give 6, 8, 10, 12', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('6', { exact: true })).toBeVisible()
  await expect(page.getByText('8', { exact: true })).toBeVisible()
  await expect(page.getByText('10', { exact: true })).toBeVisible()
  await expect(page.getByText('12', { exact: true })).toBeVisible()
})

test('[A3] Multiply with default matrices gives 19, 22, 43, 50', async ({ page }) => {
  await page.goto('/')
  await selectOperation(page, 'Multiply')
  await expect(page.getByText('19', { exact: true })).toBeVisible()
  await expect(page.getByText('22', { exact: true })).toBeVisible()
  await expect(page.getByText('43', { exact: true })).toBeVisible()
  await expect(page.getByText('50', { exact: true })).toBeVisible()
})

test('[A4] Copy result copies "6 8 10 12" to the clipboard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Copy result' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('6 8 10 12')
})

test('[A5] switching to 3x3 adds a row and column and shows a 3x3 of zeros', async ({ page }) => {
  await page.goto('/')
  await selectDimension(page, '3x3')
  const zeros = page.getByText('0', { exact: true })
  await expect(zeros).toHaveCount(9)
})

test('[A6] Undo reverts the last matrix cell edit', async ({ page }) => {
  await page.goto('/')
  const cell = page.getByLabel('A11')
  await expect(cell).toHaveValue('1')
  await cell.fill('5')
  await expect(cell).toHaveValue('5')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(cell).toHaveValue('1')
})

test('[A7] reload restores the edited cell and the operation', async ({ page }) => {
  await page.goto('/')
  await selectOperation(page, 'Multiply')
  await page.getByLabel('A11').fill('10')
  await page.reload()
  await expect(page.getByLabel('Operation')).toHaveValue('multiply')
  await expect(page.getByLabel('A11')).toHaveValue('10')
})

test('[A8] incompatible dimensions show the multiplication message', async ({ page }) => {
  // [A8] The spec does not spell out how to make A 2x2 and B 2x3; the test assumes
  // the app exposes a per-matrix dimension control that accepts "2x3" for B.
  await page.goto('/')
  await page.getByLabel('Operation').selectOption({ label: 'Multiply' })
  await page.getByLabel('B dimensions').selectOption({ label: '2x3' })
  await expect(page.getByText('Dimensions do not match for multiplication')).toBeVisible()
})
