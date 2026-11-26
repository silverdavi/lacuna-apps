# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A9] a reload keeps x^2 in the list and the Table row x = 2 showing 4
- Location: tests/acceptance.spec.ts:97:1

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
  3   | async function plot(page: Page, expression: string) {
  4   |   await page.getByLabel('Function expression').fill(expression)
  5   |   await page.getByRole('button', { name: 'Plot function' }).click()
  6   | }
  7   | 
  8   | // The spec names the tab "Table"; in tabbed views it is a tab.
  9   | function tableTab(page: Page) {
  10  |   return page.getByRole('tab', { name: 'Table' })
  11  | }
  12  | 
  13  | function rowForX(page: Page, x: string) {
  14  |   // Rows are keyed by x; match a row whose first column is exactly the value of x
  15  |   // so "x = 2" is not confused with "x = 12".
  16  |   return page
  17  |     .getByRole('row')
  18  |     .filter({ has: page.getByRole('cell', { name: x, exact: true }).first() })
  19  | }
  20  | 
  21  | test('[A1] empty app shows the heading and the empty-state text', async ({ page }) => {
  22  |   await page.goto('/')
  23  |   await expect(page.getByRole('heading', { name: 'Graphing Calculator' })).toBeVisible()
  24  |   await expect(page.getByText('No functions plotted yet')).toBeVisible()
  25  | })
  26  | 
  27  | test('[A2] plotting x^2 adds a list item and clears the empty state', async ({ page }) => {
  28  |   await page.goto('/')
  29  |   await plot(page, 'x^2')
  30  |   await expect(page.getByRole('listitem').filter({ hasText: 'x^2' })).toContainText('x^2')
  31  |   await expect(page.getByText('No functions plotted yet')).toHaveCount(0)
  32  | })
  33  | 
  34  | test('[A3] with x^2 plotted, the Table tab shows y = 4 at x = 2', async ({ page }) => {
  35  |   await page.goto('/')
  36  |   await plot(page, 'x^2')
  37  |   await tableTab(page).click()
  38  |   const row = rowForX(page, '2')
  39  |   await expect(row).toBeVisible()
  40  |   await expect(row.getByRole('cell', { name: '4' })).toBeVisible()
  41  | })
  42  | 
  43  | test('[A4] deleting x^2 removes it and brings back the empty state', async ({ page }) => {
  44  |   await page.goto('/')
  45  |   await plot(page, 'x^2')
  46  |   await page.getByRole('button', { name: 'Delete x^2' }).click()
  47  |   await expect(page.getByRole('listitem').filter({ hasText: 'x^2' })).toHaveCount(0)
  48  |   await expect(page.getByText('No functions plotted yet')).toBeVisible()
  49  | })
  50  | 
  51  | test('[A5] plotting 2x + 1 adds a list item and the Table tab shows y = 1 at x = 0', async ({ page }) => {
  52  |   await page.goto('/')
  53  |   await plot(page, '2x + 1')
  54  |   await expect(page.getByRole('listitem').filter({ hasText: '2x + 1' })).toContainText('2x + 1')
  55  |   await tableTab(page).click()
  56  |   const row = rowForX(page, '0')
  57  |   await expect(row).toBeVisible()
  58  |   await expect(row.getByRole('cell', { name: '1' })).toBeVisible()
  59  | })
  60  | 
  61  | test('[A6] the X min and X max fields drive which rows the Table tab shows', async ({ page }) => {
  62  |   await page.goto('/')
  63  |   await plot(page, 'x^2')
  64  |   await page.getByLabel('X min').fill('-5')
  65  |   await page.getByLabel('X max').fill('5')
  66  |   await tableTab(page).click()
  67  |   const min = rowForX(page, '-5')
  68  |   await expect(min).toBeVisible()
  69  |   await expect(min.getByRole('cell', { name: '25' })).toBeVisible()
  70  |   const max = rowForX(page, '5')
  71  |   await expect(max).toBeVisible()
  72  |   await expect(max.getByRole('cell', { name: '25' })).toBeVisible()
  73  | })
  74  | 
  75  | // A7 only fixes the download name; a non-empty body follows from exporting a plot.
  76  | test('[A7] Export PNG downloads a file named graph.png', async ({ page }) => {
  77  |   await page.goto('/')
  78  |   await plot(page, 'x^2')
  79  |   const [download] = await Promise.all([
  80  |     page.waitForEvent('download'),
  81  |     page.getByRole('button', { name: 'Export PNG' }).click(),
  82  |   ])
  83  |   expect(download.suggestedFilename()).toBe('graph.png')
  84  |   expect((await download.path()) ?? '', 'download lands on disk').not.toBe('')
  85  | })
  86  | 
  87  | test('[A8] plotting log(x) adds a list item and the Table tab shows y = 0 at x = 1', async ({ page }) => {
  88  |   await page.goto('/')
  89  |   await plot(page, 'log(x)')
  90  |   await expect(page.getByRole('listitem').filter({ hasText: 'log(x)' })).toContainText('log(x)')
  91  |   await tableTab(page).click()
  92  |   const row = rowForX(page, '1')
  93  |   await expect(row).toBeVisible()
  94  |   await expect(row.getByRole('cell', { name: '0' })).toBeVisible()
  95  | })
  96  | 
  97  | test('[A9] a reload keeps x^2 in the list and the Table row x = 2 showing 4', async ({ page }) => {
> 98  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  99  |   await plot(page, 'x^2')
  100 |   await page.reload()
  101 |   await expect(page.getByRole('listitem').filter({ hasText: 'x^2' })).toBeVisible()
  102 |   await tableTab(page).click()
  103 |   const row = rowForX(page, '2')
  104 |   await expect(row).toBeVisible()
  105 |   await expect(row.getByRole('cell', { name: '4' })).toBeVisible()
  106 | })
  107 | 
```