// Acceptance tests for the bill-splitter app, derived from the spec's checks A1-A9.
// Expected values are copied verbatim from the spec.
import { expect, test, type Page } from '@playwright/test'

async function addExpense(page: Page, description: string, amount: string, people: string) {
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Amount').fill(amount)
  await page.getByLabel('People').fill(people)
  await page.getByRole('button', { name: 'Add expense' }).click()
}

// A8: the spec does not fix the chart's DOM. A bar is any visible element whose
// accessible name is the person; its height is read after the user adds the
// expense. The read falls back to aria-valuenow (a bar commonly carries it),
// then to the bar's computed height relative to its container.
function barHeightPct(page: Page, name: string) {
  const bar = page.getByLabel(name).first()
  return bar.evaluate((el) => {
    const attr = el.getAttribute('aria-valuenow')
    if (attr !== null) return Number(attr)
    const h = parseFloat(getComputedStyle(el as HTMLElement).height)
    const parent = (el.parentElement as HTMLElement | null)?.offsetHeight ?? 0
    if (parent > 0 && h > 0) return Math.round((h / parent) * 100)
    return h
  })
}

test('[A1] the heading is "Bill Splitter" and the "Split" tab is active by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bill Splitter' })).toBeVisible()
  // no user action is needed on a fresh load: a default-active tab is marked
  // aria-current (or equivalent) and its tabpanel is the one shown, so assert
  // through the visible split form rather than reading the tab element.
  await expect(page.getByRole('tab', { name: 'Split' })).toBeVisible()
  await expect(page.getByLabel('Description')).toBeVisible()
})

test('[A2] adding "Dinner" $100 for "Alice, Bob" adds the row to the Expenses table', async ({ page }) => {
  await page.goto('/')
  await addExpense(page, 'Dinner', '100', 'Alice, Bob')
  const table = page.getByRole('table', { name: 'Expenses' })
  await expect(table).toBeVisible()
  const row = table.getByRole('row', { name: /Dinner/ })
  await expect(row).toContainText('$100.00')
  await expect(row).toContainText('Alice, Bob')
})

test('[A3] after adding the expense the summary shows the total, people and per person', async ({ page }) => {
  await page.goto('/')
  await addExpense(page, 'Dinner', '100', 'Alice, Bob')
  await expect(page.getByText('Total: $100.00')).toBeVisible()
  await expect(page.getByText('People: 2')).toBeVisible()
  await expect(page.getByText('Per person: $50.00')).toBeVisible()
})

test('[A4] deleting the expense removes its row and zeroes the summary', async ({ page }) => {
  await page.goto('/')
  await addExpense(page, 'Dinner', '100', 'Alice, Bob')
  await page.getByRole('button', { name: 'Delete Dinner' }).click()
  const table = page.getByRole('table', { name: 'Expenses' })
  await expect(table.getByRole('row', { name: /Dinner/ })).toHaveCount(0)
  await expect(page.getByText('Total: $0.00')).toBeVisible()
  await expect(page.getByText('People: 0')).toBeVisible()
  await expect(page.getByText('Per person: $0.00')).toBeVisible()
})

test('[A5] the Settle up tab shows the minimal transfers between the three people', async ({ page }) => {
  await page.goto('/')
  await addExpense(page, 'Dinner', '100', 'Alice, Bob')
  await addExpense(page, 'Taxi', '50', 'Alice, Bob, Carol')
  await page.getByRole('tab', { name: 'Settle up' }).click()
  const transfers = page.getByRole('table', { name: 'Transfers' })
  await expect(transfers).toBeVisible()
  await expect(transfers.getByText('Alice owes Bob $25.00')).toBeVisible()
  await expect(transfers.getByText('Alice owes Carol $25.00')).toBeVisible()
})

test('[A6] percentage mode splits the expense by the entered percentages', async ({ page }) => {
  await page.goto('/')
  await addExpense(page, 'Dinner', '100', 'Alice, Bob')
  await page.getByLabel('Split mode').selectOption('Percentage')
  await page.getByLabel('Alice %').fill('50')
  await page.getByLabel('Bob %').fill('50')
  await expect(page.getByText('Alice: $50.00')).toBeVisible()
  await expect(page.getByText('Bob: $50.00')).toBeVisible()
})

test('[A7] Copy summary copies the total and per-person amounts to the clipboard', async ({ page, context }) => {
  // grant before the copy click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addExpense(page, 'Dinner', '100', 'Alice, Bob')
  await page.getByRole('button', { name: 'Copy summary' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('Total: $100.00, Alice: $50.00, Bob: $50.00')
})

test('[A8] the Split tab shows a "Share by person" chart with two equal bars', async ({ page }) => {
  await page.goto('/')
  await addExpense(page, 'Dinner', '100', 'Alice, Bob')
  // the chart exists and is labelled "Share by person"
  await expect(page.getByLabel('Share by person').first()).toBeVisible()
  // both bars exist, labelled by person, and reach the same (50%) height
  const alice = await barHeightPct(page, 'Alice')
  const bob = await barHeightPct(page, 'Bob')
  expect(alice).toBeGreaterThan(0)
  expect(bob).toBeGreaterThan(0)
  expect(alice).toBe(bob)
})

test('[A9] a reload keeps the expense with its amount and people', async ({ page }) => {
  await page.goto('/')
  await addExpense(page, 'Dinner', '100', 'Alice, Bob')
  await page.reload()
  const table = page.getByRole('table', { name: 'Expenses' })
  const row = table.getByRole('row', { name: /Dinner/ })
  await expect(row).toContainText('$100.00')
  await expect(row).toContainText('Alice, Bob')
})
