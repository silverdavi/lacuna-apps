import { expect, test, type Page } from '@playwright/test'

async function addTransaction(page: Page, description: string, amount: string, category: string) {
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Amount').fill(amount)
  await page.getByLabel('Category').selectOption(category)
  await page.getByRole('button', { name: 'Add transaction' }).click()
}

function ledgerRow(page: Page, description: string) {
  return page.getByRole('row', { name: new RegExp(description, 'i') })
}

function foodRow(page: Page) {
  return page.getByRole('row', { name: /Food/ })
}

test('[A1] empty app shows heading, "No transactions yet" and "Total spent: $0.00"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Expense Tracker' })).toBeVisible()
  await expect(page.getByText('No transactions yet')).toBeVisible()
  await expect(page.getByText('Total spent: $0.00')).toBeVisible()
})

test('[A2] adding Groceries 45.50 Food adds a row and the total shows $45.50', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, 'Groceries', '45.50', 'Food')
  const r = ledgerRow(page, 'Groceries')
  await expect(r).toContainText('Food')
  await expect(r).toContainText('-$45.50')
  await expect(page.getByText('No transactions yet')).toHaveCount(0)
  await expect(page.getByText('Total spent: $45.50')).toBeVisible()
})

test('[A3] a second transaction brings the ledger to two rows and $49.75 total', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, 'Groceries', '45.50', 'Food')
  await addTransaction(page, 'Coffee', '4.25', 'Food')
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(3)
  await expect(page.getByText('Total spent: $49.75')).toBeVisible()
})

test('[A4] empty description or zero amount is rejected with a message', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Description').fill('')
  await page.getByLabel('Amount').fill('45.50')
  await page.getByLabel('Category').selectOption('Food')
  await page.getByRole('button', { name: 'Add transaction' }).click()
  await expect(page.getByText('Enter a description and an amount greater than 0')).toBeVisible()
  await expect(page.getByText('No transactions yet')).toBeVisible()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(1)
  await page.getByLabel('Description').fill('Snacks')
  await page.getByLabel('Amount').fill('0')
  await page.getByRole('button', { name: 'Add transaction' }).click()
  await expect(page.getByText('Enter a description and an amount greater than 0')).toBeVisible()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(1)
})

test('[A5] Delete Coffee removes its row and the total returns to $45.50', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, 'Groceries', '45.50', 'Food')
  await addTransaction(page, 'Coffee', '4.25', 'Food')
  await expect(page.getByRole('button', { name: 'Delete Groceries' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete Coffee' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Coffee' }).click()
  await expect(ledgerRow(page, 'Coffee')).toHaveCount(0)
  await expect(ledgerRow(page, 'Groceries')).toBeVisible()
  await expect(page.getByText('Total spent: $45.50')).toBeVisible()
})

test('[A6] the Budgets tab lists Food at Budget $0.00 / Spent $45.50 and Ledger returns', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, 'Groceries', '45.50', 'Food')
  await page.getByRole('tab', { name: 'Budgets' }).click()
  const food = foodRow(page)
  await expect(food).toContainText('Budget: $0.00')
  await expect(food).toContainText('Spent: $45.50')
  await page.getByRole('tab', { name: 'Ledger' }).click()
  await expect(ledgerRow(page, 'Groceries')).toBeVisible()
  await expect(ledgerRow(page, 'Groceries')).toContainText('-$45.50')
})

test('[A7] saving a 100 Food budget updates the row and shows "Under budget"', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, 'Groceries', '45.50', 'Food')
  await page.getByRole('tab', { name: 'Budgets' }).click()
  const food = foodRow(page)
  await food.getByLabel('Budget').fill('100')
  await food.getByRole('button', { name: 'Save budget' }).click()
  await expect(food).toContainText('Budget: $100.00')
  await expect(food).toContainText('Spent: $45.50')
  await expect(page.getByText('Under budget')).toBeVisible()
})

test('[A8] Export CSV copies a CSV starting with the header and the Groceries line', async ({ page, context }) => {
  await page.goto('/')
  await addTransaction(page, 'Groceries', '45.50', 'Food')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  const lines = text.trim().split('\n')
  expect(lines[0], 'CSV starts with the header').toBe('date,description,category,amount')
  expect(lines, 'CSV contains the Groceries line').toContainEqual('2024-01-15,Groceries,Food,-4550')
})

test('[A9] the Groceries transaction survives a reload', async ({ page }) => {
  await page.goto('/')
  await addTransaction(page, 'Groceries', '45.50', 'Food')
  await page.reload()
  const r = ledgerRow(page, 'Groceries')
  await expect(r).toContainText('-$45.50')
  await expect(page.getByText('Total spent: $45.50')).toBeVisible()
})
