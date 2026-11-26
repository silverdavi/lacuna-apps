# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A2] typing 2d6+3 and rolling shows Total 12 and a 2d6 row with a value between 2 and 12
- Location: tests/acceptance.spec.ts:10:1

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
  3  | test('[A1] with no input, shows heading, intro text, and empty result area', async ({ page }) => {
  4  |   await page.goto('/')
  5  |   await expect(page.getByRole('heading', { name: 'Dice Roller' })).toBeVisible()
  6  |   await expect(page.getByText('Enter a dice expression')).toBeVisible()
  7  |   await expect(page.getByText('No rolls yet')).toBeVisible()
  8  | })
  9  | 
  10 | test('[A2] typing 2d6+3 and rolling shows Total 12 and a 2d6 row with a value between 2 and 12', async ({ page }) => {
> 11 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  12 |   await page.getByLabel('Expression').fill('2d6+3')
  13 |   await page.getByRole('button', { name: 'Roll' }).click()
  14 |   await expect(page.getByText('Total: 12')).toBeVisible()
  15 |   const table = page.getByRole('table')
  16 |   await expect(table).toBeVisible()
  17 |   const row = table.locator('tr', { has: page.getByText('2d6', { exact: true }) })
  18 |   await expect(row).toBeVisible()
  19 |   const value = await row.locator('td').last().innerText()
  20 |   expect(Number(value)).toBeGreaterThanOrEqual(2)
  21 |   expect(Number(value)).toBeLessThanOrEqual(12)
  22 | })
  23 | 
  24 | test('[A3] typing 1d20 and rolling with seed 42 shows Total 15 and a 1d20 row with value 15', async ({ page }) => {
  25 |   await page.goto('/')
  26 |   await page.getByLabel('Seed').fill('42')
  27 |   await page.getByLabel('Expression').fill('1d20')
  28 |   await page.getByRole('button', { name: 'Roll' }).click()
  29 |   await expect(page.getByText('Total: 15')).toBeVisible()
  30 |   const table = page.getByRole('table')
  31 |   const row = table.locator('tr', { has: page.getByText('1d20', { exact: true }) })
  32 |   await expect(row).toBeVisible()
  33 |   await expect(row.locator('td').last()).toHaveText('15')
  34 | })
  35 | 
  36 | test('[A4] typing 3d6 and rolling with seed 7 shows Total 10 and three d6 rows with values 3, 4, 3', async ({ page }) => {
  37 |   await page.goto('/')
  38 |   await page.getByLabel('Seed').fill('7')
  39 |   await page.getByLabel('Expression').fill('3d6')
  40 |   await page.getByRole('button', { name: 'Roll' }).click()
  41 |   await expect(page.getByText('Total: 10')).toBeVisible()
  42 |   const table = page.getByRole('table')
  43 |   const rows = table.locator('tr', { has: page.getByText('d6', { exact: true }) })
  44 |   await expect(rows).toHaveCount(3)
  45 |   const first = rows.nth(0)
  46 |   const second = rows.nth(1)
  47 |   const third = rows.nth(2)
  48 |   await expect(first.locator('td').last()).toHaveText('3')
  49 |   await expect(second.locator('td').last()).toHaveText('4')
  50 |   await expect(third.locator('td').last()).toHaveText('3')
  51 | })
  52 | 
  53 | test('[A5] rolling 2d6+3 then 1d10 with seed 42 shows Total 7 and only a 1d10 row with value 7', async ({ page }) => {
  54 |   await page.goto('/')
  55 |   await page.getByLabel('Seed').fill('42')
  56 |   await page.getByLabel('Expression').fill('2d6+3')
  57 |   await page.getByRole('button', { name: 'Roll' }).click()
  58 |   await page.getByLabel('Expression').fill('1d10')
  59 |   await page.getByRole('button', { name: 'Roll' }).click()
  60 |   await expect(page.getByText('Total: 7')).toBeVisible()
  61 |   const table = page.getByRole('table')
  62 |   const rows = table.locator('tr', { has: page.getByText('1d10', { exact: true }) })
  63 |   await expect(rows).toHaveCount(1)
  64 |   await expect(rows.first().locator('td').last()).toHaveText('7')
  65 | })
  66 | 
  67 | test('[A6] typing abc and rolling shows the invalid expression message and still shows No rolls yet', async ({ page }) => {
  68 |   await page.goto('/')
  69 |   await page.getByLabel('Expression').fill('abc')
  70 |   await page.getByRole('button', { name: 'Roll' }).click()
  71 |   await expect(page.getByText("Invalid expression: unknown token 'abc'")).toBeVisible()
  72 |   await expect(page.getByText('No rolls yet')).toBeVisible()
  73 | })
  74 | 
  75 | test('[A7] rolling 2d6+3 then reloading still shows Total 12 and a 2d6 row', async ({ page }) => {
  76 |   await page.goto('/')
  77 |   await page.getByLabel('Expression').fill('2d6+3')
  78 |   await page.getByRole('button', { name: 'Roll' }).click()
  79 |   await page.reload()
  80 |   await expect(page.getByText('Total: 12')).toBeVisible()
  81 |   const table = page.getByRole('table')
  82 |   const row = table.locator('tr', { has: page.getByText('2d6', { exact: true }) })
  83 |   await expect(row).toBeVisible()
  84 | })
  85 | 
  86 | test('[A8] typing 1d6, checking Crypto, and rolling with crypto seed 99 shows Total 4 and a 1d6 row with value 4', async ({ page }) => {
  87 |   await page.goto('/')
  88 |   await page.getByLabel('Crypto seed').fill('99')
  89 |   await page.getByLabel('Expression').fill('1d6')
  90 |   await page.getByLabel('Crypto').check()
  91 |   await page.getByRole('button', { name: 'Roll' }).click()
  92 |   await expect(page.getByText('Total: 4')).toBeVisible()
  93 |   const table = page.getByRole('table')
  94 |   const row = table.locator('tr', { has: page.getByText('1d6', { exact: true }) })
  95 |   await expect(row).toBeVisible()
  96 |   await expect(row.locator('td').last()).toHaveText('4')
  97 | })
  98 | 
```