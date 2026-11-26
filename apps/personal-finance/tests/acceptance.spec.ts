import { expect, test, type Page } from '@playwright/test'

// A6: "$1,500.00" is the spec's stated default budget for Housing.
async function addTransaction(
  page: Page,
  t: { description: string; amount: string; type: string; account: string; category: string }
) {
  await page.getByLabel('Description').fill(t.description)
  await page.getByLabel('Amount').fill(t.amount)
  await page.getByLabel('Type').selectOption(t.type)
  await page.getByLabel('Account').selectOption(t.account)
  await page.getByLabel('Category').selectOption(t.category)
  await page.getByRole('button', { name: 'Add' }).click()
}

const salary = { description: 'Salary', amount: '2500', type: 'Income', account: 'Bank', category: 'Salary' }
const rent = { description: 'Rent', amount: '1200.50', type: 'Expense', account: 'Bank', category: 'Housing' }

test('[A1] heading and Ledger tab active by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Personal Finance Ledger' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Ledger' })).toHaveAttribute('aria-selected', 'true')
})

test('[A2] adding a transaction appends a row', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, salary)
  const row = page.getByRole('row').filter({ hasText: 'Salary' })
  await expect(row).toContainText(['+$2,500.00', 'Bank', 'Salary'])
})

test('[A3] net worth after the income', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, salary)
  await expect(page.getByLabel('Net worth')).toHaveText('$2,500.00')
})

test('[A4] expense lowers net worth and shows a negative row', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, salary)
  await addTransaction(page, rent)
  await expect(page.getByLabel('Net worth')).toHaveText('$1,299.50')
  const row = page.getByRole('row').filter({ hasText: 'Rent' })
  await expect(row).toContainText('-$1,200.50')
})

test('[A5] deleting a transaction removes it and restores net worth', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, salary)
  await addTransaction(page, rent)
  await page.getByRole('button', { name: 'Delete Rent' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Rent' })).toHaveCount(0)
  await expect(page.getByLabel('Net worth')).toHaveText('$2,500.00')
})

test('[A6] budgets tab shows budget vs actual', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, rent)
  await page.getByRole('tab', { name: 'Budgets' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Housing' })
  await expect(row).toContainText(['$1,500.00', '$1,200.50'])
})

test('[A7] editing the budget updates the row', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, rent)
  await page.getByRole('tab', { name: 'Budgets' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Housing' })
  await row.getByLabel('Budget').fill('1000')
  await row.getByLabel('Budget').press('Enter')
  await expect(row).toContainText('$1,000.00')
})

test('[A8] charts tab donut shows a legend and tooltip', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, rent)
  await page.getByRole('tab', { name: 'Charts' }).click()
  await expect(page.getByText('Housing')).toBeVisible()
  await page.getByText('Housing').first().hover()
  await expect(page.getByText('Housing: $1,200.50')).toBeVisible()
})

test('[A9] data survives a reload', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, salary)
  await page.reload()
  const row = page.getByRole('row').filter({ hasText: 'Salary' })
  await expect(row).toContainText('+$2,500.00')
  await expect(page.getByLabel('Net worth')).toHaveText('$2,500.00')
})
