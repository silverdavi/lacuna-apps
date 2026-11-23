# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A5] the Feeding filter shows only the feeding
- Location: tests/acceptance.spec.ts:51:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | import { readFile } from 'node:fs/promises'
  3   | 
  4   | async function addFeeding(page: Page) {
  5   |   await page.getByLabel('Type').selectOption('Feeding')
  6   |   await page.getByLabel('Duration (min)').fill('120')
  7   |   await page.getByLabel('Notes').fill('Bottle')
  8   |   await page.getByRole('button', { name: 'Add activity' }).click()
  9   | }
  10  | 
  11  | async function addSleep(page: Page) {
  12  |   await page.getByLabel('Type').selectOption('Sleep')
  13  |   await page.getByLabel('Duration (min)').fill('45')
  14  |   await page.getByRole('button', { name: 'Add activity' }).click()
  15  | }
  16  | 
  17  | async function addDiaper(page: Page) {
  18  |   await page.getByLabel('Type').selectOption('Diaper')
  19  |   await page.getByRole('button', { name: 'Add activity' }).click()
  20  | }
  21  | 
  22  | test('[A1] empty app shows heading and placeholder', async ({ page }) => {
  23  |   await page.goto('/')
  24  |   await expect(page.getByRole('heading', { name: 'Baby Activity Log' })).toBeVisible()
  25  |   await expect(page.getByText('No activities yet')).toBeVisible()
  26  | })
  27  | 
  28  | test('[A2] adding a feeding with duration and notes', async ({ page }) => {
  29  |   await page.goto('/')
  30  |   await addFeeding(page)
  31  |   // 'Bottle' is unique, so its textContent must carry the item text.
  32  |   await expect(page.getByText('Bottle')).toHaveText(/Feeding/)
  33  |   await expect(page.getByText('Bottle')).toHaveText(/2h 0m/)
  34  |   await expect(page.getByText('No activities yet')).toHaveCount(0)
  35  | })
  36  | 
  37  | test('[A3] adding a sleep with a duration', async ({ page }) => {
  38  |   await page.goto('/')
  39  |   await addSleep(page)
  40  |   // 'Sleep' is unique, so its textContent must carry the duration.
  41  |   await expect(page.getByText('Sleep').first()).toHaveText(/45m/)
  42  | })
  43  | 
  44  | test('[A4] adding a diaper without a duration shows an em dash', async ({ page }) => {
  45  |   await page.goto('/')
  46  |   await addDiaper(page)
  47  |   // 'Diaper' is unique, so its textContent must carry the dash.
  48  |   await expect(page.getByText('Diaper').first()).toHaveText(/—/)
  49  | })
  50  | 
  51  | test('[A5] the Feeding filter shows only the feeding', async ({ page }) => {
> 52  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  53  |   await addFeeding(page)
  54  |   await addSleep(page)
  55  |   await addDiaper(page)
  56  |   await page.getByRole('button', { name: 'Feeding' }).click()
  57  |   await expect(page.getByText('Feeding').first()).toBeVisible()
  58  |   await expect(page.getByText('Sleep')).not.toBeVisible()
  59  |   await expect(page.getByText('Diaper')).not.toBeVisible()
  60  | })
  61  | 
  62  | test('[A6] the All filter shows every entry', async ({ page }) => {
  63  |   await page.goto('/')
  64  |   await addFeeding(page)
  65  |   await addSleep(page)
  66  |   await addDiaper(page)
  67  |   await page.getByRole('button', { name: 'Feeding' }).click()
  68  |   await page.getByRole('button', { name: 'All' }).click()
  69  |   await expect(page.getByText('Feeding').first()).toBeVisible()
  70  |   await expect(page.getByText('Sleep').first()).toBeVisible()
  71  |   await expect(page.getByText('Diaper').first()).toBeVisible()
  72  | })
  73  | 
  74  | test('[A7] deleting the feeding removes only that entry', async ({ page }) => {
  75  |   await page.goto('/')
  76  |   await addFeeding(page)
  77  |   await addSleep(page)
  78  |   await addDiaper(page)
  79  |   await page.getByRole('button', { name: 'Delete Feeding' }).click()
  80  |   await expect(page.getByText('Feeding')).not.toBeVisible()
  81  |   await expect(page.getByText('Sleep').first()).toBeVisible()
  82  |   await expect(page.getByText('Diaper').first()).toBeVisible()
  83  | })
  84  | 
  85  | test('[A8] exporting a CSV contains the header and the feeding row', async ({ page }) => {
  86  |   await page.goto('/')
  87  |   await addFeeding(page)
  88  |   const [download] = await Promise.all([
  89  |     page.waitForEvent('download'),
  90  |     page.getByRole('button', { name: 'Export CSV' }).click(),
  91  |   ])
  92  |   const contents = await readFile(await download.path(), 'utf8')
  93  |   const lines = contents.trim().split('\n')
  94  |   expect(lines[0]).toBe('type,timestamp,duration,notes')
  95  |   expect(lines[1]).toContain('Feeding')
  96  |   expect(lines[1]).toContain('Bottle')
  97  | })
  98  | 
  99  | test('[A9] entries persist across a reload', async ({ page }) => {
  100 |   await page.goto('/')
  101 |   await addSleep(page)
  102 |   await page.reload()
  103 |   // 'Sleep' is unique, so its textContent must carry the duration.
  104 |   await expect(page.getByText('Sleep').first()).toHaveText(/45m/)
  105 | })
  106 | 
```