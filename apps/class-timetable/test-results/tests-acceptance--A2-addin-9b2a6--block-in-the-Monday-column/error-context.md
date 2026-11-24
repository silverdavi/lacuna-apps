# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A2] adding Math Monday 09:00-10:00 shows a block in the Monday column
- Location: tests/acceptance.spec.ts:26:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | 
  3   | async function addClass(page: import('@playwright/test').Page, name: string, day: string, start: string, end: string) {
  4   |   await page.getByLabel('Class name').fill(name)
  5   |   await page.getByLabel('Day').selectOption(day)
  6   |   await page.getByLabel('Start time').fill(start)
  7   |   await page.getByLabel('End time').fill(end)
  8   |   await page.getByRole('button', { name: 'Add class' }).click()
  9   | }
  10  | 
  11  | test('[A1] empty app shows the heading and the week grid with Monday through Friday', async ({ page }) => {
  12  |   await page.goto('/')
  13  |   await expect(page.getByRole('heading', { name: 'Class Timetable' })).toBeVisible()
  14  |   // The week grid is the default view; the app must not require a tab click to see it.
  15  |   await expect(page.getByRole('tab', { name: 'Table' })).toHaveCount(1)
  16  |   for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
  17  |     await expect(page.getByText(day, { exact: true })).toBeVisible()
  18  |   }
  19  |   // No class has been added, so no class block exists in the grid.
  20  |   for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
  21  |     await expect(page.locator('h2', { hasText: day }).locator('..')).not.toHaveText('09:00')
  22  |     await expect(page.locator('h2', { hasText: day }).locator('..')).not.toHaveText('08:00')
  23  |   }
  24  | })
  25  | 
  26  | test('[A2] adding Math Monday 09:00-10:00 shows a block in the Monday column', async ({ page }) => {
> 27  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  28  |   await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  29  |   const block = page.getByText('Math', { exact: true }).first()
  30  |   await expect(block).toBeVisible()
  31  |   // The block itself carries the name and the "09:00–10:00" range in the Monday column.
  32  |   await expect(page.locator('h2', { hasText: 'Monday' }).locator('..').getByText('Math', { exact: true })).toContainText('09:00–10:00')
  33  | })
  34  | 
  35  | test('[A3] the Table tab lists the class and the Class name header sorts the table', async ({ page }) => {
  36  |   await page.goto('/')
  37  |   await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  38  |   await page.getByRole('tab', { name: 'Table' }).click()
  39  |   const table = page.getByRole('table')
  40  |   await expect(table.getByRole('row').filter({ hasText: 'Math' })).toContainText('Monday')
  41  |   await expect(table.getByRole('row').filter({ hasText: 'Math' })).toContainText('09:00')
  42  |   await expect(table.getByRole('row').filter({ hasText: 'Math' })).toContainText('10:00')
  43  |   const header = table.getByRole('columnheader', { name: 'Class name' })
  44  |   await header.click()
  45  |   const firstDataRow = table.getByRole('row').nth(1)
  46  |   await expect(firstDataRow).toContainText('Math')
  47  |   // Sorting again must not reorder a single-row table away from "Math".
  48  |   await header.click()
  49  |   await expect(table.getByRole('row').nth(1)).toContainText('Math')
  50  | })
  51  | 
  52  | test('[A4] adding Physics before Math leaves two blocks in the Monday column', async ({ page }) => {
  53  |   await page.goto('/')
  54  |   await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  55  |   await addClass(page, 'Physics', 'Monday', '08:00', '09:00')
  56  |   const mondayColumn = page.locator('h2', { hasText: 'Monday' }).locator('..')
  57  |   await expect(mondayColumn.getByText('Math', { exact: true })).toHaveCount(1)
  58  |   await expect(mondayColumn.getByText('Physics', { exact: true })).toHaveCount(1)
  59  |   // Each block carries its name and time range in the Monday column.
  60  |   await expect(mondayColumn.getByText('Math', { exact: true })).toContainText('09:00–10:00')
  61  |   await expect(mondayColumn.getByText('Physics', { exact: true })).toContainText('08:00–09:00')
  62  | })
  63  | 
  64  | test('[A5] clicking the Math block opens a detail panel and Delete class removes it', async ({ page }) => {
  65  |   await page.goto('/')
  66  |   await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  67  |   await addClass(page, 'Physics', 'Monday', '08:00', '09:00')
  68  |   await page.getByText('Math', { exact: true }).first().click()
  69  |   const panel = page.getByRole('button', { name: 'Delete class' }).locator('..')
  70  |   await expect(panel).toBeVisible()
  71  |   await expect(panel.getByRole('button', { name: 'Delete class' })).toBeVisible()
  72  |   await page.getByRole('button', { name: 'Delete class' }).click()
  73  |   const mondayColumn = page.locator('h2', { hasText: 'Monday' }).locator('..')
  74  |   await expect(mondayColumn.getByText('Math', { exact: true })).toHaveCount(0)
  75  |   await expect(mondayColumn.getByText('Physics', { exact: true })).toHaveCount(1)
  76  | })
  77  | 
  78  | test('[A6] adding Chemistry on Tuesday shows a block in the Tuesday column', async ({ page }) => {
  79  |   await page.goto('/')
  80  |   await addClass(page, 'Chemistry', 'Tuesday', '11:00', '12:00')
  81  |   // The block itself carries the name and the "11:00–12:00" range in the Tuesday column.
  82  |   await expect(page.locator('h2', { hasText: 'Tuesday' }).locator('..').getByText('Chemistry', { exact: true })).toContainText('11:00–12:00')
  83  | })
  84  | 
  85  | test('[A7] Export ICS copies an ICS string containing both summaries to the clipboard', async ({
  86  |   page,
  87  |   context,
  88  | }) => {
  89  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  90  |   await page.goto('/')
  91  |   await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  92  |   await addClass(page, 'Chemistry', 'Tuesday', '11:00', '12:00')
  93  |   await page.getByRole('button', { name: 'Export ICS' }).click()
  94  |   const ics = await page.evaluate(() => navigator.clipboard.readText())
  95  |   expect(ics).toContain('SUMMARY:Math')
  96  |   expect(ics).toContain('SUMMARY:Chemistry')
  97  | })
  98  | 
  99  | test('[A8] an end time before the start time shows an error and adds no block', async ({ page }) => {
  100 |   await page.goto('/')
  101 |   await addClass(page, 'Bio', 'Monday', '10:00', '09:00')
  102 |   await expect(page.getByText('End time must be after start time')).toBeVisible()
  103 |   // No block was added anywhere in the grid, including the Monday column.
  104 |   await expect(page.getByText('Bio', { exact: true })).toHaveCount(0)
  105 |   await expect(page.locator('h2', { hasText: 'Monday' }).locator('..').getByText('Bio', { exact: true })).toHaveCount(0)
  106 | })
  107 | 
  108 | test('[A9] Physics Monday 08:00-09:00 survives a reload in the week grid', async ({ page }) => {
  109 |   await page.goto('/')
  110 |   await addClass(page, 'Physics', 'Monday', '08:00', '09:00')
  111 |   await page.reload()
  112 |   // The block itself carries the name and the "08:00–09:00" range in the Monday column.
  113 |   await expect(page.locator('h2', { hasText: 'Monday' }).locator('..').getByText('Physics', { exact: true })).toContainText('08:00–09:00')
  114 | })
  115 | 
```