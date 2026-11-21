# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/scenarios.spec.ts >> summary reflects a zero-interest loan exactly
- Location: tests/scenarios.spec.ts:4:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | // Feature tests for the mortgage calculator beyond the locked acceptance checks.
  2  | import { expect, test } from '@playwright/test'
  3  | 
  4  | test('summary reflects a zero-interest loan exactly', async ({ page }) => {
> 5  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6  |   await page.getByLabel('Interest rate').fill('0')
  7  |   await page.getByRole('button', { name: 'Calculate' }).click()
  8  |   await expect(page.getByRole('cell', { name: '$1,920.00' }).first()).toBeVisible() // 230400 / 120
  9  |   await expect(page.getByText('Total interest')).toBeVisible()
  10 |   await expect(page.getByText('$0.00').first()).toBeVisible()
  11 | })
  12 | 
  13 | test('a saved scenario can be deleted and the list empties', async ({ page }) => {
  14 |   await page.goto('/')
  15 |   await page.getByRole('button', { name: 'Save scenario' }).click()
  16 |   await expect(page.getByLabel('Saved scenarios').getByText('$1,516.96').first()).toBeVisible()
  17 |   await page.getByRole('button', { name: /Delete/ }).click()
  18 |   await expect(page.getByText('No saved scenarios yet')).toBeVisible()
  19 | })
  20 | 
  21 | test('term longer than 50 is rejected with an error', async ({ page }) => {
  22 |   await page.goto('/')
  23 |   await page.getByLabel('Term').fill('55')
  24 |   await page.getByRole('button', { name: 'Calculate' }).click()
  25 |   await expect(page.getByText('Term must be a whole number of years between 1 and 50')).toBeVisible()
  26 |   await expect(page.getByText('Loan amount')).toBeHidden()
  27 | })
  28 | 
  29 | test('year-by-year card lists the payoff table', async ({ page }) => {
  30 |   await page.goto('/')
  31 |   const table = page.getByLabel('Year-by-year payoff')
  32 |   await expect(table).toBeVisible()
  33 |   await expect(table.getByRole('cell', { name: 'Year 1' }).first()).toBeVisible()
  34 |   await expect(table.getByText('$0.00').last()).toBeVisible()
  35 | })
  36 | 
```