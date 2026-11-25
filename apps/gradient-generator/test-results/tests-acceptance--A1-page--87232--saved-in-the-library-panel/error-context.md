# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A1] page shows heading and No gradients saved in the library panel
- Location: tests/acceptance.spec.ts:9:1

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
  3   | const preview = (page: Page) => page.getByRole('status', { name: 'CSS preview' })
  4   | 
  5   | async function addStop(page: Page) {
  6   |   await page.getByRole('button', { name: 'Add stop' }).click()
  7   | }
  8   | 
  9   | test('[A1] page shows heading and No gradients saved in the library panel', async ({ page }) => {
> 10  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  11  |   await expect(page.getByRole('heading', { name: 'Gradient Generator' })).toBeVisible()
  12  |   await expect(page.getByText('No gradients saved')).toBeVisible()
  13  | })
  14  | 
  15  | test('[A2] clicking Add stop once adds Stop 1 with #ff0000 and 0%', async ({ page }) => {
  16  |   await page.goto('/')
  17  |   await addStop(page)
  18  |   const stop = page.getByRole('listitem').filter({ hasText: 'Stop 1' })
  19  |   await expect(stop).toBeVisible()
  20  |   await expect(stop.getByText('#ff0000', { exact: true })).toBeVisible()
  21  |   await expect(stop.getByText('0%', { exact: true })).toBeVisible()
  22  | })
  23  | 
  24  | test('[A3] typing 50 in Stop 1 Position and pressing Enter shows 50% and updates the CSS preview', async ({ page }) => {
  25  |   await page.goto('/')
  26  |   await addStop(page)
  27  |   await page
  28  |     .getByRole('listitem')
  29  |     .filter({ hasText: 'Stop 1' })
  30  |     .getByLabel('Position', { exact: true })
  31  |     .fill('50')
  32  |   await page.keyboard.press('Enter')
  33  |   const stop = page.getByRole('listitem').filter({ hasText: 'Stop 1' })
  34  |   await expect(stop.getByText('50%', { exact: true })).toBeVisible()
  35  |   await expect(preview(page)).toHaveText('linear-gradient(90deg, #ff0000 50%)')
  36  | })
  37  | 
  38  | test('[A4] clicking Add stop twice yields Stop 1 and Stop 2 with the full CSS preview', async ({ page }) => {
  39  |   await page.goto('/')
  40  |   await addStop(page)
  41  |   await addStop(page)
  42  |   const stop1 = page.getByRole('listitem').filter({ hasText: 'Stop 1' })
  43  |   await expect(stop1.getByText('#ff0000', { exact: true })).toBeVisible()
  44  |   await expect(stop1.getByText('0%', { exact: true })).toBeVisible()
  45  |   const stop2 = page.getByRole('listitem').filter({ hasText: 'Stop 2' })
  46  |   await expect(stop2.getByText('#0000ff', { exact: true })).toBeVisible()
  47  |   await expect(stop2.getByText('100%', { exact: true })).toBeVisible()
  48  |   await expect(preview(page)).toHaveText('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)')
  49  | })
  50  | 
  51  | test('[A5] selecting Radial in Type changes the CSS preview to radial-gradient', async ({ page }) => {
  52  |   await page.goto('/')
  53  |   await addStop(page)
  54  |   await addStop(page)
  55  |   await expect(preview(page)).toContainText('linear-gradient')
  56  |   await page.getByLabel('Type').selectOption('Radial')
  57  |   await expect(preview(page)).toHaveText('radial-gradient(circle, #ff0000 0%, #0000ff 100%)')
  58  | })
  59  | 
  60  | test('[A6] clicking Copy CSS puts the CSS preview text on the clipboard and shows the toast', async ({ page, context }) => {
  61  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  62  |   await page.goto('/')
  63  |   await addStop(page)
  64  |   await addStop(page)
  65  |   await page.getByRole('button', { name: 'Copy CSS' }).click()
  66  |   await expect(page.getByRole('status', { name: 'CSS copied' })).toBeVisible()
  67  |   const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  68  |   expect(clipboard).toBe('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)')
  69  | })
  70  | 
  71  | test('[A7] saving Sunset adds a library item and removes No gradients saved', async ({ page }) => {
  72  |   await page.goto('/')
  73  |   await addStop(page)
  74  |   await addStop(page)
  75  |   await page.getByLabel('Name').fill('Sunset')
  76  |   await page.getByRole('button', { name: 'Save gradient' }).click()
  77  |   await expect(page.getByText('No gradients saved')).toHaveCount(0)
  78  |   await expect(page.getByRole('listitem').filter({ hasText: 'Sunset' })).toBeVisible()
  79  | })
  80  | 
  81  | test('[A8] clicking Delete Sunset removes it and No gradients saved returns', async ({ page }) => {
  82  |   await page.goto('/')
  83  |   await addStop(page)
  84  |   await addStop(page)
  85  |   await page.getByLabel('Name').fill('Sunset')
  86  |   await page.getByRole('button', { name: 'Save gradient' }).click()
  87  |   await expect(page.getByRole('listitem').filter({ hasText: 'Sunset' })).toBeVisible()
  88  |   await page.getByRole('button', { name: 'Delete Sunset' }).click()
  89  |   await expect(page.getByText('No gradients saved')).toBeVisible()
  90  | })
  91  | 
  92  | test('[A9] saved Sunset with Stop 1 at 50% survives a reload', async ({ page }) => {
  93  |   await page.goto('/')
  94  |   await addStop(page)
  95  |   await addStop(page)
  96  |   await page
  97  |     .getByRole('listitem')
  98  |     .filter({ hasText: 'Stop 1' })
  99  |     .getByLabel('Position', { exact: true })
  100 |     .fill('50')
  101 |   await page.keyboard.press('Enter')
  102 |   await page.getByLabel('Name').fill('Sunset')
  103 |   await page.getByRole('button', { name: 'Save gradient' }).click()
  104 |   await page.reload()
  105 |   await expect(page.getByRole('listitem').filter({ hasText: 'Sunset' })).toBeVisible()
  106 |   await expect(page.getByRole('listitem').filter({ hasText: 'Stop 1' }).getByText('50%', { exact: true })).toBeVisible()
  107 | })
  108 | 
```