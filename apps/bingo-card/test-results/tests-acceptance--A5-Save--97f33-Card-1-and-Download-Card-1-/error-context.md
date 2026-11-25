# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A5] Save card adds a list item with "Card 1" and "Download Card 1"
- Location: tests/acceptance.spec.ts:35:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | const setup = async (page: import('@playwright/test').Page) => {
> 4  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   await page.getByLabel('Seed').fill('100')
  6  |   await page.getByLabel('Min').fill('1')
  7  |   await page.getByLabel('Max').fill('75')
  8  |   await page.getByLabel('Grid size').selectOption({ label: '5x5' })
  9  |   await page.getByRole('button', { name: 'Generate card' }).click()
  10 | }
  11 | 
  12 | test('[A1] page heading is "Bingo Card Generator"', async ({ page }) => {
  13 |   await page.goto('/')
  14 |   await expect(page.getByRole('heading', { name: 'Bingo Card Generator' })).toBeVisible()
  15 | })
  16 | 
  17 | test('[A2] center cell of a 5x5 card contains "FREE"', async ({ page }) => {
  18 |   await setup(page)
  19 |   const cells = page.locator('table td')
  20 |   await expect(cells.nth(12)).toHaveText('FREE')
  21 | })
  22 | 
  23 | test('[A3] top-left cell of a 5x5 card contains "12"', async ({ page }) => {
  24 |   await setup(page)
  25 |   const cells = page.locator('table td')
  26 |   await expect(cells.nth(0)).toHaveText('12')
  27 | })
  28 | 
  29 | test('[A4] bottom-right cell of a 5x5 card contains "68"', async ({ page }) => {
  30 |   await setup(page)
  31 |   const cells = page.locator('table td')
  32 |   await expect(cells.nth(24)).toHaveText('68')
  33 | })
  34 | 
  35 | test('[A5] Save card adds a list item with "Card 1" and "Download Card 1"', async ({ page }) => {
  36 |   await setup(page)
  37 |   await page.getByRole('button', { name: 'Save card' }).click()
  38 |   const item = page.getByRole('listitem')
  39 |   await expect(item).toContainText('Card 1')
  40 |   await expect(page.getByRole('button', { name: 'Download Card 1' })).toBeVisible()
  41 | })
  42 | 
  43 | test('[A6] Print button opens the browser print dialog', async ({ page }) => {
  44 |   await setup(page)
  45 |   await page.getByRole('button', { name: 'Print' }).click()
  46 |   // The browser's print dialog cannot be directly asserted; assert the action
  47 |   // did not throw and the page is still interactive.
  48 |   await expect(page.getByRole('button', { name: 'Generate card' })).toBeEnabled()
  49 | })
  50 | 
  51 | test('[A7] Copy numbers shows a "Numbers copied to clipboard" toast', async ({ page }) => {
  52 |   await setup(page)
  53 |   await page.getByRole('button', { name: 'Copy numbers' }).click()
  54 |   await expect(page.getByText('Numbers copied to clipboard')).toBeVisible()
  55 | })
  56 | 
  57 | test('[A8] Delete Card 1 removes the list item', async ({ page }) => {
  58 |   await setup(page)
  59 |   await page.getByRole('button', { name: 'Save card' }).click()
  60 |   await expect(page.getByRole('listitem')).toContainText('Card 1')
  61 |   await page.getByRole('button', { name: 'Delete Card 1' }).click()
  62 |   await expect(page.getByRole('listitem')).toHaveCount(0)
  63 | })
  64 | 
  65 | test('[A9] Saved card persists across a page reload', async ({ page }) => {
  66 |   await setup(page)
  67 |   await page.getByRole('button', { name: 'Save card' }).click()
  68 |   await page.reload()
  69 |   await expect(page.getByRole('listitem')).toContainText('Card 1')
  70 | })
  71 | 
```