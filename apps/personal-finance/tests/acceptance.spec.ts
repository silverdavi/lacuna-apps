import { expect, test } from '@playwright/test'

test('[A1] page heading and Ledger tab active by default', async ({ page }) => {
  await page.goto('/')
  expect(page.getByRole('heading', { name: 'Personal Finance Ledger' })).toBeVisible()
  const ledgerTab = page.getByRole('tab', { name: 'Ledger' })
  await expect(ledgerTab).toBeVisible()
  await expect(ledgerTab).toHaveAttribute('aria-selected', 'true')
})

test('[A2] adding a Salary income transaction adds the expected row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('Salary')
  await page.getByLabel('Amount').fill('2500')
  await page.getByLabel('Type').selectOption('Income')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Salary')
  await page.getByRole('button', { name: 'Add' }).click()

  const row = page.getByRole('row', { name: /Salary/ }).filter({
    has: page.locator('text="\\+$2,500.00"'),
  })
  await expect(row).toHaveText(/Salary/)
  await expect(row.getByText('+$2,500.00')).toBeVisible()
  await expect(row.getByText('Bank')).toBeVisible()
})

test('[A3] Net worth is $2,500.00 after adding the Salary transaction', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('Salary')
  await page.getByLabel('Amount').fill('2500')
  await page.getByLabel('Type').selectOption('Income')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Salary')
  await page.getByRole('button', { name: 'Add' }).click()

  const netWorth = page.getByText('Net worth').locator('..')
  await expect(netWorth).toHaveText(/Net worth.*\$2,500\.00/)
})

test('[A4] adding a Rent expense updates Net worth and row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('Salary')
  await page.getByLabel('Amount').fill('2500')
  await page.getByLabel('Type').selectOption('Income')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Salary')
  await page.getByRole('button', { name: 'Add' }).click()

  await page.getByLabel('Description').fill('Rent')
  await page.getByLabel('Amount').fill('1200.50')
  await page.getByLabel('Type').selectOption('Expense')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Housing')
  await page.getByRole('button', { name: 'Add' }).click()

  const rentRow = page.getByRole('row', { name: /Rent/ })
  await expect(rentRow.getByText('-$1,200.50')).toBeVisible()

  const netWorth = page.getByText('Net worth').locator('..')
  await expect(netWorth).toHaveText(/Net worth.*\$1,299\.50/)
})

test('[A5] Delete Rent removes the row and restores Net worth', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('Salary')
  await page.getByLabel('Amount').fill('2500')
  await page.getByLabel('Type').selectOption('Income')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Salary')
  await page.getByRole('button', { name: 'Add' }).click()

  await page.getByLabel('Description').fill('Rent')
  await page.getByLabel('Amount').fill('1200.50')
  await page.getByLabel('Type').selectOption('Expense')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Housing')
  await page.getByRole('button', { name: 'Add' }).click()

  await page.getByRole('button', { name: 'Delete Rent' }).click()

  await expect(page.getByRole('row', { name: /Rent/ })).toHaveCount(0)
  const netWorth = page.getByText('Net worth').locator('..')
  await expect(netWorth).toHaveText(/Net worth.*\$2,500\.00/)
})

test('[A6] Budgets tab shows Housing budget and actual', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('Rent')
  await page.getByLabel('Amount').fill('1200.50')
  await page.getByLabel('Type').selectOption('Expense')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Housing')
  await page.getByRole('button', { name: 'Add' }).click()

  await page.getByRole('tab', { name: 'Budgets' }).click()
  const housingRow = page.getByRole('row', { name: /Housing/ })
  await expect(housingRow.getByText('$1,500.00')).toBeVisible()
  await expect(housingRow.getByText('$1,200.50')).toBeVisible()
})

test('[A7] changing the Housing budget to 1000 updates the Budget column', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('Rent')
  await page.getByLabel('Amount').fill('1200.50')
  await page.getByLabel('Type').selectOption('Expense')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Housing')
  await page.getByRole('button', { name: 'Add' }).click()

  await page.getByRole('tab', { name: 'Budgets' }).click()
  const housingRow = page.getByRole('row', { name: /Housing/ })
  await housingRow.getByLabel('Budget').fill('1000')
  await housingRow.getByLabel('Budget').press('Enter')

  await expect(housingRow.getByText('$1,000.00')).toBeVisible()
  await expect(housingRow.getByText('$1,500.00')).toHaveCount(0)
})

test('[A8] Charts tab shows a donut with a Housing legend and tooltip', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('Rent')
  await page.getByLabel('Amount').fill('1200.50')
  await page.getByLabel('Type').selectOption('Expense')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Housing')
  await page.getByRole('button', { name: 'Add' }).click()

  await page.getByRole('tab', { name: 'Charts' }).click()

  const housingLegend = page.getByText('Housing')
  await expect(housingLegend).toBeVisible()

  const slice = page.locator('svg path').first()
  const box = await slice.boundingBox()
  expect(box, 'donut slice is rendered').toBeTruthy()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

  await expect(page.getByText('Housing: $1,200.50')).toBeVisible()
})

test('[A9] reloading keeps the Salary transaction and Net worth', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('Salary')
  await page.getByLabel('Amount').fill('2500')
  await page.getByLabel('Type').selectOption('Income')
  await page.getByLabel('Account').selectOption('Bank')
  await page.getByLabel('Category').selectOption('Salary')
  await page.getByRole('button', { name: 'Add' }).click()

  await page.reload()

  const row = page.getByRole('row', { name: /Salary/ })
  await expect(row.getByText('+$2,500.00')).toBeVisible()
  const netWorth = page.getByText('Net worth').locator('..')
  await expect(netWorth).toHaveText(/Net worth.*\$2,500\.00/)
})
