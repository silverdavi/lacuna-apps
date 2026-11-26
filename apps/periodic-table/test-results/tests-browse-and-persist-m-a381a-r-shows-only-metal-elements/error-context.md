# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/browse-and-persist.spec.ts >> metals filter shows only metal elements
- Location: tests/browse-and-persist.spec.ts:26:1

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
  3  | test('selecting an element persists it across a reload', async ({ page }) => {
  4  |   await page.goto('/')
  5  |   await page.getByLabel('Search elements').fill('Lith')
  6  |   const table = page.getByRole('table', { name: 'Element results' })
  7  |   await table.getByRole('row', { name: 'Lithium' }).click()
  8  |   await expect(table.getByRole('cell', { name: 'Li' })).toBeVisible()
  9  |   await expect(table.getByRole('cell', { name: 'Lithium' })).toBeVisible()
  10 |   await page.reload()
  11 |   await expect(page.getByRole('cell', { name: 'Li' })).toBeVisible()
  12 |   await expect(page.getByRole('cell', { name: 'Lithium' })).toBeVisible()
  13 | })
  14 | 
  15 | test('clearing the search shows all elements', async ({ page }) => {
  16 |   await page.goto('/')
  17 |   await page.getByLabel('Search elements').fill('Hel')
  18 |   await expect(page.getByRole('cell', { name: 'He' })).toBeVisible()
  19 |   await page.getByLabel('Search elements').fill('')
  20 |   await expect(page.getByRole('cell', { name: 'H' })).toBeVisible()
  21 |   await expect(page.getByRole('cell', { name: 'Hydrogen' })).toBeVisible()
  22 |   await expect(page.getByRole('cell', { name: 'Zn' })).toBeVisible()
  23 |   await expect(page.getByRole('cell', { name: 'Zinc' })).toBeVisible()
  24 | })
  25 | 
  26 | test('metals filter shows only metal elements', async ({ page }) => {
> 27 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  28 |   await page.getByRole('checkbox', { name: 'Show only metals' }).check()
  29 |   await expect(page.getByRole('cell', { name: 'Li' })).toBeVisible()
  30 |   await expect(page.getByRole('cell', { name: 'Fe' })).toBeVisible()
  31 |   await expect(page.getByRole('cell', { name: 'Zn' })).toBeVisible()
  32 |   await expect(page.getByRole('cell', { name: 'H' })).toBeHidden()
  33 |   await expect(page.getByRole('cell', { name: 'C' })).toBeHidden()
  34 | })
  35 | 
  36 | test('copy details copies the exact element text', async ({ page }) => {
  37 |   await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  38 |   await page.goto('/')
  39 |   await page.getByLabel('Search elements').fill('Zinc')
  40 |   const table = page.getByRole('table', { name: 'Element results' })
  41 |   await table.getByRole('row', { name: 'Zinc' }).click()
  42 |   await page.getByRole('button', { name: 'Copy details' }).click()
  43 |   const text = await page.evaluate(() => navigator.clipboard.readText())
  44 |   expect(text).toBe('Zinc (Zn) | Metal | 65.38')
  45 | })
  46 | 
  47 | test('selecting an element shows it in the details grid', async ({ page }) => {
  48 |   await page.goto('/')
  49 |   await page.getByLabel('Search elements').fill('Copper')
  50 |   const table = page.getByRole('table', { name: 'Element results' })
  51 |   await table.getByRole('row', { name: 'Copper' }).click()
  52 |   const details = page.getByRole('table', { name: 'Element details' })
  53 |   await expect(details.getByRole('cell', { name: 'Cu' })).toBeVisible()
  54 |   await expect(details.getByRole('cell', { name: 'Copper' })).toBeVisible()
  55 |   await expect(details.getByRole('cell', { name: 'Metal' })).toBeVisible()
  56 | })
  57 | 
```