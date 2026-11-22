# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] next page advances to page 2 of 5
- Location: tests/acceptance.spec.ts:25:1

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
  3  | async function loadBook(page: Page, content: string) {
  4  |   const [chooser] = await Promise.all([
  5  |     page.waitForEvent('filechooser'),
  6  |     page.getByRole('button', { name: 'Choose file' }).click(),
  7  |   ])
  8  |   const file = new File([content], 'test.epub', { type: 'application/epub+zip' })
  9  |   await (chooser as unknown as { setFiles(files: File[]): Promise<void> }).setFiles([file])
  10 | }
  11 | 
  12 | test('[A1] heading and empty state', async ({ page }) => {
  13 |   await page.goto('/')
  14 |   await expect(page.getByRole('heading', { name: 'EPUB Reader' })).toBeVisible()
  15 |   await expect(page.getByText('No book loaded')).toBeVisible()
  16 | })
  17 | 
  18 | test('[A2] loading a book shows the title and page 1 text', async ({ page }) => {
  19 |   await page.goto('/')
  20 |   await loadBook(page, 'Hello World')
  21 |   await expect(page.getByText('test.epub')).toBeVisible()
  22 |   await expect(page.getByText('Hello World')).toBeVisible()
  23 | })
  24 | 
  25 | test('[A3] next page advances to page 2 of 5', async ({ page }) => {
> 26 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  27 |   await loadBook(page, 'Hello World')
  28 |   await page.getByRole('button', { name: 'Next page' }).click()
  29 |   await expect(page.getByText('Page 2 of 5')).toBeVisible()
  30 |   await expect(page.getByText('Hello World')).toBeVisible()
  31 | })
  32 | 
  33 | test('[A4] adding a bookmark on page 3', async ({ page }) => {
  34 |   await page.goto('/')
  35 |   await loadBook(page, 'Hello World')
  36 |   await page.getByRole('button', { name: 'Next page' }).click()
  37 |   await page.getByRole('button', { name: 'Next page' }).click()
  38 |   await page.getByRole('button', { name: 'Add bookmark' }).click()
  39 |   await expect(page.getByText('Page 3')).toBeVisible()
  40 |   await expect(page.getByText('No bookmarks')).toHaveCount(0)
  41 | })
  42 | 
  43 | test('[A5] deleting the page 3 bookmark', async ({ page }) => {
  44 |   await page.goto('/')
  45 |   await loadBook(page, 'Hello World')
  46 |   await page.getByRole('button', { name: 'Next page' }).click()
  47 |   await page.getByRole('button', { name: 'Next page' }).click()
  48 |   await page.getByRole('button', { name: 'Add bookmark' }).click()
  49 |   await page.getByRole('button', { name: 'Delete Page 3' }).click()
  50 |   await expect(page.getByText('No bookmarks')).toBeVisible()
  51 | })
  52 | 
  53 | test('[A6] exporting the page copies its text', async ({ page }) => {
  54 |   await page.goto('/')
  55 |   await loadBook(page, 'Hello World')
  56 |   page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  57 |   await page.getByRole('button', { name: 'Export page' }).click()
  58 |   const clip = await page.evaluate(() => navigator.clipboard.readText())
  59 |   expect(clip).toBe('Hello World')
  60 |   await expect(page.getByText('Copied page text')).toBeVisible()
  61 | })
  62 | 
  63 | test('[A7] changing font size to Large', async ({ page }) => {
  64 |   await page.goto('/')
  65 |   await loadBook(page, 'Hello World')
  66 |   await page.getByRole('button', { name: 'Next page' }).click()
  67 |   const reader = page.getByText('Hello World')
  68 |   const before = Number(await reader.evaluate((el) => getComputedStyle(el).fontSize))
  69 |   await page.getByLabel('Font size').selectOption('Large')
  70 |   const after = Number(await reader.evaluate((el) => getComputedStyle(el).fontSize))
  71 |   expect(after).toBeGreaterThan(before)
  72 | })
  73 | 
  74 | test('[A8] reload restores book, page and position', async ({ page }) => {
  75 |   await page.goto('/')
  76 |   await loadBook(page, 'Hello World')
  77 |   await page.getByRole('button', { name: 'Next page' }).click()
  78 |   await page.getByRole('button', { name: 'Next page' }).click()
  79 |   await page.reload()
  80 |   await expect(page.getByText('test.epub')).toBeVisible()
  81 |   await expect(page.getByText('Page 3 of 5')).toBeVisible()
  82 | })
  83 | 
  84 | test('[A9] reload keeps the page 3 bookmark', async ({ page }) => {
  85 |   await page.goto('/')
  86 |   await loadBook(page, 'Hello World')
  87 |   await page.getByRole('button', { name: 'Next page' }).click()
  88 |   await page.getByRole('button', { name: 'Next page' }).click()
  89 |   await page.getByRole('button', { name: 'Add bookmark' }).click()
  90 |   await page.reload()
  91 |   await expect(page.getByText('test.epub')).toBeVisible()
  92 |   await expect(page.getByText('Page 3')).toBeVisible()
  93 | })
  94 | 
```