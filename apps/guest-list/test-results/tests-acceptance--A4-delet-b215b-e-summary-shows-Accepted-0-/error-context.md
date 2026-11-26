# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A4] deleting Alice removes her row and the summary shows "Accepted: 0"
- Location: tests/acceptance.spec.ts:41:1

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
  3  | function guest(page: Page, name: string) {
  4  |   return page.locator('tr').filter({ hasText: name })
  5  | }
  6  | 
  7  | async function addGuest(page: Page, name: string, email: string, rsvp: string) {
  8  |   await page.getByLabel('Name').fill(name)
  9  |   await page.getByLabel('Email').fill(email)
  10 |   await page.getByLabel('RSVP').selectOption(rsvp)
  11 |   await page.getByRole('button', { name: 'Add guest' }).click()
  12 | }
  13 | 
  14 | test('[A1] empty app shows heading "Guest List" and "No guests yet"', async ({ page }) => {
  15 |   await page.goto('/')
  16 |   await expect(page.getByRole('heading', { name: 'Guest List' })).toBeVisible()
  17 |   await expect(page.getByText('No guests yet')).toBeVisible()
  18 | })
  19 | 
  20 | test('[A2] adding Alice shows a row with her name, email and status and clears the empty note', async ({ page }) => {
  21 |   await page.goto('/')
  22 |   await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  23 |   const row = guest(page, 'Alice')
  24 |   await expect(row).toContainText('Alice')
  25 |   await expect(row).toContainText('alice@example.com')
  26 |   await expect(row).toContainText('Accepted')
  27 |   await expect(page.getByText('No guests yet')).toHaveCount(0)
  28 | })
  29 | 
  30 | test('[A3] adding Bob adds a second row and the summary shows "Accepted: 1"', async ({ page }) => {
  31 |   await page.goto('/')
  32 |   await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  33 |   await addGuest(page, 'Bob', 'bob@example.com', 'Pending')
  34 |   const row = guest(page, 'Bob')
  35 |   await expect(row).toContainText('Bob')
  36 |   await expect(row).toContainText('bob@example.com')
  37 |   await expect(row).toContainText('Pending')
  38 |   await expect(page.getByText('Accepted: 1')).toBeVisible()
  39 | })
  40 | 
  41 | test('[A4] deleting Alice removes her row and the summary shows "Accepted: 0"', async ({ page }) => {
> 42 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  43 |   await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  44 |   await addGuest(page, 'Bob', 'bob@example.com', 'Pending')
  45 |   await page.getByRole('button', { name: 'Delete Alice' }).click()
  46 |   await expect(guest(page, 'Alice')).toHaveCount(0)
  47 |   await expect(guest(page, 'Bob')).toBeVisible()
  48 |   await expect(page.getByText('Accepted: 0')).toBeVisible()
  49 | })
  50 | 
  51 | test('[A5] clicking the Name column header sorts rows alphabetically by name', async ({ page }) => {
  52 |   await page.goto('/')
  53 |   await addGuest(page, 'Bob', 'bob@example.com', 'Pending')
  54 |   await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  55 |   await page.getByRole('columnheader', { name: 'Name' }).click()
  56 |   const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
  57 |   await expect(rows.nth(0)).toContainText('Alice')
  58 |   await expect(rows.nth(1)).toContainText('Bob')
  59 | })
  60 | 
  61 | test('[A6] Export CSV shows the toast "CSV exported"', async ({ page }) => {
  62 |   await page.goto('/')
  63 |   await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  64 |   await page.getByRole('button', { name: 'Export CSV' }).click()
  65 |   await expect(page.getByText('CSV exported')).toBeVisible()
  66 | })
  67 | 
  68 | test('[A7] searching "ali" shows only Alice and hides Bob', async ({ page }) => {
  69 |   await page.goto('/')
  70 |   await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  71 |   await addGuest(page, 'Bob', 'bob@example.com', 'Pending')
  72 |   await page.getByLabel('Search').fill('ali')
  73 |   await expect(guest(page, 'Alice')).toBeVisible()
  74 |   await expect(guest(page, 'Bob')).toHaveCount(0)
  75 | })
  76 | 
  77 | test('[A8] editing Alice pre-fills the form and saving Declined updates the row', async ({ page }) => {
  78 |   await page.goto('/')
  79 |   await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  80 |   await page.getByRole('button', { name: 'Edit Alice' }).click()
  81 |   await expect(page.getByLabel('Name')).toHaveValue('Alice')
  82 |   await expect(page.getByLabel('Email')).toHaveValue('alice@example.com')
  83 |   await page.getByLabel('RSVP').selectOption('Declined')
  84 |   await page.getByRole('button', { name: 'Save' }).click()
  85 |   await expect(guest(page, 'Alice')).toContainText('Declined')
  86 | })
  87 | 
  88 | test('[A9] reload keeps Alice with her email and status visible', async ({ page }) => {
  89 |   await page.goto('/')
  90 |   await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  91 |   await page.reload()
  92 |   const row = guest(page, 'Alice')
  93 |   await expect(row).toBeVisible()
  94 |   await expect(row).toContainText('alice@example.com')
  95 |   await expect(row).toContainText('Accepted')
  96 | })
  97 | 
```