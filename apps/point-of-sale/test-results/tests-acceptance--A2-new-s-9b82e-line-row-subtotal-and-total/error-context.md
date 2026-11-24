# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A2] new sale form computes line row, subtotal, and total
- Location: tests/acceptance.spec.ts:34:1

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
  3   | async function addLineItem(page: Page) {
  4   |   await page.getByRole('button', { name: 'New sale' }).click()
  5   |   await page.getByLabel('Item').selectOption('Widget')
  6   |   await page.getByLabel('Quantity').fill('2')
  7   |   await page.getByLabel('Unit price').fill('10.00')
  8   |   await page.getByLabel('Discount').fill('5')
  9   |   await page.getByLabel('Tax rate').fill('10')
  10  |   await page.getByRole('button', { name: 'Add line' }).click()
  11  | }
  12  | 
  13  | async function addWidgetStock(page: Page, stock: string) {
  14  |   await page.getByRole('tab', { name: 'Inventory' }).click()
  15  |   await page.getByRole('button', { name: 'Add item' }).click()
  16  |   await page.getByLabel('Name').fill('Widget')
  17  |   await page.getByLabel('Stock').fill(stock)
  18  |   await page.getByLabel('Price').fill('10.00')
  19  |   await page.getByRole('button', { name: 'Save' }).click()
  20  | }
  21  | 
  22  | test('[A1] shows Point of Sale heading, Sales and Inventory tabs, Sales table', async ({ page }) => {
  23  |   await page.goto('/')
  24  |   await expect(page.getByRole('heading', { name: 'Point of Sale' })).toBeVisible()
  25  |   await expect(page.getByRole('tab', { name: 'Sales' })).toBeVisible()
  26  |   await expect(page.getByRole('tab', { name: 'Inventory' })).toBeVisible()
  27  |   const salesTab = page.getByRole('tab', { name: 'Sales' })
  28  |   expect(await salesTab.getAttribute('aria-selected')).toBe('true')
  29  |   for (const column of ['ID', 'Date', 'Items', 'Total', 'Actions']) {
  30  |     await expect(page.getByRole('columnheader', { name: column })).toBeVisible()
  31  |   }
  32  | })
  33  | 
  34  | test('[A2] new sale form computes line row, subtotal, and total', async ({ page }) => {
> 35  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  36  |   await addLineItem(page)
  37  |   const row = page.locator('tr', { has: page.getByRole('cell', { name: 'Widget' }) })
  38  |   await expect(row.getByRole('cell', { name: '2' })).toBeVisible()
  39  |   await expect(row.getByRole('cell', { name: '$10.00' })).toBeVisible()
  40  |   await expect(row.getByRole('cell', { name: '-$5.00' })).toBeVisible()
  41  |   await expect(row.getByRole('cell', { name: '$1.90' })).toBeVisible()
  42  |   await expect(page.getByText('$13.90')).toBeVisible()
  43  |   await expect(page.getByText('$15.80')).toBeVisible()
  44  | })
  45  | 
  46  | test('[A3] saving a sale adds an S-001 row with a View button', async ({ page }) => {
  47  |   await page.goto('/')
  48  |   await addLineItem(page)
  49  |   await page.getByRole('button', { name: 'Save sale' }).click()
  50  |   const row = page.locator('tr', { has: page.getByRole('cell', { name: 'S-001' }) })
  51  |   await expect(row.getByRole('cell', { name: '2024-01-15' })).toBeVisible()
  52  |   await expect(row.getByRole('cell', { name: '1' })).toBeVisible()
  53  |   await expect(row.getByRole('cell', { name: '$15.80' })).toBeVisible()
  54  |   await expect(row.getByRole('button', { name: 'View' })).toBeVisible()
  55  |   await expect(page.getByText('No sales yet')).toHaveCount(0)
  56  | })
  57  | 
  58  | test('[A4] add item form saves a Widget row with stock and price', async ({ page }) => {
  59  |   await page.goto('/')
  60  |   await addWidgetStock(page, '100')
  61  |   await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
  62  |   await expect(page.getByRole('columnheader', { name: 'Stock' })).toBeVisible()
  63  |   await expect(page.getByRole('columnheader', { name: 'Price' })).toBeVisible()
  64  |   await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible()
  65  |   const row = page.locator('tr', { has: page.getByRole('cell', { name: 'Widget' }) })
  66  |   await expect(row.getByRole('cell', { name: '100' })).toBeVisible()
  67  |   await expect(row.getByRole('cell', { name: '$10.00' })).toBeVisible()
  68  | })
  69  | 
  70  | test('[A5] editing an item prefills the form and saves a new stock value', async ({ page }) => {
  71  |   await page.goto('/')
  72  |   await addWidgetStock(page, '100')
  73  |   const row = page.locator('tr', { has: page.getByRole('cell', { name: 'Widget' }) })
  74  |   await row.getByRole('button', { name: 'Edit' }).click()
  75  |   await expect(page.getByLabel('Name')).toHaveValue('Widget')
  76  |   await expect(page.getByLabel('Stock')).toHaveValue('100')
  77  |   await expect(page.getByLabel('Price')).toHaveValue('10.00')
  78  |   await page.getByLabel('Stock').fill('85')
  79  |   await page.getByRole('button', { name: 'Save' }).click()
  80  |   await expect(page.locator('tr', { has: page.getByRole('cell', { name: 'Widget' }) }))
  81  |     .getByRole('cell', { name: '85' })
  82  |     .toBeVisible()
  83  | })
  84  | 
  85  | test('[A6] viewing sale S-001 shows the line item detail panel', async ({ page }) => {
  86  |   await page.goto('/')
  87  |   await addLineItem(page)
  88  |   await page.getByRole('button', { name: 'Save sale' }).click()
  89  |   await page.locator('tr', { has: page.getByRole('cell', { name: 'S-001' }) })
  90  |     .getByRole('button', { name: 'View' })
  91  |     .click()
  92  |   for (const text of ['Widget', '$10.00', '-$5.00', '$1.90', '$13.90', '$15.80']) {
  93  |     await expect(page.getByText(text)).toBeVisible()
  94  |   }
  95  | })
  96  | 
  97  | test('[A7] search filters inventory rows and clearing restores them', async ({ page }) => {
  98  |   await page.goto('/')
  99  |   await addWidgetStock(page, '100')
  100 |   await page.getByRole('tab', { name: 'Inventory' }).click()
  101 |   await page.getByRole('button', { name: 'Add item' }).click()
  102 |   await page.getByLabel('Name').fill('Gadget')
  103 |   await page.getByLabel('Stock').fill('5')
  104 |   await page.getByLabel('Price').fill('3.00')
  105 |   await page.getByRole('button', { name: 'Save' }).click()
  106 |   await expect(page.getByRole('cell', { name: 'Widget' })).toBeVisible()
  107 |   await expect(page.getByRole('cell', { name: 'Gadget' })).toBeVisible()
  108 |   await page.getByLabel('Search').fill('Wid')
  109 |   await expect(page.getByRole('cell', { name: 'Widget' })).toBeVisible()
  110 |   await expect(page.getByRole('cell', { name: 'Gadget' })).toHaveCount(0)
  111 |   await page.getByLabel('Search').fill('')
  112 |   await expect(page.getByRole('cell', { name: 'Gadget' })).toBeVisible()
  113 | })
  114 | 
  115 | test('[A8] export csv downloads sales with header and S-001 row', async ({ page }) => {
  116 |   await page.goto('/')
  117 |   await addLineItem(page)
  118 |   await page.getByRole('button', { name: 'Save sale' }).click()
  119 |   const [download] = await Promise.all([
  120 |     page.waitForEvent('download'),
  121 |     page.getByRole('button', { name: 'Export CSV' }).click(),
  122 |   ])
  123 |   const path = await download.path()
  124 |   const fs = await import('node:fs')
  125 |   const content = fs.readFileSync(path, 'utf8')
  126 |   expect(content).toContain('ID,Date,Items,Total')
  127 |   expect(content).toContain('S-001,2024-01-15,1,15.80')
  128 | })
  129 | 
  130 | test('[A9] reload keeps the saved sale', async ({ page }) => {
  131 |   await page.goto('/')
  132 |   await addLineItem(page)
  133 |   await page.getByRole('button', { name: 'Save sale' }).click()
  134 |   await expect(page.getByRole('cell', { name: 'S-001' })).toBeVisible()
  135 |   await page.reload()
```