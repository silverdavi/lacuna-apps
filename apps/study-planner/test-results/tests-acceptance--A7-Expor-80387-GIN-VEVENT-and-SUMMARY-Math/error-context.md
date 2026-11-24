# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A7] Export ICS copies an ICS string containing BEGIN:VEVENT and SUMMARY:Math
- Location: tests/acceptance.spec.ts:72:1

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
  3   | // Creates the "Math" session used across the acceptance checks.
  4   | async function addMath(page: Page) {
  5   |   await page.getByRole('button', { name: 'New session' }).click()
  6   |   await page.getByLabel('Subject').fill('Math')
  7   |   await page.getByLabel('Date').fill('2024-05-15')
  8   |   await page.getByLabel('Start time').fill('14:00')
  9   |   await page.getByLabel('Duration').fill('60')
  10  |   await page.getByRole('button', { name: 'Save' }).click()
  11  | }
  12  | 
  13  | // Creates the "History" recurring session used across the acceptance checks.
  14  | async function addHistory(page: Page) {
  15  |   await page.getByRole('button', { name: 'New session' }).click()
  16  |   await page.getByLabel('Subject').fill('History')
  17  |   await page.getByLabel('Date').fill('2024-05-16')
  18  |   await page.getByLabel('Start time').fill('10:00')
  19  |   await page.getByLabel('Duration').fill('90')
  20  |   await page.getByLabel('Repeat weekly').check()
  21  |   await page.getByRole('button', { name: 'Save' }).click()
  22  | }
  23  | 
  24  | test('[A1] heading and both tabs are visible, Month active by default', async ({ page }) => {
  25  |   await page.goto('/')
  26  |   await expect(page.getByRole('heading', { name: 'Study Planner' })).toBeVisible()
  27  |   await expect(page.getByRole('tab', { name: 'Month' })).toBeVisible()
  28  |   await expect(page.getByRole('tab', { name: 'Week' })).toBeVisible()
  29  |   await expect(page.getByRole('tab', { name: 'Month' })).toHaveAttribute('aria-selected', 'true')
  30  | })
  31  | 
  32  | test('[A2] saving a new session shows "Math 14:00-15:00" on May 15, 2024 in the month grid', async ({ page }) => {
  33  |   await page.goto('/')
  34  |   await addMath(page)
  35  |   const cell = page.getByRole('cell', { name: 'May 15' })
  36  |   await expect(cell).toBeVisible()
  37  |   await expect(cell).toContainText('Math 14:00-15:00')
  38  | })
  39  | 
  40  | test('[A3] clicking the session opens detail and Mark done changes status to Done with a checkmark', async ({ page }) => {
  41  |   await page.goto('/')
  42  |   await addMath(page)
  43  |   await page.getByText('Math 14:00-15:00').first().click()
  44  |   await expect(page.getByRole('button', { name: 'Mark done' })).toBeVisible()
  45  |   await page.getByRole('button', { name: 'Mark done' }).click()
  46  |   await expect(page.getByText('Done')).toBeVisible()
  47  |   await expect(page.locator('svg').first()).toBeVisible()
  48  | })
  49  | 
  50  | test('[A4] Delete in the detail view removes the session from the calendar', async ({ page }) => {
  51  |   await page.goto('/')
  52  |   await addMath(page)
  53  |   await page.getByText('Math 14:00-15:00').first().click()
  54  |   await page.getByRole('button', { name: 'Delete' }).click()
  55  |   await expect(page.getByRole('cell', { name: 'May 15' })).not.toContainText('Math 14:00-15:00')
  56  | })
  57  | 
  58  | test('[A5] Week tab shows the session in the May 13–May 19 column', async ({ page }) => {
  59  |   await page.goto('/')
  60  |   await addMath(page)
  61  |   await page.getByRole('tab', { name: 'Week' }).click()
  62  |   await expect(page.getByText('Math 14:00-15:00')).toBeVisible()
  63  | })
  64  | 
  65  | test('[A6] checking "Repeat weekly" creates a recurring session on May 23, 2024', async ({ page }) => {
  66  |   await page.goto('/')
  67  |   await addHistory(page)
  68  |   await expect(page.getByRole('cell', { name: 'May 16' })).toContainText('History 10:00-11:30')
  69  |   await expect(page.getByRole('cell', { name: 'May 23' })).toContainText('History 10:00-11:30')
  70  | })
  71  | 
  72  | test('[A7] Export ICS copies an ICS string containing BEGIN:VEVENT and SUMMARY:Math', async ({ page, context }) => {
  73  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
> 74  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  75  |   await addMath(page)
  76  |   await page.getByRole('button', { name: 'Export ICS' }).click()
  77  |   const text = await page.evaluate(() => navigator.clipboard.readText())
  78  |   expect(text).toContain('BEGIN:VEVENT')
  79  |   expect(text).toContain('SUMMARY:Math')
  80  | })
  81  | 
  82  | test('[A8] progress summary shows "Completed: 1 of 2" after marking one of two done', async ({ page }) => {
  83  |   await page.goto('/')
  84  |   await addMath(page)
  85  |   await addHistory(page)
  86  |   await page.getByText('Math 14:00-15:00').first().click()
  87  |   await page.getByRole('button', { name: 'Mark done' }).click()
  88  |   await expect(page.getByText('Completed: 1 of 2')).toBeVisible()
  89  | })
  90  | 
  91  | test('[A9] reload keeps the Math session and the progress summary', async ({ page }) => {
  92  |   await page.goto('/')
  93  |   await addMath(page)
  94  |   await addHistory(page)
  95  |   await page.getByText('Math 14:00-15:00').first().click()
  96  |   await page.getByRole('button', { name: 'Mark done' }).click()
  97  |   await page.reload()
  98  |   await expect(page.getByRole('cell', { name: 'May 15' })).toContainText('Math 14:00-15:00')
  99  |   await expect(page.getByText('Completed: 1 of 2')).toBeVisible()
  100 | })
  101 | 
```