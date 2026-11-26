# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] New York -> Tokyo on 2024-07-15 10:00 shows 23:00
- Location: tests/acceptance.spec.ts:29:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | // Acceptance tests for the timezone-converter app.
  2  | // Derived from the spec's acceptance checks A1-A9; expected values copied verbatim.
  3  | // The spec names the two inputs "the date field" and "the time field" and the output
  4  | // "the output time field"; tests address them as Date, Time and Result time labels.
  5  | import { expect, test, type Page } from '@playwright/test'
  6  | 
  7  | function historyRow(page: Page, source: string, target: string) {
  8  |   return page.getByRole('row').filter({ hasText: source }).filter({ hasText: target })
  9  | }
  10 | 
  11 | async function enterConversion(page: Page, source: string, target: string, date: string, time: string) {
  12 |   await page.getByLabel('Source timezone').selectOption({ label: source })
  13 |   await page.getByLabel('Target timezone').selectOption({ label: target })
  14 |   await page.getByLabel('Date').fill(date)
  15 |   await page.getByLabel('Time').fill(time)
  16 | }
  17 | 
  18 | test('[A1] the page heading is "Timezone Converter"', async ({ page }) => {
  19 |   await page.goto('/')
  20 |   await expect(page.getByRole('heading', { name: 'Timezone Converter' })).toBeVisible()
  21 | })
  22 | 
  23 | test('[A2] UTC -> New York on 2024-01-15 14:30 shows 09:30', async ({ page }) => {
  24 |   await page.goto('/')
  25 |   await enterConversion(page, 'UTC', 'New York', '2024-01-15', '14:30')
  26 |   await expect(page.getByLabel('Result time')).toHaveValue('09:30')
  27 | })
  28 | 
  29 | test('[A3] New York -> Tokyo on 2024-07-15 10:00 shows 23:00', async ({ page }) => {
> 30 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  31 |   await enterConversion(page, 'New York', 'Tokyo', '2024-07-15', '10:00')
  32 |   await expect(page.getByLabel('Result time')).toHaveValue('23:00')
  33 | })
  34 | 
  35 | test('[A4] saving a UTC -> London conversion on 2024-03-10 12:00 adds a history row', async ({ page }) => {
  36 |   await page.goto('/')
  37 |   await enterConversion(page, 'UTC', 'London', '2024-03-10', '12:00')
  38 |   await page.getByRole('button', { name: 'Save conversion' }).click()
  39 |   const row = historyRow(page, 'UTC', 'London')
  40 |   await expect(row).toBeVisible()
  41 |   await expect(row).toContainText('2024-03-10')
  42 |   await expect(row).toContainText('12:00')
  43 | })
  44 | 
  45 | test('[A5] the History tab shows a "Source" column header and the saved UTC -> London row', async ({ page }) => {
  46 |   await page.goto('/')
  47 |   await enterConversion(page, 'UTC', 'London', '2024-03-10', '12:00')
  48 |   await page.getByRole('button', { name: 'Save conversion' }).click()
  49 |   await page.getByRole('tab', { name: 'History' }).click()
  50 |   await expect(page.getByRole('columnheader', { name: 'Source' })).toBeVisible()
  51 |   const row = historyRow(page, 'UTC', 'London')
  52 |   await expect(row).toBeVisible()
  53 |   await expect(row).toContainText('2024-03-10')
  54 |   await expect(row).toContainText('12:00')
  55 | })
  56 | 
  57 | test('[A6] clicking "Copy result" copies 12:00 to the clipboard', async ({ page, context }) => {
  58 |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  59 |   await page.goto('/')
  60 |   await enterConversion(page, 'UTC', 'London', '2024-03-10', '12:00')
  61 |   await page.getByRole('button', { name: 'Copy result' }).click()
  62 |   const text = await page.evaluate(() => navigator.clipboard.readText())
  63 |   expect(text).toBe('12:00')
  64 | })
  65 | 
  66 | test('[A7] UTC -> Sydney on 2024-01-15 00:00 shows 10:00', async ({ page }) => {
  67 |   await page.goto('/')
  68 |   await enterConversion(page, 'UTC', 'Sydney', '2024-01-15', '00:00')
  69 |   await expect(page.getByLabel('Result time')).toHaveValue('10:00')
  70 | })
  71 | 
  72 | // A8 names "New York" and "UTC" as the source/target after the swap; we read the
  73 | // select's option label (not its internal value) so the assertion does not depend
  74 | // on the IANA identifier the app may store.
  75 | test('[A8] clicking "Swap" exchanges the source and target timezones', async ({ page }) => {
  76 |   await page.goto('/')
  77 |   await enterConversion(page, 'UTC', 'New York', '2024-01-15', '14:30')
  78 |   await page.getByRole('button', { name: 'Swap' }).click()
  79 |   await expect(page.getByLabel('Source timezone')).toHaveValue({ label: 'New York' })
  80 |   await expect(page.getByLabel('Target timezone')).toHaveValue({ label: 'UTC' })
  81 | })
  82 | 
  83 | test('[A9] a saved conversion survives a reload and still shows in the History tab', async ({ page }) => {
  84 |   await page.goto('/')
  85 |   await enterConversion(page, 'UTC', 'London', '2024-03-10', '12:00')
  86 |   await page.getByRole('button', { name: 'Save conversion' }).click()
  87 |   await page.reload()
  88 |   await page.getByRole('tab', { name: 'History' }).click()
  89 |   const row = historyRow(page, 'UTC', 'London')
  90 |   await expect(row).toBeVisible()
  91 |   await expect(row).toContainText('2024-03-10')
  92 |   await expect(row).toContainText('12:00')
  93 | })
  94 | 
```