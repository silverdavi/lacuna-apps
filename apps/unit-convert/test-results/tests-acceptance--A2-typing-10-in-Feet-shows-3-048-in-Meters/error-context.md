# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A2] typing 10 in Feet shows 3.048 in Meters
- Location: tests/acceptance.spec.ts:14:1

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
  3  | async function saveConversion(page: Page, value: string) {
  4  |   await page.getByLabel('Meters').fill(value)
  5  |   await page.getByRole('button', { name: 'Save conversion', exact: true }).click()
  6  | }
  7  | 
  8  | test('[A1] typing 1 in Meters shows 3.28084 in Feet', async ({ page }) => {
  9  |   await page.goto('/')
  10 |   await page.getByLabel('Meters', { exact: true }).fill('1')
  11 |   await expect(page.getByLabel('Feet', { exact: true })).toHaveValue('3.28084')
  12 | })
  13 | 
  14 | test('[A2] typing 10 in Feet shows 3.048 in Meters', async ({ page }) => {
> 15 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  16 |   await page.getByLabel('Feet', { exact: true }).fill('10')
  17 |   await expect(page.getByLabel('Meters', { exact: true })).toHaveValue('3.048')
  18 | })
  19 | 
  20 | test('[A3] Temperature: 100 Celsius shows 212 Fahrenheit; -40 shows -40', async ({ page }) => {
  21 |   await page.goto('/')
  22 |   await page.getByRole('tab', { name: 'Temperature', exact: true }).click()
  23 |   await page.getByLabel('Celsius', { exact: true }).fill('100')
  24 |   await expect(page.getByLabel('Fahrenheit', { exact: true })).toHaveValue('212')
  25 |   await page.getByLabel('Celsius', { exact: true }).fill('-40')
  26 |   await expect(page.getByLabel('Fahrenheit', { exact: true })).toHaveValue('-40')
  27 | })
  28 | 
  29 | test('[A4] switching to Mass clears fields and hides Meters', async ({ page }) => {
  30 |   await page.goto('/')
  31 |   await page.getByLabel('Meters', { exact: true }).fill('1')
  32 |   await page.getByRole('tab', { name: 'Mass', exact: true }).click()
  33 |   await expect(page.getByLabel('Kilograms', { exact: true })).toHaveValue('')
  34 |   await expect(page.getByLabel('Pounds', { exact: true })).toHaveValue('')
  35 |   await expect(page.getByLabel('Meters', { exact: true })).toHaveCount(0)
  36 | })
  37 | 
  38 | test('[A5] Swap units puts 1 in Feet and 0.3048 in Meters', async ({ page }) => {
  39 |   await page.goto('/')
  40 |   await page.getByLabel('Meters', { exact: true }).fill('1')
  41 |   await page.getByRole('button', { name: 'Swap units', exact: true }).click()
  42 |   await expect(page.getByLabel('Feet', { exact: true })).toHaveValue('1')
  43 |   await expect(page.getByLabel('Meters', { exact: true })).toHaveValue('0.3048')
  44 | })
  45 | 
  46 | test('[A6] typing abc in Meters shows "Enter a number" and leaves Feet empty', async ({ page }) => {
  47 |   await page.goto('/')
  48 |   await page.getByLabel('Meters', { exact: true }).fill('abc')
  49 |   await expect(page.getByText('Enter a number', { exact: true })).toBeVisible()
  50 |   await expect(page.getByLabel('Feet', { exact: true })).toHaveValue('')
  51 |   const bodyText = await page.locator('body').innerText()
  52 |   expect(bodyText).not.toContain('NaN')
  53 | })
  54 | 
  55 | test('[A7] saving three conversions shows 3 recent items in order and restore works', async ({ page }) => {
  56 |   await page.goto('/')
  57 |   await saveConversion(page, '1')
  58 |   await saveConversion(page, '2')
  59 |   await saveConversion(page, '3')
  60 | 
  61 |   const items = page.getByRole('list', { name: 'Recent' }).getByRole('button')
  62 |   await expect(items).toHaveCount(3)
  63 |   await expect(items.nth(0)).toHaveText('3 Meters = 9.84252 Feet')
  64 |   await expect(items.nth(1)).toHaveText('2 Meters = 6.56168 Feet')
  65 |   await expect(items.nth(2)).toHaveText('1 Meters = 3.28084 Feet')
  66 | 
  67 |   await items.nth(2).click()
  68 |   await expect(page.getByLabel('Meters', { exact: true })).toHaveValue('1')
  69 |   await expect(page.getByLabel('Feet', { exact: true })).toHaveValue('3.28084')
  70 | })
  71 | 
  72 | test('[A8] saving 1 through 11 keeps 10 recent items', async ({ page }) => {
  73 |   await page.goto('/')
  74 |   for (let i = 1; i <= 11; i++) {
  75 |     await saveConversion(page, String(i))
  76 |   }
  77 | 
  78 |   const items = page.getByRole('list', { name: 'Recent' }).getByRole('button')
  79 |   await expect(items).toHaveCount(10)
  80 |   await expect(items.nth(0)).toHaveText('11 Meters = 36.08924 Feet')
  81 |   await expect(items.nth(1)).toHaveText('10 Meters = 32.8084 Feet')
  82 |   await expect(items.nth(9)).toHaveText('2 Meters = 6.56168 Feet')
  83 | })
  84 | 
  85 | test('[A9] recent items survive a reload', async ({ page }) => {
  86 |   await page.goto('/')
  87 |   await saveConversion(page, '1')
  88 |   await page.reload()
  89 |   const item = page.getByRole('list', { name: 'Recent' }).getByRole('button', { name: '1 Meters = 3.28084 Feet', exact: true })
  90 |   await expect(item).toHaveCount(1)
  91 | })
  92 | 
```