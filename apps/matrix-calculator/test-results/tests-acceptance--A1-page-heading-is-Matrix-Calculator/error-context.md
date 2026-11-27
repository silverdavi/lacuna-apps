# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A1] page heading is Matrix Calculator
- Location: tests/acceptance.spec.ts:13:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | // Acceptance tests for the matrix-calculator app.
  2  | // Derived from the spec's acceptance checks A1–A8; expected values copied verbatim.
  3  | import { expect, test, type Page } from '@playwright/test'
  4  | 
  5  | const resultCell = (page: Page, r: number, c: number) =>
  6  |   page
  7  |     .getByRole('table', { name: 'Result' })
  8  |     .getByRole('row')
  9  |     .nth(r - 1)
  10 |     .getByRole('cell')
  11 |     .nth(c - 1)
  12 | 
  13 | test('[A1] page heading is Matrix Calculator', async ({ page }) => {
> 14 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  15 |   await expect(page.getByRole('heading', { name: 'Matrix Calculator' })).toBeVisible()
  16 | })
  17 | 
  18 | test('[A2] default matrices with Add show 6, 8, 10, 12 in the result table', async ({ page }) => {
  19 |   await page.goto('/')
  20 |   await expect(page.getByRole('select', { name: 'Operation' })).toHaveValue('Add')
  21 |   await expect(page.getByRole('select', { name: 'Both sizes' })).toHaveValue('2x2')
  22 |   await expect(resultCell(page, 1, 1)).toHaveText('6')
  23 |   await expect(resultCell(page, 1, 2)).toHaveText('8')
  24 |   await expect(resultCell(page, 2, 1)).toHaveText('10')
  25 |   await expect(resultCell(page, 2, 2)).toHaveText('12')
  26 | })
  27 | 
  28 | test('[A3] default matrices with Multiply show 19, 22, 43, 50 in the result table', async ({ page }) => {
  29 |   await page.goto('/')
  30 |   await page.getByRole('select', { name: 'Operation' }).selectOption({ label: 'Multiply' })
  31 |   await expect(resultCell(page, 1, 1)).toHaveText('19')
  32 |   await expect(resultCell(page, 1, 2)).toHaveText('22')
  33 |   await expect(resultCell(page, 2, 1)).toHaveText('43')
  34 |   await expect(resultCell(page, 2, 2)).toHaveText('50')
  35 | })
  36 | 
  37 | test('[A4] Copy result puts exactly "6 8 10 12" on the clipboard', async ({ page, context }) => {
  38 |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  39 |   await page.goto('/')
  40 |   await page.getByRole('button', { name: 'Copy result' }).click()
  41 |   const text = await page.evaluate(() => navigator.clipboard.readText())
  42 |   expect(text).toBe('6 8 10 12')
  43 | })
  44 | 
  45 | test('[A5] 3x3 in "Both sizes" gives three rows and columns of zero inputs and an all-zero 3x3 result', async ({ page }) => {
  46 |   await page.goto('/')
  47 |   await page.getByRole('select', { name: 'Both sizes' }).selectOption({ label: '3x3' })
  48 |   for (const m of ['A', 'B']) {
  49 |     for (let r = 1; r <= 3; r++) {
  50 |       for (let c = 1; c <= 3; c++) {
  51 |         await expect(page.getByLabel(`${m}${r}${c}`, { exact: true })).toHaveValue('0')
  52 |       }
  53 |     }
  54 |   }
  55 |   await expect(page.getByRole('table', { name: 'Result' }).getByRole('row')).toHaveCount(3)
  56 |   for (let r = 1; r <= 3; r++) {
  57 |     const row = page.getByRole('table', { name: 'Result' }).getByRole('row').nth(r - 1)
  58 |     await expect(row.getByRole('cell')).toHaveCount(3)
  59 |     for (let c = 1; c <= 3; c++) {
  60 |       await expect(row.getByRole('cell').nth(c - 1)).toHaveText('0')
  61 |     }
  62 |   }
  63 | })
  64 | 
  65 | test('[A6] changing A11 from 1 to 9 moves result (1,1) to 14; Undo restores both', async ({ page }) => {
  66 |   await page.goto('/')
  67 |   await page.getByLabel('A11', { exact: true }).fill('9')
  68 |   await expect(resultCell(page, 1, 1)).toHaveText('14')
  69 |   await page.getByRole('button', { name: 'Undo' }).click()
  70 |   await expect(page.getByLabel('A11', { exact: true })).toHaveValue('1')
  71 |   await expect(resultCell(page, 1, 1)).toHaveText('6')
  72 | })
  73 | 
  74 | test('[A7] reload keeps the Multiply operation and the edited A11 value', async ({ page }) => {
  75 |   await page.goto('/')
  76 |   await page.getByRole('select', { name: 'Operation' }).selectOption({ label: 'Multiply' })
  77 |   await page.getByLabel('A11', { exact: true }).fill('10')
  78 |   await page.reload()
  79 |   await expect(page.getByRole('select', { name: 'Operation' })).toHaveValue('Multiply')
  80 |   await expect(page.getByLabel('A11', { exact: true })).toHaveValue('10')
  81 | })
  82 | 
  83 | test('[A8] A 2x2 with B 3x3 under Multiply shows the dimension mismatch message', async ({ page }) => {
  84 |   await page.goto('/')
  85 |   await page.getByRole('select', { name: 'Operation' }).selectOption({ label: 'Multiply' })
  86 |   await page.getByRole('select', { name: 'Size B' }).selectOption({ label: '3x3' })
  87 |   await expect(page.getByText('Dimensions do not match for multiplication')).toBeVisible()
  88 |   await expect(page.getByRole('table', { name: 'Result' })).toHaveCount(0)
  89 | })
  90 | 
```