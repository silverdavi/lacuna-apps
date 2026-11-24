# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] five words are exactly five words with no trailing newline
- Location: tests/acceptance.spec.ts:27:1

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
  3   | // The spec pins seed 42 with one sentence to an exact sentence (A4) but does not
  4   | // pin the seed for the paragraph/word cases, so A2/A3 assert the spec-stated
  5   | // prefix/word-count; no two checks contradict.
  6   | 
  7   | function output(page: Page) {
  8   |   return page.locator('pre')
  9   | }
  10  | 
  11  | test('[A1] page heading is "Lorem Ipsum Generator" and the Generate tab is active', async ({ page }) => {
  12  |   await page.goto('/')
  13  |   await expect(page.getByRole('heading', { name: 'Lorem Ipsum Generator' })).toBeVisible()
  14  |   await expect(page.getByRole('tab', { name: 'Generate' })).toHaveAttribute('aria-selected', 'true')
  15  | })
  16  | 
  17  | test('[A2] two paragraphs start "Lorem ipsum dolor sit amet" with two paragraph breaks', async ({ page }) => {
  18  |   await page.goto('/')
  19  |   await page.getByLabel('Unit').selectOption({ label: 'Paragraphs' })
  20  |   await page.getByLabel('Count').fill('2')
  21  |   await page.getByRole('button', { name: 'Generate' }).click()
  22  |   const text = await output(page).innerText()
  23  |   expect(text).toContain('Lorem ipsum dolor sit amet')
  24  |   expect(text.split(/\n{2,}/).filter((p) => p.length > 0)).toHaveLength(2)
  25  | })
  26  | 
  27  | test('[A3] five words are exactly five words with no trailing newline', async ({ page }) => {
> 28  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  29  |   await page.getByLabel('Unit').selectOption({ label: 'Words' })
  30  |   await page.getByLabel('Count').fill('5')
  31  |   await page.getByRole('button', { name: 'Generate' }).click()
  32  |   const text = await output(page).innerText()
  33  |   expect(text).not.toMatch(/\n/)
  34  |   expect(text.split(' ')).toHaveLength(5)
  35  | })
  36  | 
  37  | test('[A4] seed 42 with one sentence is the exact seeded sentence', async ({ page }) => {
  38  |   await page.goto('/')
  39  |   await page.getByLabel('Seed').fill('42')
  40  |   await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  41  |   await page.getByLabel('Count').fill('1')
  42  |   await page.getByRole('button', { name: 'Generate' }).click()
  43  |   await expect(output(page)).toHaveText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
  44  | })
  45  | 
  46  | test('[A5] Copy shows "Copied" for 1.5s and puts the text on the clipboard', async ({ page, context }) => {
  47  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  48  |   await page.goto('/')
  49  |   await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  50  |   await page.getByLabel('Count').fill('3')
  51  |   await page.getByRole('button', { name: 'Generate' }).click()
  52  |   const copy = page.getByRole('button', { name: 'Copy' })
  53  |   await copy.click()
  54  |   await expect(copy).toHaveText('Copied')
  55  |   const restored = page.getByRole('button', { name: 'Copy' })
  56  |   await expect(restored).toBeVisible({ timeout: 5000 })
  57  |   const text = await page.evaluate(() => navigator.clipboard.readText())
  58  |   expect(text).toContain('Lorem ipsum dolor sit amet')
  59  | })
  60  | 
  61  | test('[A6] Download saves the generated text as lorem-ipsum.txt', async ({ page }) => {
  62  |   await page.goto('/')
  63  |   await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  64  |   await page.getByLabel('Count').fill('2')
  65  |   await page.getByRole('button', { name: 'Generate' }).click()
  66  |   const [download] = await Promise.all([
  67  |     page.waitForEvent('download'),
  68  |     page.getByRole('button', { name: 'Download' }).click(),
  69  |   ])
  70  |   expect(download.suggestedFilename()).toBe('lorem-ipsum.txt')
  71  |   const content = await download.path()
  72  |   const fs = await import('node:fs')
  73  |   expect(fs.readFileSync(content!, 'utf8')).toContain('Lorem ipsum dolor sit amet')
  74  | })
  75  | 
  76  | test('[A7] Save to list adds an item with the first 40 characters of the text', async ({ page }) => {
  77  |   await page.goto('/')
  78  |   await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  79  |   await page.getByLabel('Count').fill('3')
  80  |   await page.getByRole('button', { name: 'Generate' }).click()
  81  |   await page.getByRole('button', { name: 'Save to list' }).click()
  82  |   await page.getByRole('tab', { name: 'Saved' }).click()
  83  |   const first40 = await page.evaluate(() => (document.querySelector('pre')?.textContent ?? '').slice(0, 40))
  84  |   expect(first40.length).toBe(40)
  85  |   await expect(page.getByRole('listitem').filter({ hasText: first40 })).toHaveCount(1)
  86  | })
  87  | 
  88  | test('[A8] Delete removes the first item and shows "No saved snippets" when empty', async ({ page }) => {
  89  |   await page.goto('/')
  90  |   await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  91  |   await page.getByLabel('Count').fill('3')
  92  |   await page.getByRole('button', { name: 'Generate' }).click()
  93  |   await page.getByRole('button', { name: 'Save to list' }).click()
  94  |   await page.getByRole('tab', { name: 'Saved' }).click()
  95  |   await expect(page.getByRole('listitem')).toHaveCount(1)
  96  |   await page.getByRole('listitem').first().getByRole('button', { name: 'Delete' }).click()
  97  |   await expect(page.getByRole('listitem')).toHaveCount(0)
  98  |   await expect(page.getByText('No saved snippets')).toBeVisible()
  99  | })
  100 | 
  101 | test('[A9] a saved snippet survives a reload with the same first 40 characters', async ({ page }) => {
  102 |   await page.goto('/')
  103 |   await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  104 |   await page.getByLabel('Count').fill('3')
  105 |   await page.getByRole('button', { name: 'Generate' }).click()
  106 |   await page.getByRole('button', { name: 'Save to list' }).click()
  107 |   const first40 = await page.evaluate(() => (document.querySelector('pre')?.textContent ?? '').slice(0, 40))
  108 |   expect(first40.length).toBe(40)
  109 |   await page.reload()
  110 |   await page.getByRole('tab', { name: 'Saved' }).click()
  111 |   await expect(page.getByRole('listitem').filter({ hasText: first40 })).toHaveCount(1)
  112 | })
  113 | 
```