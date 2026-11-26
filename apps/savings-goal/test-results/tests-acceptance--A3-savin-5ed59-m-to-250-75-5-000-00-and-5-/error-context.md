# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] saving a deposit of 250.75 updates the item to "$250.75 / $5,000.00" and "5%"
- Location: tests/acceptance.spec.ts:35:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | 
  3   | async function addGoal(page: Page, name: string, target: string, deadline: string) {
  4   |   await page.getByRole('button', { name: 'New goal' }).click()
  5   |   await page.getByLabel('Goal name').fill(name)
  6   |   await page.getByLabel('Target amount').fill(target)
  7   |   await page.getByLabel('Deadline').fill(deadline)
  8   |   await page.getByRole('button', { name: 'Save goal' }).click()
  9   | }
  10  | 
  11  | async function addDeposit(page: Page, goalName: string, amount: string) {
  12  |   await page.getByRole('listitem').filter({ hasText: goalName }).getByRole('button', { name: 'Add deposit' }).click()
  13  |   await page.getByLabel('Amount').fill(amount)
  14  |   await page.getByRole('button', { name: 'Save deposit' }).click()
  15  | }
  16  | 
  17  | test('[A1] with no goals the page shows the heading, "No goals yet" and the "New goal" button', async ({ page }) => {
  18  |   await page.goto('/')
  19  |   await expect(page.getByRole('heading', { name: 'Savings Goal Tracker' })).toBeVisible()
  20  |   await expect(page.getByText('No goals yet')).toBeVisible()
  21  |   await expect(page.getByRole('button', { name: 'New goal' })).toBeVisible()
  22  | })
  23  | 
  24  | test('[A2] saving a goal adds a list item with name, "$0.00 / $5,000.00" and "0%"', async ({ page }) => {
  25  |   await page.goto('/')
  26  |   await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  27  |   await expect(page.getByText('No goals yet')).toHaveCount(0)
  28  |   const item = page.getByRole('listitem').filter({ hasText: 'Emergency Fund' })
  29  |   await expect(item).toBeVisible()
  30  |   await expect(item.getByText('Emergency Fund')).toBeVisible()
  31  |   await expect(item.getByText('$0.00 / $5,000.00')).toBeVisible()
  32  |   await expect(item.getByText('0%', { exact: true })).toBeVisible()
  33  | })
  34  | 
  35  | test('[A3] saving a deposit of 250.75 updates the item to "$250.75 / $5,000.00" and "5%"', async ({ page }) => {
> 36  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  37  |   await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  38  |   await addDeposit(page, 'Emergency Fund', '250.75')
  39  |   const item = page.getByRole('listitem').filter({ hasText: 'Emergency Fund' })
  40  |   await expect(item.getByText('$250.75 / $5,000.00')).toBeVisible()
  41  |   await expect(item.getByText('5%', { exact: true })).toBeVisible()
  42  | })
  43  | 
  44  | test('[A4] a second goal with a 1000 deposit shows "$1,000.00 / $2,000.00" and "50%"', async ({ page }) => {
  45  |   await page.goto('/')
  46  |   await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  47  |   await addGoal(page, 'Vacation', '2000', '2025-08-15')
  48  |   await addDeposit(page, 'Vacation', '1000')
  49  |   const item = page.getByRole('listitem').filter({ hasText: 'Vacation' })
  50  |   await expect(item.getByText('Vacation')).toBeVisible()
  51  |   await expect(item.getByText('$1,000.00 / $2,000.00')).toBeVisible()
  52  |   await expect(item.getByText('50%', { exact: true })).toBeVisible()
  53  | })
  54  | 
  55  | test('[A5] deleting the Vacation goal removes it and leaves Emergency Fund untouched', async ({ page }) => {
  56  |   await page.goto('/')
  57  |   await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  58  |   await addDeposit(page, 'Emergency Fund', '250.75')
  59  |   await addGoal(page, 'Vacation', '2000', '2025-08-15')
  60  |   await page.getByRole('listitem').filter({ hasText: 'Vacation' }).getByRole('button', { name: 'Delete goal' }).click()
  61  |   await expect(page.getByRole('listitem').filter({ hasText: 'Vacation' })).toHaveCount(0)
  62  |   const item = page.getByRole('listitem').filter({ hasText: 'Emergency Fund' })
  63  |   await expect(item.getByText('$250.75 / $5,000.00')).toBeVisible()
  64  | })
  65  | 
  66  | test('[A6] the Progress tab shows a circular progress ring per goal with "5%" and the goal name', async ({ page }) => {
  67  |   await page.goto('/')
  68  |   await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  69  |   await addDeposit(page, 'Emergency Fund', '250.75')
  70  |   await page.getByRole('tab', { name: 'Progress' }).click()
  71  |   const ring = page.getByRole('progressbar')
  72  |   await expect(ring).toBeVisible()
  73  |   const now = await ring.getAttribute('aria-valuenow')
  74  |   const max = await ring.getAttribute('aria-valuemax')
  75  |   expect(now ? Number(now) : null, 'ring aria-valuenow is 5').toBe(5)
  76  |   expect(max ? Number(max) : null, 'ring aria-valuemax is 100').toBe(100)
  77  |   await expect(page.getByText('5%', { exact: true })).toBeVisible()
  78  |   await expect(page.getByText('Emergency Fund')).toBeVisible()
  79  | })
  80  | 
  81  | test('[A7] the History tab shows a table with a row for the Emergency Fund deposit', async ({ page }) => {
  82  |   await page.goto('/')
  83  |   await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  84  |   await addDeposit(page, 'Emergency Fund', '250.75')
  85  |   // A7's "2024-01-15" is a fixed date the deposit form does not expose; the
  86  |   // reading that agrees with A3 (no date field) is that the row shows the
  87  |   // goal and amount, with the date set by the app.
  88  |   await page.getByRole('tab', { name: 'History' }).click()
  89  |   const table = page.getByRole('table')
  90  |   await expect(table).toBeVisible()
  91  |   await expect(table.getByRole('columnheader', { name: 'Date' })).toBeVisible()
  92  |   await expect(table.getByRole('columnheader', { name: 'Goal' })).toBeVisible()
  93  |   await expect(table.getByRole('columnheader', { name: 'Amount' })).toBeVisible()
  94  |   await expect(table.getByRole('columnheader', { name: 'Running Total' })).toBeVisible()
  95  |   const row = table.getByRole('row').filter({ hasText: 'Emergency Fund' }).first()
  96  |   await expect(row.getByText('Emergency Fund')).toBeVisible()
  97  |   await expect(row.getByText('$250.75', { exact: true })).toHaveCount(2)
  98  | })
  99  | 
  100 | test('[A8] Export CSV copies the goals CSV to the clipboard', async ({ page, context }) => {
  101 |   // grant before the click so the clipboard write can succeed
  102 |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  103 |   await page.goto('/')
  104 |   await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  105 |   await addDeposit(page, 'Emergency Fund', '250.75')
  106 |   await page.getByRole('button', { name: 'Export CSV' }).click()
  107 |   // read the clipboard after the user action; no page or storage mutation
  108 |   const text = await page.evaluate(() => navigator.clipboard.readText())
  109 |   expect(text).toBe('Goal,Target,Saved,Percent\nEmergency Fund,5000.00,250.75,5')
  110 | })
  111 | 
  112 | test('[A9] the goal and its deposit survive a reload', async ({ page }) => {
  113 |   await page.goto('/')
  114 |   await addGoal(page, 'Emergency Fund', '5000', '2025-12-31')
  115 |   await addDeposit(page, 'Emergency Fund', '250.75')
  116 |   await page.reload()
  117 |   const item = page.getByRole('listitem').filter({ hasText: 'Emergency Fund' })
  118 |   await expect(item).toBeVisible()
  119 |   await expect(item.getByText('Emergency Fund')).toBeVisible()
  120 |   await expect(item.getByText('$250.75 / $5,000.00')).toBeVisible()
  121 |   await expect(item.getByText('5%', { exact: true })).toBeVisible()
  122 | })
  123 | 
```