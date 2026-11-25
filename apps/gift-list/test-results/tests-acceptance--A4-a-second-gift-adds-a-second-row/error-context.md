# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A4] a second gift adds a second row
- Location: tests/acceptance.spec.ts:35:1

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
  3   | async function addGift(page: Page, item: string, recipient: string, price: string) {
  4   |   await page.getByLabel('Item').fill(item)
  5   |   await page.getByLabel('Recipient').fill(recipient)
  6   |   await page.getByLabel('Price').fill(price)
  7   |   await page.getByRole('button', { name: 'Add gift' }).click()
  8   | }
  9   | 
  10  | test('[A1] shows the heading and the empty state', async ({ page }) => {
  11  |   await page.goto('/')
  12  |   await expect(page.getByRole('heading', { name: 'Gift List Tracker' })).toBeVisible()
  13  |   await expect(page.getByText('No gifts yet')).toBeVisible()
  14  | })
  15  | 
  16  | test('[A2] adds a gift and clears the empty state', async ({ page }) => {
  17  |   await page.goto('/')
  18  |   await addGift(page, 'Book', 'Alice', '15')
  19  |   await expect(page.getByText('No gifts yet')).toHaveCount(0)
  20  |   const row = page.getByRole('table').getByRole('row', { name: /Book/ })
  21  |   await expect(row).toContainText('Alice')
  22  |   await expect(row).toContainText('$15.00')
  23  |   await expect(row).toContainText('Pending')
  24  | })
  25  | 
  26  | test('[A3] marking a gift purchased toggles the status and the button label', async ({ page }) => {
  27  |   await page.goto('/')
  28  |   await addGift(page, 'Book', 'Alice', '15')
  29  |   await page.getByRole('button', { name: 'Mark purchased' }).click()
  30  |   const row = page.getByRole('table').getByRole('row', { name: /Book/ })
  31  |   await expect(row).toContainText('Purchased')
  32  |   await expect(row).toContainText('Mark pending')
  33  | })
  34  | 
  35  | test('[A4] a second gift adds a second row', async ({ page }) => {
> 36  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  37  |   await addGift(page, 'Book', 'Alice', '15')
  38  |   await addGift(page, 'Toy', 'Bob', '20')
  39  |   await expect(page.getByRole('table').getByRole('row')).toHaveCount(2)
  40  | })
  41  | 
  42  | test('[A5] the filter chips show only the matching rows', async ({ page }) => {
  43  |   await page.goto('/')
  44  |   await addGift(page, 'Book', 'Alice', '15')
  45  |   await addGift(page, 'Toy', 'Bob', '20')
  46  |   const purchased = page.getByRole('button', { name: 'Purchased' })
  47  |   const all = page.getByRole('button', { name: 'All' })
  48  |   await purchased.click()
  49  |   await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toHaveCount(0)
  50  |   await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toBeVisible()
  51  |   await all.click()
  52  |   await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toBeVisible()
  53  |   await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toBeVisible()
  54  | })
  55  | 
  56  | test('[A6] the search box filters to matching rows', async ({ page }) => {
  57  |   await page.goto('/')
  58  |   await addGift(page, 'Book', 'Alice', '15')
  59  |   await addGift(page, 'Toy', 'Bob', '20')
  60  |   const search = page.getByLabel('Search')
  61  |   await search.fill('Alice')
  62  |   await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toBeVisible()
  63  |   await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toHaveCount(0)
  64  |   await search.fill('')
  65  |   await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toBeVisible()
  66  |   await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toBeVisible()
  67  | })
  68  | 
  69  | test('[A7] exports a CSV with the header and the purchased row', async ({ page }) => {
  70  |   await page.goto('/')
  71  |   await addGift(page, 'Book', 'Alice', '15')
  72  |   await page.getByRole('button', { name: 'Mark purchased' }).click()
  73  |   const [download] = await Promise.all([
  74  |     page.waitForEvent('download'),
  75  |     page.getByRole('button', { name: 'Export CSV' }).click(),
  76  |   ])
  77  |   expect(download.suggestedFilename()).toBe('gifts.csv')
  78  |   const stream = await download.createReadStream()
  79  |   const chunks: Buffer[] = []
  80  |   for await (const chunk of stream) chunks.push(chunk as Buffer)
  81  |   const csv = Buffer.concat(chunks).toString('utf8')
  82  |   expect(csv).toContain('Item,Recipient,Price,Status')
  83  |   expect(csv).toContain('Book,Alice,15.00,Purchased')
  84  | })
  85  | 
  86  | test('[A8] deleting a gift removes the row', async ({ page }) => {
  87  |   await page.goto('/')
  88  |   await addGift(page, 'Book', 'Alice', '15')
  89  |   await addGift(page, 'Toy', 'Bob', '20')
  90  |   await page.getByRole('button', { name: 'Delete Book' }).click()
  91  |   await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toHaveCount(0)
  92  |   await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toBeVisible()
  93  | })
  94  | 
  95  | test('[A9] reload keeps the gift', async ({ page }) => {
  96  |   await page.goto('/')
  97  |   await addGift(page, 'Book', 'Alice', '15')
  98  |   await addGift(page, 'Toy', 'Bob', '20')
  99  |   await page.getByRole('button', { name: 'Delete Book' }).click()
  100 |   await page.reload()
  101 |   const row = page.getByRole('table').getByRole('row', { name: /Toy/ })
  102 |   await expect(row).toContainText('Bob')
  103 |   await expect(row).toContainText('Pending')
  104 |   await expect(row).toContainText('$20.00')
  105 | })
  106 | 
```