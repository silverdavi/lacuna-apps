import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Loads Monthly Budget workbook with evaluated SUM, IF, and percent formulas', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Spreadsheet' })).toBeVisible()
  // Planned total B8 = SUM(B2:B7) = 2200+650+240+320+300+800 = $4,510.00
  await expect(page.locator('[data-cell="B8"]')).toHaveText('$4,510.00')
  // Actual total C8 = 2200+590+265+295+340+800 = $4,490.00
  await expect(page.locator('[data-cell="C8"]')).toHaveText('$4,490.00')
  // Variance D8 = $20.00
  await expect(page.locator('[data-cell="D8"]')).toHaveText('$20.00')
  // Status F8 = COUNTIF(F2:F7,"Over")&" over" = "2 over"
  await expect(page.locator('[data-cell="F8"]')).toHaveText('2 over')
})

test('[A2] Editing a cell recalculates dependent formulas and persists across reload', async ({ page }) => {
  await page.locator('[data-cell="C2"]').click()
  const formulaBar = page.getByLabel('Formula bar')
  await expect(formulaBar).toHaveValue('2200')
  await formulaBar.fill('2500')
  await page.getByRole('button', { name: 'Apply' }).click()

  // C8 should increase by 300 to $4,790.00, D2 becomes -$300.00, F2 becomes Over, F8 becomes 3 over
  await expect(page.locator('[data-cell="C8"]')).toHaveText('$4,790.00')
  await expect(page.locator('[data-cell="D2"]')).toHaveText('-$300.00')
  await expect(page.locator('[data-cell="F2"]')).toHaveText('Over')
  await expect(page.locator('[data-cell="F8"]')).toHaveText('3 over')

  // Reload and verify persistence
  await page.reload()
  await expect(page.locator('[data-cell="C2"]')).toHaveText('$2,500.00')
  await expect(page.locator('[data-cell="C8"]')).toHaveText('$4,790.00')
})

test('[A3] Supports formula functions, division-by-zero error, and circular reference detection', async ({ page }) => {
  const formulaBar = page.getByLabel('Formula bar')

  // VLOOKUP on Budget table: lookup "Groceries" -> Actual column (3) = 590
  await page.locator('[data-cell="A10"]').click()
  await formulaBar.fill('=VLOOKUP("Groceries",A2:C7,3)')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.locator('[data-cell="A10"]')).toHaveText('590')

  // Division by zero -> #DIV/0!
  await page.locator('[data-cell="B10"]').click()
  await formulaBar.fill('=10/0')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.locator('[data-cell="B10"]')).toHaveText('#DIV/0!')

  // IFERROR catches #DIV/0!
  await page.locator('[data-cell="C10"]').click()
  await formulaBar.fill('=IFERROR(B10,0)')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.locator('[data-cell="C10"]')).toHaveText('0')

  // Circular reference -> #CYCLE!
  await page.locator('[data-cell="D10"]').click()
  await formulaBar.fill('=D10+1')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.locator('[data-cell="D10"]')).toHaveText('#CYCLE!')
})

test('[A4] Cross-sheet references work on Summary sheet and new sheets', async ({ page }) => {
  await page.getByRole('tab', { name: 'Summary' }).click()
  await expect(page.locator('[data-cell="B2"]')).toHaveText('$4,510.00')
  await expect(page.locator('[data-cell="B3"]')).toHaveText('$4,490.00')

  await page.getByRole('button', { name: 'Add sheet' }).click()
  await expect(page.getByRole('tab', { name: 'Sheet3' })).toBeVisible()
  await page.locator('[data-cell="A1"]').click()
  await page.getByLabel('Formula bar').fill('=Budget!B8*2')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.locator('[data-cell="A1"]')).toHaveText('9,020')
})

test('[A5] Formatting, Undo/Redo, and Template loading', async ({ page }) => {
  await page.locator('[data-cell="A10"]').click()
  await page.getByLabel('Formula bar').fill('1234.5')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.locator('[data-cell="A10"]')).toHaveText('1,234.5')

  await page.getByLabel('Number format').selectOption('currency')
  await expect(page.locator('[data-cell="A10"]')).toHaveText('$1,234.50')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('[data-cell="A10"]')).toHaveText('1,234.5')

  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.locator('[data-cell="A10"]')).toHaveText('$1,234.50')

  // Switch template to Gradebook
  await page.getByLabel('Template').selectOption('gradebook')
  await page.getByRole('button', { name: 'Load template' }).click()
  await expect(page.locator('[data-cell="A2"]')).toHaveText('Maya Lin')
  await expect(page.locator('[data-cell="F2"]')).toHaveText('A')
})

test('[A6] Export CSV triggers a file download', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('budget.csv')
})
