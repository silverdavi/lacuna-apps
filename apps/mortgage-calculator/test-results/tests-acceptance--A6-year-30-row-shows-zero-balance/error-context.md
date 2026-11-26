# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A6] year 30 row shows zero balance
- Location: tests/acceptance.spec.ts:53:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | // Acceptance tests for the mortgage-calculator app.
  2  | // Derived from the spec's acceptance checks A1–A9; expected values copied verbatim.
  3  | import { expect, test } from '@playwright/test'
  4  | 
  5  | test('[A1] first-open defaults and result summary', async ({ page }) => {
  6  |   await page.goto('/')
  7  |   await expect(page.getByLabel('Home price')).toHaveValue('300000')
  8  |   await expect(page.getByLabel('Down payment')).toHaveValue('60000')
  9  |   await expect(page.getByLabel('Interest rate')).toHaveValue('6.5')
  10 |   await expect(page.getByLabel('Term')).toHaveValue('30')
  11 |   await expect(page.getByText('Loan amount')).toBeVisible()
  12 |   await expect(page.getByText('$240,000.00')).toBeVisible()
  13 |   await expect(page.getByText('Monthly payment')).toBeVisible()
  14 |   await expect(page.getByText('$1,516.96')).toBeVisible()
  15 |   await expect(page.getByText('Total interest')).toBeVisible()
  16 |   await expect(page.getByText('$306,106.77')).toBeVisible()
  17 | })
  18 | 
  19 | test('[A2] home price 500000 updates summary', async ({ page }) => {
  20 |   await page.goto('/')
  21 |   await page.getByLabel('Home price').fill('500000')
  22 |   await page.getByRole('button', { name: 'Calculate' }).click()
  23 |   await expect(page.getByText('$440,000.00')).toBeVisible()
  24 |   await expect(page.getByText('$2,781.10')).toBeVisible()
  25 | })
  26 | 
  27 | test('[A3] down payment 100000 updates summary', async ({ page }) => {
  28 |   await page.goto('/')
  29 |   await page.getByLabel('Down payment').fill('100000')
  30 |   await page.getByRole('button', { name: 'Calculate' }).click()
  31 |   await expect(page.getByText('$200,000.00')).toBeVisible()
  32 |   await expect(page.getByText('$1,264.14')).toBeVisible()
  33 | })
  34 | 
  35 | test('[A4] term 15 updates summary', async ({ page }) => {
  36 |   await page.goto('/')
  37 |   await page.getByLabel('Term').fill('15')
  38 |   await page.getByRole('button', { name: 'Calculate' }).click()
  39 |   await expect(page.getByText('$2,090.66')).toBeVisible()
  40 |   await expect(page.getByText('$136,318.38')).toBeVisible()
  41 | })
  42 | 
  43 | test('[A5] yearly table year-1 row shows correct values', async ({ page }) => {
  44 |   await page.goto('/')
  45 |   // Identify the year-1 row by its label/value; assert the three spec values.
  46 |   const year1 = page.getByText('$237,317.46')
  47 |   await expect(year1).toBeVisible()
  48 |   // The same row also carries the principal and interest figures.
  49 |   await expect(page.getByText('$2,682.54')).toBeVisible()
  50 |   await expect(page.getByText('$15,521.02')).toBeVisible()
  51 | })
  52 | 
  53 | test('[A6] year 30 row shows zero balance', async ({ page }) => {
> 54 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  55 |   // The last yearly row (year 30) is identified by its $0.00 balance.
  56 |   await expect(page.getByText('$0.00')).toBeVisible()
  57 | })
  58 | 
  59 | test('[A7] home price 0 shows error and hides summary', async ({ page }) => {
  60 |   await page.goto('/')
  61 |   await page.getByLabel('Home price').fill('0')
  62 |   await page.getByRole('button', { name: 'Calculate' }).click()
  63 |   await expect(page.getByText('Home price must be greater than 0')).toBeVisible()
  64 |   await expect(page.getByText('Loan amount')).toBeHidden()
  65 | })
  66 | 
  67 | test('[A8] save scenario adds row, empty state before first save', async ({ page }) => {
  68 |   await page.goto('/')
  69 |   // A fresh app has no saved scenarios yet.
  70 |   await expect(page.getByText('No saved scenarios yet')).toBeVisible()
  71 |   await page.getByRole('button', { name: 'Save scenario' }).click()
  72 |   const list = page.getByLabel('Saved scenarios')
  73 |   await expect(list).toBeVisible()
  74 |   await expect(list.getByText('$1,516.96')).toBeVisible()
  75 | })
  76 | 
  77 | test('[A9] reload keeps last calculation and saved scenario', async ({ page }) => {
  78 |   await page.goto('/')
  79 |   await page.getByLabel('Home price').fill('500000')
  80 |   await page.getByLabel('Down payment').fill('100000')
  81 |   await page.getByLabel('Term').fill('20')
  82 |   await page.getByRole('button', { name: 'Calculate' }).click()
  83 |   await page.getByRole('button', { name: 'Save scenario' }).click()
  84 |   await page.reload()
  85 |   await expect(page.getByText('$2,982.29')).toBeVisible()
  86 |   const list = page.getByLabel('Saved scenarios')
  87 |   await expect(list.getByText('$2,982.29')).toBeVisible()
  88 | })
  89 | 
```