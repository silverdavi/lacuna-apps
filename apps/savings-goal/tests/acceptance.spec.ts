import { expect, test, type Page } from '@playwright/test'

async function addGoal(page: Page, name: string, target: string, deadline: string) {
  await page.getByRole('button', { name: 'New goal' }).click()
  await page.getByLabel('Goal name').fill(name)
  await page.getByLabel('Target amount').fill(target)
  await page.getByLabel('Deadline').fill(deadline)
  await page.getByRole('button', { name: 'Save goal' }).click()
}

async function addDeposit(page: Page, goalName: string, amount: string) {
  await page.getByRole('listitem').filter({ hasText: goalName }).getByRole('button', { name: 'Add deposit' }).click()
  await page.getByLabel('Amount').fill(amount)
  await page.getByRole('button', { name: 'Save deposit' }).click()
}

test('[A1] with no goals the page shows the heading, "No goals yet" and the "New goal" button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Savings Goal Tracker' })).toBeVisible()
  await expect(page.getByText('No goals yet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New goal' })).toBeVisible()
})

test('[A2] saving a goal adds a list item with name, "$0.00 / $5,000.00" and "0%"', async ({ page }) => {
  await page.goto('/')
  await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  await expect(page.getByText('No goals yet')).toHaveCount(0)
  const item = page.getByRole('listitem').filter({ hasText: 'Emergency Fund' })
  await expect(item).toBeVisible()
  await expect(item.getByText('Emergency Fund')).toBeVisible()
  await expect(item.getByText('$0.00 / $5,000.00')).toBeVisible()
  await expect(item.getByText('0%', { exact: true })).toBeVisible()
})

test('[A3] saving a deposit of 250.75 updates the item to "$250.75 / $5,000.00" and "5%"', async ({ page }) => {
  await page.goto('/')
  await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  await addDeposit(page, 'Emergency Fund', '250.75')
  const item = page.getByRole('listitem').filter({ hasText: 'Emergency Fund' })
  await expect(item.getByText('$250.75 / $5,000.00')).toBeVisible()
  await expect(item.getByText('5%', { exact: true })).toBeVisible()
})

test('[A4] a second goal with a 1000 deposit shows "$1,000.00 / $2,000.00" and "50%"', async ({ page }) => {
  await page.goto('/')
  await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  await addGoal(page, 'Vacation', '2000', '2025-08-15')
  await addDeposit(page, 'Vacation', '1000')
  const item = page.getByRole('listitem').filter({ hasText: 'Vacation' })
  await expect(item.getByText('Vacation')).toBeVisible()
  await expect(item.getByText('$1,000.00 / $2,000.00')).toBeVisible()
  await expect(item.getByText('50%', { exact: true })).toBeVisible()
})

test('[A5] deleting the Vacation goal removes it and leaves Emergency Fund untouched', async ({ page }) => {
  await page.goto('/')
  await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  await addDeposit(page, 'Emergency Fund', '250.75')
  await addGoal(page, 'Vacation', '2000', '2025-08-15')
  await page.getByRole('listitem').filter({ hasText: 'Vacation' }).getByRole('button', { name: 'Delete goal' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Vacation' })).toHaveCount(0)
  const item = page.getByRole('listitem').filter({ hasText: 'Emergency Fund' })
  await expect(item.getByText('$250.75 / $5,000.00')).toBeVisible()
})

test('[A6] the Progress tab shows a circular progress ring per goal with "5%" and the goal name', async ({ page }) => {
  await page.goto('/')
  await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  await addDeposit(page, 'Emergency Fund', '250.75')
  await page.getByRole('tab', { name: 'Progress' }).click()
  const ring = page.getByRole('progressbar')
  await expect(ring).toBeVisible()
  const now = await ring.getAttribute('aria-valuenow')
  const max = await ring.getAttribute('aria-valuemax')
  expect(now ? Number(now) : null, 'ring aria-valuenow is 5').toBe(5)
  expect(max ? Number(max) : null, 'ring aria-valuemax is 100').toBe(100)
  await expect(page.getByText('5%', { exact: true })).toBeVisible()
  await expect(page.getByText('Emergency Fund')).toBeVisible()
})

test('[A7] the History tab shows a table with a row for the Emergency Fund deposit', async ({ page }) => {
  await page.goto('/')
  await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  await addDeposit(page, 'Emergency Fund', '250.75')
  // A7's "2024-01-15" is a fixed date the deposit form does not expose; the
  // reading that agrees with A3 (no date field) is that the row shows the
  // goal and amount, with the date set by the app.
  await page.getByRole('tab', { name: 'History' }).click()
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Date' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Goal' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Amount' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Running Total' })).toBeVisible()
  const row = table.getByRole('row').filter({ hasText: 'Emergency Fund' }).first()
  await expect(row.getByText('Emergency Fund')).toBeVisible()
  await expect(row.getByText('$250.75', { exact: true })).toHaveCount(2)
})

test('[A8] Export CSV copies the goals CSV to the clipboard', async ({ page, context }) => {
  // grant before the click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  await addDeposit(page, 'Emergency Fund', '250.75')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('Goal,Target,Saved,Percent\nEmergency Fund,5000.00,250.75,5')
})

test('[A9] the goal and its deposit survive a reload', async ({ page }) => {
  await page.goto('/')
  await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  await addDeposit(page, 'Emergency Fund', '250.75')
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'Emergency Fund' })
  await expect(item).toBeVisible()
  await expect(item.getByText('Emergency Fund')).toBeVisible()
  await expect(item.getByText('$250.75 / $5,000.00')).toBeVisible()
  await expect(item.getByText('5%', { exact: true })).toBeVisible()
})
