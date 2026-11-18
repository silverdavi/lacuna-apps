import { expect, test } from '@playwright/test'

async function addEntry(
  page: import('@playwright/test').Page,
  description: string,
  amount: string,
  type: 'Income' | 'Expense',
) {
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Amount').fill(amount)
  await page.getByLabel('Type').selectOption(type)
  await page.getByRole('button', { name: 'Add entry' }).click()
}

test('[A1] empty app shows heading, no-entries text and zero summaries', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Budget Planner' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
  await expect(page.getByText('Income: $0.00')).toBeVisible()
  await expect(page.getByText('Expenses: $0.00')).toBeVisible()
  await expect(page.getByText('Balance: $0.00')).toBeVisible()
})

test('[A2] adding an income entry updates the list and balance', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Salary', '2500', 'Income')
  await expect(page.getByText('No entries yet')).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Salary' })).toContainText('+$2,500.00')
  await expect(page.getByText('Balance: $2,500.00')).toBeVisible()
})

test('[A3] adding an expense entry updates the list and all summaries', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Salary', '2500', 'Income')
  await addEntry(page, 'Rent', '1200.50', 'Expense')
  await expect(page.getByRole('listitem').filter({ hasText: 'Rent' })).toContainText('-$1,200.50')
  await expect(page.getByText('Income: $2,500.00')).toBeVisible()
  await expect(page.getByText('Expenses: $1,200.50')).toBeVisible()
  await expect(page.getByText('Balance: $1,299.50')).toBeVisible()
})

test('[A4] invalid entries are rejected with a message', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('')
  await page.getByLabel('Amount').fill('2500')
  await page.getByLabel('Type').selectOption('Income')
  await page.getByRole('button', { name: 'Add entry' }).click()
  await expect(page.getByText('Enter a description and an amount greater than 0')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A5] deleting an entry removes it and updates the summary', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Salary', '2500', 'Income')
  await addEntry(page, 'Rent', '1200.50', 'Expense')
  await expect(page.getByRole('button', { name: 'Delete Salary' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete Rent' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Rent' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Rent' })).toHaveCount(0)
  await expect(page.getByText('Expenses: $0.00')).toBeVisible()
  await expect(page.getByText('Balance: $2,500.00')).toBeVisible()
})

test('[A6] expenses exceeding income give a negative balance', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Gift', '100', 'Income')
  await addEntry(page, 'Bike', '250', 'Expense')
  await expect(page.getByText('Balance: -$150.00')).toBeVisible()
})

test('[A7] entries survive a reload', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Salary', '2500', 'Income')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Salary' })).toContainText('+$2,500.00')
  await expect(page.getByText('Balance: $2,500.00')).toBeVisible()
})
