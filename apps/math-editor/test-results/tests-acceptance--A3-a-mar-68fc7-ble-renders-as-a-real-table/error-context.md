# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] a markdown table renders as a real table
- Location: tests/acceptance.spec.ts:21:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | 
  3   | test('[A1] page heading is "Math Editor" and the Source tab shows the code area with its placeholder', async ({ page }) => {
  4   |   await page.goto('/')
  5   |   await expect(page.getByRole('heading', { name: 'Math Editor' })).toBeVisible()
  6   |   await expect(page.getByRole('tab', { name: 'Source' })).toHaveAttribute('aria-selected', 'true')
  7   |   await expect(page.getByRole('textbox', { name: 'Source' })).toHaveAttribute('placeholder', 'Type Markdown and TeX here')
  8   | })
  9   | 
  10  | test('[A2] heading and inline math render in the preview', async ({ page }) => {
  11  |   await page.goto('/')
  12  |   await page.getByRole('textbox', { name: 'Source' }).fill('# Title\n\nHello $x^2$ world')
  13  |   await page.getByRole('tab', { name: 'Preview' }).click()
  14  |   await expect(page.getByRole('heading', { name: 'Title' })).toBeVisible()
  15  |   const panel = page.getByRole('tabpanel')
  16  |   await expect(panel.getByRole('math', { name: 'x squared' })).toBeVisible()
  17  |   await expect(panel.getByText('Hello')).toBeVisible()
  18  |   await expect(panel.getByText('world')).toBeVisible()
  19  | })
  20  | 
  21  | test('[A3] a markdown table renders as a real table', async ({ page }) => {
> 22  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  23  |   await page.getByRole('textbox', { name: 'Source' }).fill('| A | B |\n|---|---|\n| 1 | 2 |')
  24  |   await page.getByRole('tab', { name: 'Preview' }).click()
  25  |   const table = page.getByRole('table')
  26  |   await expect(table).toBeVisible()
  27  |   await expect(page.getByRole('columnheader', { name: 'A' })).toBeVisible()
  28  |   await expect(page.getByRole('columnheader', { name: 'B' })).toBeVisible()
  29  |   await expect(page.getByRole('columnheader')).toHaveCount(2)
  30  |   await expect(table.getByRole('row')).toHaveCount(2)
  31  |   await expect(table.getByRole('cell')).toHaveCount(2)
  32  |   await expect(table.getByRole('cell', { name: '1' })).toBeVisible()
  33  |   await expect(table.getByRole('cell', { name: '2' })).toBeVisible()
  34  | })
  35  | 
  36  | test('[A4] task list items render checkboxes with the task text as their name', async ({ page }) => {
  37  |   await page.goto('/')
  38  |   await page.getByRole('textbox', { name: 'Source' }).fill('- [ ] Task one\n- [x] Task two')
  39  |   await page.getByRole('tab', { name: 'Preview' }).click()
  40  |   const list = page.getByRole('list')
  41  |   await expect(list.getByRole('listitem')).toHaveCount(2)
  42  |   await expect(list.getByRole('checkbox', { name: 'Task one' })).not.toBeChecked()
  43  |   await expect(list.getByRole('checkbox', { name: 'Task two' })).toBeChecked()
  44  | })
  45  | 
  46  | test('[A5] Copy Markdown puts the source text on the clipboard', async ({ page, context }) => {
  47  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  48  |   await page.goto('/')
  49  |   await page.getByRole('textbox', { name: 'Source' }).fill('# Hi\n\n$y$')
  50  |   await page.getByRole('button', { name: 'Copy Markdown' }).click()
  51  |   const text = await page.evaluate(() => navigator.clipboard.readText())
  52  |   expect(text).toBe('# Hi\n\n$y$')
  53  | })
  54  | 
  55  | test('[A6] Export HTML downloads math-editor.html containing the rendered heading', async ({ page }) => {
  56  |   await page.goto('/')
  57  |   await page.getByRole('textbox', { name: 'Source' }).fill('# Hi')
  58  |   const [download] = await Promise.all([
  59  |     page.waitForEvent('download'),
  60  |     page.getByRole('button', { name: 'Export HTML' }).click(),
  61  |   ])
  62  |   expect(download.suggestedFilename()).toBe('math-editor.html')
  63  |   const content = await download.text()
  64  |   expect(content).toContain('<h1>Hi</h1>')
  65  | })
  66  | 
  67  | test('[A7] each autosave adds a snapshot to the History tab', async ({ page }) => {
  68  |   await page.goto('/')
  69  |   await page.getByRole('textbox', { name: 'Source' }).fill('# First')
  70  |   await page.getByRole('tab', { name: 'History' }).click()
  71  |   const first = page.getByRole('listitem', { hasText: 'First' })
  72  |   await expect(first, 'first autosave lands in history').toBeVisible({ timeout: 10000 })
  73  |   await page.getByRole('tab', { name: 'Source' }).click()
  74  |   await page.getByRole('textbox', { name: 'Source' }).fill('# Second')
  75  |   const second = page.getByRole('listitem', { hasText: 'Second' })
  76  |   await expect(second, 'second autosave lands in history').toBeVisible({ timeout: 10000 })
  77  | })
  78  | 
  79  | test('[A8] restoring a history entry sets the source and the preview updates', async ({ page }) => {
  80  |   await page.goto('/')
  81  |   await page.getByRole('textbox', { name: 'Source' }).fill('# First')
  82  |   await page.getByRole('tab', { name: 'History' }).click()
  83  |   const first = page.getByRole('listitem', { hasText: 'First' })
  84  |   await expect(first, 'first autosave lands in history').toBeVisible({ timeout: 10000 })
  85  |   await page.getByRole('tab', { name: 'Source' }).click()
  86  |   await page.getByRole('textbox', { name: 'Source' }).fill('# Second')
  87  |   const second = page.getByRole('listitem', { hasText: 'Second' })
  88  |   await expect(second, 'second autosave lands in history').toBeVisible({ timeout: 10000 })
  89  |   await page.getByRole('tab', { name: 'History' }).click()
  90  |   await first.getByRole('button', { name: 'Restore' }).click()
  91  |   await expect(page.getByRole('textbox', { name: 'Source' })).toHaveValue('# First')
  92  |   await page.getByRole('tab', { name: 'Preview' }).click()
  93  |   await expect(page.getByRole('heading', { name: 'First' })).toBeVisible()
  94  | })
  95  | 
  96  | test('[A9] the document persists across a reload', async ({ page }) => {
  97  |   await page.goto('/')
  98  |   await page.getByRole('textbox', { name: 'Source' }).fill('# Saved Doc')
  99  |   await page.getByRole('tab', { name: 'History' }).click()
  100 |   await expect(page.getByRole('listitem', { hasText: 'Saved Doc' }), 'autosave lands in history').toBeVisible({ timeout: 10000 })
  101 |   await page.reload()
  102 |   await expect(page.getByRole('textbox', { name: 'Source' })).toHaveValue('# Saved Doc')
  103 |   await page.getByRole('tab', { name: 'Preview' }).click()
  104 |   await expect(page.getByRole('heading', { name: 'Saved Doc' })).toBeVisible()
  105 | })
  106 | 
```