# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A1] heading displays "PDF Splitter"
- Location: tests/acceptance.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test('[A1] heading displays "PDF Splitter"', async ({ page }) => {
> 4   |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5   |   await expect(page.getByRole('heading', { name: 'PDF Splitter' })).toBeVisible()
  6   | })
  7   | 
  8   | test('[A2] dropping report.pdf shows preview card with name and page count', async ({ page }) => {
  9   |   await page.goto('/')
  10  |   const dropZone = page.getByText('Drop PDF here')
  11  |   await dropZone.setInputFiles({
  12  |     name: 'report.pdf',
  13  |     mimeType: 'application/pdf',
  14  |     buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  15  |   })
  16  |   await expect(page.getByText('report.pdf')).toBeVisible()
  17  |   await expect(page.getByText('3 pages')).toBeVisible()
  18  | })
  19  | 
  20  | test('[A3] split with page range 1-2 shows success and enables download', async ({ page }) => {
  21  |   await page.goto('/')
  22  |   const dropZone = page.getByText('Drop PDF here')
  23  |   await dropZone.setInputFiles({
  24  |     name: 'report.pdf',
  25  |     mimeType: 'application/pdf',
  26  |     buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  27  |   })
  28  |   await page.getByRole('tab', { name: 'Split' }).click()
  29  |   await page.getByLabel('Page range').fill('1-2')
  30  |   await page.getByRole('button', { name: 'Process' }).click()
  31  |   await expect(page.getByText('Split complete')).toBeVisible()
  32  |   await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled()
  33  | })
  34  | 
  35  | test('[A4] download after split triggers report_split.pdf', async ({ page }) => {
  36  |   await page.goto('/')
  37  |   const dropZone = page.getByText('Drop PDF here')
  38  |   await dropZone.setInputFiles({
  39  |     name: 'report.pdf',
  40  |     mimeType: 'application/pdf',
  41  |     buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  42  |   })
  43  |   await page.getByRole('tab', { name: 'Split' }).click()
  44  |   await page.getByLabel('Page range').fill('1-2')
  45  |   const [download] = await Promise.all([
  46  |     page.getByRole('button', { name: 'Process' }).click().then(() =>
  47  |       page.waitForEvent('download'),
  48  |     ),
  49  |     page.getByRole('button', { name: 'Download PDF' }).click(),
  50  |   ])
  51  |   expect(download.suggestedFilename()).toBe('report_split.pdf')
  52  | })
  53  | 
  54  | test('[A5] merge with second file shows success and enables download', async ({ page }) => {
  55  |   await page.goto('/')
  56  |   const dropZone = page.getByText('Drop PDF here')
  57  |   await dropZone.setInputFiles({
  58  |     name: 'report.pdf',
  59  |     mimeType: 'application/pdf',
  60  |     buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  61  |   })
  62  |   await page.getByRole('tab', { name: 'Merge' }).click()
  63  |   await dropZone.setInputFiles([
  64  |     {
  65  |       name: 'report.pdf',
  66  |       mimeType: 'application/pdf',
  67  |       buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  68  |     },
  69  |     {
  70  |       name: 'notes.pdf',
  71  |       mimeType: 'application/pdf',
  72  |       buffer: Buffer.from('%PDF-1.4 fake pdf content 2'),
  73  |     },
  74  |   ])
  75  |   await page.getByRole('button', { name: 'Process' }).click()
  76  |   await expect(page.getByText('Merge complete')).toBeVisible()
  77  |   await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled()
  78  | })
  79  | 
  80  | test('[A6] download after merge triggers merged.pdf', async ({ page }) => {
  81  |   await page.goto('/')
  82  |   const dropZone = page.getByText('Drop PDF here')
  83  |   await dropZone.setInputFiles([
  84  |     {
  85  |       name: 'report.pdf',
  86  |       mimeType: 'application/pdf',
  87  |       buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  88  |     },
  89  |     {
  90  |       name: 'notes.pdf',
  91  |       mimeType: 'application/pdf',
  92  |       buffer: Buffer.from('%PDF-1.4 fake pdf content 2'),
  93  |     },
  94  |   ])
  95  |   await page.getByRole('tab', { name: 'Merge' }).click()
  96  |   const [download] = await Promise.all([
  97  |     page.getByRole('button', { name: 'Process' }).click().then(() =>
  98  |       page.waitForEvent('download'),
  99  |     ),
  100 |     page.getByRole('button', { name: 'Download PDF' }).click(),
  101 |   ])
  102 |   expect(download.suggestedFilename()).toBe('merged.pdf')
  103 | })
  104 | 
```