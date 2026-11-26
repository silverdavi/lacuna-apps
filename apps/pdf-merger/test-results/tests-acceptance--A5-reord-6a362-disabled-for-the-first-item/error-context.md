# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A5] reordering shows Page 1 and Move up is disabled for the first item
- Location: tests/acceptance.spec.ts:61:1

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
  3   | import { mkdirSync, writeFileSync } from 'node:fs'
  4   | import { tmpdir } from 'node:os'
  5   | import { join } from 'node:path'
  6   | 
  7   | // A minimal valid one-page PDF (blank, ~150 bytes) so the file name carries the test.
  8   | const PDF = Buffer.from([
  9   |   '%PDF-1.4\n',
  10  |   '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
  11  |   '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
  12  |   '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\n',
  13  |   'trailer\n<< /Root 1 0 R >>\n%%EOF',
  14  | ].join(''))
  15  | 
  16  | function pdfPath(name: string): string {
  17  |   const dir = join(tmpdir(), 'pdf-merger-acceptance')
  18  |   mkdirSync(dir, { recursive: true })
  19  |   const path = join(dir, name)
  20  |   writeFileSync(path, PDF)
  21  |   return path
  22  | }
  23  | 
  24  | async function dropFile(page: Page, name: string) {
  25  |   const input = page.locator('input[type="file"]').first()
  26  |   await input.setInputFiles(pdfPath(name))
  27  | }
  28  | 
  29  | test('[A1] initial page shows the heading and drop text', async ({ page }) => {
  30  |   await page.goto('/')
  31  |   await expect(page.getByRole('heading', { name: 'PDF Toolkit' })).toBeVisible()
  32  |   await expect(page.getByText('Drop a PDF file or click to browse')).toBeVisible()
  33  | })
  34  | 
  35  | test('[A2] dropping report.pdf and merging shows the Download button and Merged 1 file', async ({ page }) => {
  36  |   await page.goto('/')
  37  |   await dropFile(page, 'report.pdf')
  38  |   await page.getByRole('button', { name: 'Merge' }).click()
  39  |   await expect(page.getByRole('button', { name: 'Download' })).toBeVisible()
  40  |   await expect(page.getByText('Merged 1 file')).toBeVisible()
  41  | })
  42  | 
  43  | test('[A3] dropping book.pdf and splitting shows Start page 1 and End page 100', async ({ page }) => {
  44  |   await page.goto('/')
  45  |   await dropFile(page, 'book.pdf')
  46  |   await page.getByRole('button', { name: 'Split' }).click()
  47  |   await expect(page.getByLabel('Start page')).toHaveValue('1')
  48  |   await expect(page.getByLabel('End page')).toHaveValue('100')
  49  | })
  50  | 
  51  | test('[A4] applying split 5 to 10 shows Split pages 5-10', async ({ page }) => {
  52  |   await page.goto('/')
  53  |   await dropFile(page, 'book.pdf')
  54  |   await page.getByRole('button', { name: 'Split' }).click()
  55  |   await page.getByLabel('Start page').fill('5')
  56  |   await page.getByLabel('End page').fill('10')
  57  |   await page.getByRole('button', { name: 'Apply' }).click()
  58  |   await expect(page.getByText('Split pages 5-10')).toBeVisible()
  59  | })
  60  | 
  61  | test('[A5] reordering shows Page 1 and Move up is disabled for the first item', async ({ page }) => {
> 62  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  63  |   await dropFile(page, 'book.pdf')
  64  |   await page.getByRole('button', { name: 'Reorder' }).click()
  65  |   const item1 = page.getByRole('listitem').filter({ hasText: 'Page 1' }).first()
  66  |   await expect(item1).toBeVisible()
  67  |   await expect(item1.getByRole('button', { name: 'Move up' })).toBeDisabled()
  68  | })
  69  | 
  70  | test('[A6] adding notes.pdf then removing it leaves only report.pdf', async ({ page }) => {
  71  |   await page.goto('/')
  72  |   await dropFile(page, 'report.pdf')
  73  |   await dropFile(page, 'notes.pdf')
  74  |   const report = page.getByRole('listitem').filter({ hasText: 'report.pdf' })
  75  |   const notes = page.getByRole('listitem').filter({ hasText: 'notes.pdf' })
  76  |   await expect(report).toHaveCount(1)
  77  |   await expect(notes).toHaveCount(1)
  78  |   await page.getByRole('button', { name: 'Remove notes.pdf' }).click()
  79  |   await expect(notes).toHaveCount(0)
  80  |   await expect(report).toHaveCount(1)
  81  | })
  82  | 
  83  | test('[A7] Download after a merge downloads merged.pdf', async ({ page }) => {
  84  |   await page.goto('/')
  85  |   await dropFile(page, 'report.pdf')
  86  |   await page.getByRole('button', { name: 'Merge' }).click()
  87  |   const [download] = await Promise.all([
  88  |     page.waitForEvent('download'),
  89  |     page.getByRole('button', { name: 'Download' }).click(),
  90  |   ])
  91  |   expect(download.suggestedFilename()).toBe('merged.pdf')
  92  | })
  93  | 
  94  | test('[A8] History tab shows the File Operation Result table with the merge row', async ({ page }) => {
  95  |   await page.goto('/')
  96  |   await dropFile(page, 'report.pdf')
  97  |   await page.getByRole('button', { name: 'Merge' }).click()
  98  |   await page.getByRole('tab', { name: 'History' }).click()
  99  |   await expect(page.getByRole('columnheader', { name: 'File' })).toBeVisible()
  100 |   await expect(page.getByRole('columnheader', { name: 'Operation' })).toBeVisible()
  101 |   await expect(page.getByRole('columnheader', { name: 'Result' })).toBeVisible()
  102 |   const row = page.locator('tr').filter({ hasText: 'report.pdf' })
  103 |   await expect(row).toContainText('Merge')
  104 |   await expect(row).toContainText('merged.pdf')
  105 | })
  106 | 
  107 | test('[A9] reload keeps the last operation Merge highlighted and Last operation: Merge', async ({ page }) => {
  108 |   await page.goto('/')
  109 |   await dropFile(page, 'report.pdf')
  110 |   await page.getByRole('button', { name: 'Merge' }).click()
  111 |   await page.reload()
  112 |   await expect(page.getByRole('button', { name: 'Merge' })).toHaveAttribute('aria-pressed', 'true')
  113 |   await expect(page.getByText('Last operation: Merge')).toBeVisible()
  114 | })
  115 | 
```