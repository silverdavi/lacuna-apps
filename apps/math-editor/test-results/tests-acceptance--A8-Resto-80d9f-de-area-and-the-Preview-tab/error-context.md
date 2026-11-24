# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A8] Restore puts the snapshot back in the code area and the Preview tab
- Location: tests/acceptance.spec.ts:90:1

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
  3   | test('[A1] shows the Math Editor heading and the Source tab is active by default', async ({ page }) => {
  4   |   await page.goto('/')
  5   |   await expect(page.getByRole('heading', { name: 'Math Editor' })).toBeVisible()
  6   |   const sourceTab = page.getByRole('tab', { name: 'Source' })
  7   |   await expect(sourceTab).toBeVisible()
  8   |   await expect(sourceTab).toHaveAttribute('aria-selected', 'true')
  9   |   await expect(page.getByText('Type Markdown and TeX here')).toBeVisible()
  10  | })
  11  | 
  12  | test('[A2] renders a heading, prose and inline math in the Preview tab', async ({ page }) => {
  13  |   await page.goto('/')
  14  |   await page.locator('textarea, [contenteditable]').first().fill('# Title\n\nHello $x^2$ world')
  15  |   await page.waitForTimeout(500)
  16  |   await page.getByRole('tab', { name: 'Preview' }).click()
  17  |   const panel = page.getByRole('tabpanel', { name: 'Preview' }).first()
  18  |   await expect(panel.getByRole('heading', { name: 'Title', level: 1 })).toBeVisible()
  19  |   await expect(panel.getByText('Hello', { exact: false })).toBeVisible()
  20  |   await expect(panel.getByText('world', { exact: false })).toBeVisible()
  21  |   await expect(panel.getByRole('math', { name: 'x squared' })).toBeVisible()
  22  | })
  23  | 
  24  | test('[A3] renders a two-column two-row table in the Preview tab', async ({ page }) => {
  25  |   await page.goto('/')
  26  |   await page.locator('textarea, [contenteditable]').first().fill('| A | B |\n|---|---|\n| 1 | 2 |')
  27  |   await page.waitForTimeout(500)
  28  |   await page.getByRole('tab', { name: 'Preview' }).click()
  29  |   const panel = page.getByRole('tabpanel', { name: 'Preview' }).first()
  30  |   const table = panel.getByRole('table')
  31  |   await expect(table).toBeVisible()
  32  |   await expect(table.getByRole('column')).toHaveCount(2)
  33  |   await expect(table.getByRole('row')).toHaveCount(2)
  34  |   const body = table.locator('tbody')
  35  |   await expect(body.locator('td').nth(0)).toHaveText('1')
  36  |   await expect(body.locator('td').nth(1)).toHaveText('2')
  37  | })
  38  | 
  39  | test('[A4] renders a task list with one unchecked and one checked item', async ({ page }) => {
  40  |   await page.goto('/')
  41  |   await page.locator('textarea, [contenteditable]').first().fill('- [ ] Task one\n- [x] Task two')
  42  |   await page.waitForTimeout(500)
  43  |   await page.getByRole('tab', { name: 'Preview' }).click()
  44  |   const panel = page.getByRole('tabpanel', { name: 'Preview' }).first()
  45  |   const items = panel.getByRole('listitem')
  46  |   await expect(items).toHaveCount(2)
  47  |   await expect(items.nth(0).getByRole('checkbox', { name: /task one/i })).toBeUnchecked()
  48  |   await expect(items.nth(0)).toContainText('Task one')
  49  |   await expect(items.nth(1).getByRole('checkbox', { name: /task two/i })).toBeChecked()
  50  |   await expect(items.nth(1)).toContainText('Task two')
  51  | })
  52  | 
  53  | test('[A5] Copy Markdown copies the exact code area text to the clipboard', async ({ page, context }) => {
  54  |   // grant before the copy click so the clipboard write can succeed
  55  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  56  |   await page.goto('/')
  57  |   await page.locator('textarea, [contenteditable]').first().fill('# Hi\n\n$y$')
  58  |   await page.getByRole('button', { name: 'Copy Markdown' }).click()
  59  |   // read the clipboard after the user action; no page or storage mutation
  60  |   const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  61  |   expect(clipboard).toBe('# Hi\n\n$y$')
  62  | })
  63  | 
  64  | test('[A6] Export HTML downloads math-editor.html containing the heading', async ({ page }) => {
  65  |   await page.goto('/')
  66  |   await page.locator('textarea, [contenteditable]').first().fill('# Hi')
  67  |   const [download] = await Promise.all([
  68  |     page.waitForEvent('download'),
  69  |     page.getByRole('button', { name: 'Export HTML' }).click(),
  70  |   ])
  71  |   expect(download.suggestedFilename()).toBe('math-editor.html')
  72  |   const { readFileSync } = await import('node:fs')
  73  |   const body = readFileSync((await download.path())!, 'utf8')
  74  |   expect(body).toContain('<h1>Hi</h1>')
  75  | })
  76  | 
  77  | test('[A7] the History tab shows two snapshots after two autosaves', async ({ page }) => {
  78  |   await page.goto('/')
  79  |   const code = page.locator('textarea, [contenteditable]').first()
  80  |   await code.fill('# First')
  81  |   await page.waitForTimeout(2000)
  82  |   await code.fill('# Second')
  83  |   await page.waitForTimeout(2000)
  84  |   await page.getByRole('tab', { name: 'History' }).click()
  85  |   const panel = page.getByRole('tabpanel', { name: 'History' }).first()
  86  |   await expect(panel.getByText('First')).toBeVisible()
  87  |   await expect(panel.getByText('Second')).toBeVisible()
  88  | })
  89  | 
  90  | test('[A8] Restore puts the snapshot back in the code area and the Preview tab', async ({ page }) => {
> 91  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  92  |   const code = page.locator('textarea, [contenteditable]').first()
  93  |   await code.fill('# First')
  94  |   await page.waitForTimeout(2000)
  95  |   await code.fill('# Second')
  96  |   await page.waitForTimeout(2000)
  97  |   await page.getByRole('tab', { name: 'History' }).click()
  98  |   const panel = page.getByRole('tabpanel', { name: 'History' }).first()
  99  |   await panel.getByRole('button', { name: 'Restore' }).first().click()
  100 |   await expect(code).toHaveText('# First')
  101 |   await page.getByRole('tab', { name: 'Preview' }).click()
  102 |   await expect(page.getByRole('heading', { name: 'First', level: 1 })).toBeVisible()
  103 | })
  104 | 
  105 | test('[A9] reloading keeps the autosaved document', async ({ page }) => {
  106 |   await page.goto('/')
  107 |   const code = page.locator('textarea, [contenteditable]').first()
  108 |   await code.fill('# Saved Doc')
  109 |   await page.waitForTimeout(2000)
  110 |   await page.reload()
  111 |   await expect(code).toHaveText('# Saved Doc')
  112 |   await page.getByRole('tab', { name: 'Preview' }).click()
  113 |   await expect(page.getByRole('heading', { name: 'Saved Doc', level: 1 })).toBeVisible()
  114 | })
  115 | 
```