# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A4] adding Milk with an expiration date of yesterday shows an Expired badge
- Location: tests/acceptance.spec.ts:61:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Locator, type Page } from '@playwright/test'
  2   | 
  3   | const today = () => {
  4   |   const d = new Date()
  5   |   const p = (n: number) => String(n).padStart(2, '0')
  6   |   return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  7   | }
  8   | const shiftDay = (days: number) => {
  9   |   const d = new Date()
  10  |   d.setDate(d.getDate() + days)
  11  |   const p = (n: number) => String(n).padStart(2, '0')
  12  |   return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  13  | }
  14  | const oliveRow = (page: Page): Locator => page.getByRole('row', { name: /Olive Oil/ })
  15  | const milkRow = (page: Page): Locator => page.getByRole('row', { name: /Milk/ })
  16  | 
  17  | async function addOliveOil(page: Page) {
  18  |   await page.getByLabel('Item name', { exact: true }).fill('Olive Oil')
  19  |   await page.getByLabel('Quantity', { exact: true }).fill('2')
  20  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'bottles' })
  21  |   await page.getByRole('button', { name: 'Add item', exact: true }).click()
  22  | }
  23  | 
  24  | async function addMilk(page: Page, expiration: string) {
  25  |   await page.getByLabel('Item name', { exact: true }).fill('Milk')
  26  |   await page.getByLabel('Quantity', { exact: true }).fill('1')
  27  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'carton' })
  28  |   await page.getByLabel('Expiration date', { exact: true }).fill(expiration)
  29  |   await page.getByRole('button', { name: 'Add item', exact: true }).click()
  30  | }
  31  | 
  32  | test('[A1] the empty app shows the heading and the no-items text', async ({ page }) => {
  33  |   await page.goto('/')
  34  |   await expect(page.getByRole('heading', { name: 'Pantry Inventory', exact: true })).toBeVisible()
  35  |   await expect(page.getByText('No items in your pantry yet', { exact: true })).toBeVisible()
  36  | })
  37  | 
  38  | test('[A2] adding Olive Oil 2 bottles shows a row with a Fresh badge and removes the no-items text', async ({ page }) => {
  39  |   await page.goto('/')
  40  |   await addOliveOil(page)
  41  |   const row = oliveRow(page)
  42  |   await expect(row).toBeVisible()
  43  |   await expect(row).toContainText('Olive Oil')
  44  |   await expect(row).toContainText('2 bottles')
  45  |   await expect(row.getByText('Fresh', { exact: true })).toBeVisible()
  46  |   await expect(page.getByText('No items in your pantry yet', { exact: true })).toBeHidden()
  47  | })
  48  | 
  49  | test('[A3] editing Olive Oil back to 5 bottles pre-fills the form and updates the row', async ({ page }) => {
  50  |   await page.goto('/')
  51  |   await addOliveOil(page)
  52  |   await oliveRow(page).getByRole('button', { name: 'Edit', exact: true }).click()
  53  |   await expect(page.getByLabel('Item name', { exact: true })).toHaveValue('Olive Oil')
  54  |   await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('2')
  55  |   await expect(page.getByLabel('Unit', { exact: true })).toHaveValue('bottles')
  56  |   await page.getByLabel('Quantity', { exact: true }).fill('5')
  57  |   await page.getByRole('button', { name: 'Save', exact: true }).click()
  58  |   await expect(oliveRow(page)).toContainText('5 bottles')
  59  | })
  60  | 
  61  | test('[A4] adding Milk with an expiration date of yesterday shows an Expired badge', async ({ page }) => {
> 62  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  63  |   await addMilk(page, shiftDay(-1))
  64  |   await expect(milkRow(page)).toContainText('Expired')
  65  | })
  66  | 
  67  | test('[A5] the Status filter hides and shows rows', async ({ page }) => {
  68  |   await page.goto('/')
  69  |   await addOliveOil(page)
  70  |   await addMilk(page, shiftDay(-1))
  71  |   await page.getByLabel('Status', { exact: true }).selectOption({ label: 'Expired' })
  72  |   await expect(milkRow(page)).toBeVisible()
  73  |   await expect(oliveRow(page)).toBeHidden()
  74  |   await page.getByLabel('Status', { exact: true }).selectOption({ label: 'All' })
  75  |   await expect(milkRow(page)).toBeVisible()
  76  |   await expect(oliveRow(page)).toBeVisible()
  77  | })
  78  | 
  79  | test('[A6] the search box filters by item name and clears to show all rows', async ({ page }) => {
  80  |   await page.goto('/')
  81  |   await addOliveOil(page)
  82  |   await addMilk(page, today())
  83  |   await page.getByLabel('Search items', { exact: true }).fill('olive')
  84  |   await expect(oliveRow(page)).toBeVisible()
  85  |   await expect(milkRow(page)).toBeHidden()
  86  |   await page.getByLabel('Search items', { exact: true }).fill('')
  87  |   await expect(oliveRow(page)).toBeVisible()
  88  |   await expect(milkRow(page)).toBeVisible()
  89  | })
  90  | 
  91  | test('[A7] Export CSV copies the CSV string to the clipboard', async ({ page, context }) => {
  92  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  93  |   await page.goto('/')
  94  |   await addOliveOil(page)
  95  |   await page.getByRole('button', { name: 'Export CSV', exact: true }).click()
  96  |   const text = await page.evaluate(() => navigator.clipboard.readText())
  97  |   expect(text).toContain('Item name,Quantity,Unit,Expiration date,Status')
  98  |   expect(text).toContain('Olive Oil,2,bottles,,Fresh')
  99  | })
  100 | 
  101 | test('[A8] every row has a delete button and Delete Milk removes only Milk', async ({ page }) => {
  102 |   await page.goto('/')
  103 |   await addOliveOil(page)
  104 |   await addMilk(page, today())
  105 |   await expect(page.getByRole('button', { name: 'Delete Olive Oil', exact: true })).toBeVisible()
  106 |   await expect(page.getByRole('button', { name: 'Delete Milk', exact: true })).toBeVisible()
  107 |   await page.getByRole('button', { name: 'Delete Milk', exact: true }).click()
  108 |   await expect(milkRow(page)).toHaveCount(0)
  109 |   await expect(oliveRow(page)).toBeVisible()
  110 | })
  111 | 
  112 | test('[A9] Olive Oil keeps its quantity and Fresh status after a full reload', async ({ page }) => {
  113 |   await page.goto('/')
  114 |   await addOliveOil(page)
  115 |   await page.reload()
  116 |   const row = oliveRow(page)
  117 |   await expect(row).toBeVisible()
  118 |   await expect(row).toContainText('Olive Oil')
  119 |   await expect(row).toContainText('2 bottles')
  120 |   await expect(row.getByText('Fresh', { exact: true })).toBeVisible()
  121 | })
  122 | 
```