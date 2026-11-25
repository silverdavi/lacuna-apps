# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A6] "Clear History" removes "Today: 1" and shows "No history yet"
- Location: tests/acceptance.spec.ts:45:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test'
  2  | 
  3  | async function setGoal(page: Page, value: string) {
  4  |   await page.getByLabel('Daily Goal').fill(value)
  5  |   await page.getByRole('button', { name: 'Save' }).click()
  6  | }
  7  | 
  8  | test('[A1] the page displays the heading "Tally Counter"', async ({ page }) => {
  9  |   await page.goto('/')
  10 |   await expect(page.getByRole('heading', { name: 'Tally Counter' })).toBeVisible()
  11 | })
  12 | 
  13 | test('[A2] clicking "Add" increments the counter display from "0" to "1"', async ({ page }) => {
  14 |   await page.goto('/')
  15 |   await expect(page.getByText('0', { exact: true })).toBeVisible()
  16 |   await page.getByRole('button', { name: 'Add' }).click()
  17 |   await expect(page.getByText('1', { exact: true })).toBeVisible()
  18 | })
  19 | 
  20 | test('[A3] setting the daily goal to 10 updates the progress indicator to "1/10"', async ({ page }) => {
  21 |   await page.goto('/')
  22 |   await page.getByRole('button', { name: 'Add' }).click()
  23 |   await setGoal(page, '10')
  24 |   await expect(page.getByText('1/10', { exact: true })).toBeVisible()
  25 | })
  26 | 
  27 | test('[A4] clicking "Reset" changes the counter to "0" and the progress indicator to "0/10"', async ({
  28 |   page,
  29 | }) => {
  30 |   await page.goto('/')
  31 |   await page.getByRole('button', { name: 'Add' }).click()
  32 |   await setGoal(page, '10')
  33 |   await page.getByRole('button', { name: 'Reset' }).click()
  34 |   await expect(page.getByText('0', { exact: true })).toBeVisible()
  35 |   await expect(page.getByText('0/10', { exact: true })).toBeVisible()
  36 | })
  37 | 
  38 | test('[A5] the "History" tab shows a list containing "Today: 1"', async ({ page }) => {
  39 |   await page.goto('/')
  40 |   await page.getByRole('button', { name: 'Add' }).click()
  41 |   await page.getByRole('tab', { name: 'History' }).click()
  42 |   await expect(page.getByRole('listitem', { name: 'Today: 1' })).toBeVisible()
  43 | })
  44 | 
  45 | test('[A6] "Clear History" removes "Today: 1" and shows "No history yet"', async ({ page }) => {
> 46 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  47 |   await page.getByRole('button', { name: 'Add' }).click()
  48 |   await page.getByRole('tab', { name: 'History' }).click()
  49 |   await page.getByRole('button', { name: 'Clear History' }).click()
  50 |   await expect(page.getByText('Today: 1')).toHaveCount(0)
  51 |   await expect(page.getByText('No history yet')).toBeVisible()
  52 | })
  53 | 
  54 | test('[A7] the heatmap in the "History" tab shows a cell with title "Today: 1"', async ({ page }) => {
  55 |   await page.goto('/')
  56 |   await page.getByRole('button', { name: 'Add' }).click()
  57 |   await page.getByRole('tab', { name: 'History' }).click()
  58 |   // Read-only after a user action: some element must carry the pinned title.
  59 |   const titles = await page.evaluate(() =>
  60 |     Array.from(document.querySelectorAll('[title]')).map((el) => el.getAttribute('title') ?? ''),
  61 |   )
  62 |   expect(titles, 'a heatmap cell has the title "Today: 1"').toContain('Today: 1')
  63 | })
  64 | 
  65 | test('[A8] the trend chart in the "History" tab shows a data point with the value "1"', async ({
  66 |   page,
  67 | }) => {
  68 |   await page.goto('/')
  69 |   await page.getByRole('button', { name: 'Add' }).click()
  70 |   await page.getByRole('tab', { name: 'History' }).click()
  71 |   // Read-only after a user action: the only value charted is the single count of 1.
  72 |   const point = await page.evaluate(() => {
  73 |     const byText = Array.from(document.querySelectorAll('text, tspan, circle, rect, path, line')).find(
  74 |       (el) => (el.textContent ?? '').trim() === '1',
  75 |     )
  76 |     if (byText) return true
  77 |     const points = document.querySelectorAll(
  78 |       'circle, rect, [data-value], [aria-valuenow], [aria-valuetext]',
  79 |     )
  80 |     return Array.from(points).some((el) => {
  81 |       const v = el.getAttribute('data-value') ?? el.getAttribute('aria-valuenow') ?? el.getAttribute('aria-valuetext')
  82 |       return v === '1'
  83 |     })
  84 |   })
  85 |   expect(point, 'the trend chart has a data point with the value "1"').toBe(true)
  86 | })
  87 | 
  88 | test('[A9] reload keeps the counter "1" and the daily goal "10" visible in the main view', async ({
  89 |   page,
  90 | }) => {
  91 |   await page.goto('/')
  92 |   await page.getByRole('button', { name: 'Add' }).click()
  93 |   await setGoal(page, '10')
  94 |   await page.reload()
  95 |   await expect(page.getByText('1', { exact: true })).toBeVisible()
  96 |   await expect(page.getByLabel('Daily Goal')).toHaveValue('10')
  97 | })
  98 | 
```