# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: acceptance.spec.ts >> [A6] clicking "Delete Clip 1" removes it and the list contains only "Clip 2"
- Location: acceptance.spec.ts:67:1

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
  3   | // Records a clip with the given elapsed duration ("00:02" -> 2000 ms), leaving
  4   | // the app with the clip added to the list.
  5   | async function recordClip(page: Page, durationMs: number) {
  6   |   await page.getByRole('button', { name: 'Record clip' }).click()
  7   |   await page.waitForTimeout(durationMs)
  8   |   await page.getByRole('button', { name: 'Stop recording' }).click()
  9   | }
  10  | 
  11  | // Adds "Clip 1" (00:02) and "Clip 2" (00:03).
  12  | async function addTwoClips(page: Page) {
  13  |   await recordClip(page, 2000)
  14  |   await recordClip(page, 3000)
  15  | }
  16  | 
  17  | const clipItem = (page: Page, name: string) => page.getByRole('listitem', { name: new RegExp(name) })
  18  | 
  19  | test('[A1] page shows the "Soundboard" heading and "No clips yet"', async ({ page }) => {
  20  |   await page.goto('/')
  21  |   await expect(page.getByRole('heading', { name: 'Soundboard' })).toBeVisible()
  22  |   await expect(page.getByText('No clips yet')).toBeVisible()
  23  | })
  24  | 
  25  | test('[A2] recording for 2 seconds adds "Clip 1" with "00:02" and hides "No clips yet"', async ({ page }) => {
  26  |   await page.goto('/')
  27  |   await recordClip(page, 2000)
  28  |   await expect(page.getByText('No clips yet')).toHaveCount(0)
  29  |   const item = clipItem(page, 'Clip 1')
  30  |   await expect(item).toBeVisible()
  31  |   await expect(item).toContainText('Clip 1')
  32  |   await expect(item).toContainText('00:02')
  33  | })
  34  | 
  35  | test('[A3] a second recording adds "Clip 2" with "00:03" and the list has two items', async ({ page }) => {
  36  |   await page.goto('/')
  37  |   await addTwoClips(page)
  38  |   const second = clipItem(page, 'Clip 2')
  39  |   await expect(second).toBeVisible()
  40  |   await expect(second).toContainText('Clip 2')
  41  |   await expect(second).toContainText('00:03')
  42  |   await expect(clipItem(page, 'Clip 1')).toBeVisible()
  43  |   await expect(page.getByRole('listitem')).toHaveCount(2)
  44  | })
  45  | 
  46  | test('[A4] clicking "Play Clip 1" sets the score to "Score: 1" and the best to "Best: 1"', async ({ page }) => {
  47  |   await page.goto('/')
  48  |   await recordClip(page, 2000)
  49  |   await clipItem(page, 'Clip 1').getByRole('button', { name: 'Play Clip 1' }).click()
  50  |   await expect(page.getByText('Score: 1')).toBeVisible()
  51  |   await expect(page.getByText('Best: 1')).toBeVisible()
  52  | })
  53  | 
  54  | test('[A5] pressing "1" (the first clip\'s shortcut) raises the score to "Score: 2" and "Best: 2"', async ({
  55  |   page,
  56  | }) => {
  57  |   await page.goto('/')
  58  |   await recordClip(page, 2000)
  59  |   await clipItem(page, 'Clip 1').getByRole('button', { name: 'Play Clip 1' }).click()
  60  |   await expect(page.getByText('Score: 1')).toBeVisible()
  61  |   await expect(page.getByText('Best: 1')).toBeVisible()
  62  |   await page.keyboard.press('1')
  63  |   await expect(page.getByText('Score: 2')).toBeVisible()
  64  |   await expect(page.getByText('Best: 2')).toBeVisible()
  65  | })
  66  | 
  67  | test('[A6] clicking "Delete Clip 1" removes it and the list contains only "Clip 2"', async ({ page }) => {
> 68  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  69  |   await addTwoClips(page)
  70  |   await clipItem(page, 'Clip 1').getByRole('button', { name: 'Delete Clip 1' }).click()
  71  |   await expect(clipItem(page, 'Clip 1')).toHaveCount(0)
  72  |   await expect(clipItem(page, 'Clip 2')).toBeVisible()
  73  |   await expect(page.getByRole('listitem')).toHaveCount(1)
  74  | })
  75  | 
  76  | test('[A7] clicking "Restart" resets the score to "Score: 0" while keeping "Best: 2"', async ({ page }) => {
  77  |   await page.goto('/')
  78  |   await recordClip(page, 2000)
  79  |   await clipItem(page, 'Clip 1').getByRole('button', { name: 'Play Clip 1' }).click()
  80  |   await page.keyboard.press('1')
  81  |   await expect(page.getByText('Score: 2')).toBeVisible()
  82  |   await expect(page.getByText('Best: 2')).toBeVisible()
  83  |   await page.getByRole('button', { name: 'Restart' }).click()
  84  |   await expect(page.getByText('Score: 0')).toBeVisible()
  85  |   await expect(page.getByText('Best: 2')).toBeVisible()
  86  | })
  87  | 
  88  | test('[A8] clicking "Export list" copies "Clip 1, Clip 2" to the clipboard', async ({ page, context }) => {
  89  |   await page.goto('/')
  90  |   await addTwoClips(page)
  91  |   // grant before the copy click so the clipboard write can succeed
  92  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  93  |   await page.getByRole('button', { name: 'Export list' }).click()
  94  |   // read the clipboard after the user action; no page or storage mutation
  95  |   const text = await page.evaluate(() => navigator.clipboard.readText())
  96  |   expect(text, 'clipboard holds the exported list').toBe('Clip 1, Clip 2')
  97  | })
  98  | 
  99  | test('[A9] reload keeps the clip list and the best score at "Best: 2"', async ({ page }) => {
  100 |   await page.goto('/')
  101 |   await addTwoClips(page)
  102 |   await clipItem(page, 'Clip 1').getByRole('button', { name: 'Play Clip 1' }).click()
  103 |   await page.keyboard.press('1')
  104 |   await expect(page.getByText('Best: 2')).toBeVisible()
  105 |   await clipItem(page, 'Clip 1').getByRole('button', { name: 'Delete Clip 1' }).click()
  106 |   await page.reload()
  107 |   await expect(clipItem(page, 'Clip 1')).toHaveCount(0)
  108 |   await expect(clipItem(page, 'Clip 2')).toBeVisible()
  109 |   await expect(page.getByText('Best: 2')).toBeVisible()
  110 | })
  111 | 
```