# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A9] history persists across reload
- Location: tests/acceptance.spec.ts:138:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
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
  105 | test('[A7] history shows processed file entry', async ({ page }) => {
  106 |   await page.goto('/')
  107 |   const dropZone = page.getByText('Drop PDF here')
  108 |   await dropZone.setInputFiles({
  109 |     name: 'report.pdf',
  110 |     mimeType: 'application/pdf',
  111 |     buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  112 |   })
  113 |   await page.getByRole('tab', { name: 'Split' }).click()
  114 |   await page.getByLabel('Page range').fill('1-2')
  115 |   await page.getByRole('button', { name: 'Process' }).click()
  116 |   await page.getByRole('tab', { name: 'History' }).click()
  117 |   await expect(page.getByText('report.pdf')).toBeVisible()
  118 |   await expect(page.getByText('Split')).toBeVisible()
  119 | })
  120 | 
  121 | test('[A8] clear history removes all items', async ({ page }) => {
  122 |   await page.goto('/')
  123 |   const dropZone = page.getByText('Drop PDF here')
  124 |   await dropZone.setInputFiles({
  125 |     name: 'report.pdf',
  126 |     mimeType: 'application/pdf',
  127 |     buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  128 |   })
  129 |   await page.getByRole('tab', { name: 'Split' }).click()
  130 |   await page.getByLabel('Page range').fill('1-2')
  131 |   await page.getByRole('button', { name: 'Process' }).click()
  132 |   await page.getByRole('tab', { name: 'History' }).click()
  133 |   await expect(page.getByText('report.pdf')).toBeVisible()
  134 |   await page.getByRole('button', { name: 'Clear history' }).click()
  135 |   await expect(page.getByText('report.pdf')).toHaveCount(0)
  136 | })
  137 | 
  138 | test('[A9] history persists across reload', async ({ page }) => {
> 139 |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  140 |   const dropZone = page.getByText('Drop PDF here')
  141 |   await dropZone.setInputFiles({
  142 |     name: 'report.pdf',
  143 |     mimeType: 'application/pdf',
  144 |     buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  145 |   })
  146 |   await page.getByRole('tab', { name: 'Split' }).click()
  147 |   await page.getByLabel('Page range').fill('1-2')
  148 |   await page.getByRole('button', { name: 'Process' }).click()
  149 |   await page.reload()
  150 |   await page.getByRole('tab', { name: 'History' }).click()
  151 |   await expect(page.getByText('report.pdf')).toBeVisible()
  152 |   await expect(page.getByText('Split')).toBeVisible()
  153 | })
  154 | 
```