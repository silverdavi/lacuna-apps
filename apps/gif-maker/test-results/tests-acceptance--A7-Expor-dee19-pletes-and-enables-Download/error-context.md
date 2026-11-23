# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A7] Export GIF completes and enables Download
- Location: tests/acceptance.spec.ts:60:1

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
  3   | const summary = (page: Page) => page.getByText(/Frames: /)
  4   | 
  5   | test('[A1] page heading and drop zone text', async ({ page }) => {
  6   |   await page.goto('/')
  7   |   await expect(page.getByRole('heading', { name: 'GIF Maker' })).toBeVisible()
  8   |   await expect(page.getByText('Drop images or video here')).toBeVisible()
  9   | })
  10  | 
  11  | test('[A2] Add sample frames adds three frames', async ({ page }) => {
  12  |   await page.goto('/')
  13  |   await page.getByRole('button', { name: 'Add sample frames' }).click()
  14  |   await expect(page.getByText('frame-1.png')).toBeVisible()
  15  |   await expect(page.getByText('frame-2.png')).toBeVisible()
  16  |   await expect(page.getByText('frame-3.png')).toBeVisible()
  17  |   await expect(summary(page)).toHaveText('Frames: 3')
  18  | })
  19  | 
  20  | test('[A3] applying frame delay updates the summary', async ({ page }) => {
  21  |   await page.goto('/')
  22  |   await page.getByRole('button', { name: 'Add sample frames' }).click()
  23  |   await page.getByLabel('Frame delay (ms)').fill('200')
  24  |   await page.getByRole('button', { name: 'Apply' }).click()
  25  |   await expect(summary(page)).toHaveText('Frames: 3, Delay: 200ms')
  26  | })
  27  | 
  28  | test('[A4] deleting a frame updates the list and summary', async ({ page }) => {
  29  |   await page.goto('/')
  30  |   await page.getByRole('button', { name: 'Add sample frames' }).click()
  31  |   await page.getByRole('button', { name: 'Delete frame-2.png' }).click()
  32  |   await expect(page.getByText('frame-2.png')).toHaveCount(0)
  33  |   await expect(page.getByText('frame-1.png')).toBeVisible()
  34  |   await expect(page.getByText('frame-3.png')).toBeVisible()
  35  |   await expect(summary(page)).toHaveText('Frames: 2')
  36  | })
  37  | 
  38  | test('[A5] Settings tab shows Width 800 and Height 600, Frames tab returns to list', async ({ page }) => {
  39  |   await page.goto('/')
  40  |   await page.getByRole('tab', { name: 'Settings' }).click()
  41  |   await expect(page.getByLabel('Width')).toHaveValue('800')
  42  |   await expect(page.getByLabel('Height')).toHaveValue('600')
  43  |   await page.getByRole('tab', { name: 'Frames' }).click()
  44  |   await expect(page.getByText('Drop images or video here')).toBeVisible()
  45  | })
  46  | 
  47  | test('[A6] applying size updates the summary', async ({ page }) => {
  48  |   await page.goto('/')
  49  |   await page.getByRole('button', { name: 'Add sample frames' }).click()
  50  |   await page.getByLabel('Frame delay (ms)').fill('200')
  51  |   await page.getByRole('button', { name: 'Apply' }).click()
  52  |   await page.getByRole('button', { name: 'Delete frame-2.png' }).click()
  53  |   await page.getByRole('tab', { name: 'Settings' }).click()
  54  |   await page.getByLabel('Width').fill('400')
  55  |   await page.getByLabel('Height').fill('300')
  56  |   await page.getByRole('button', { name: 'Apply' }).click()
  57  |   await expect(summary(page)).toHaveText('Frames: 2, Delay: 200ms, Size: 400x300')
  58  | })
  59  | 
  60  | test('[A7] Export GIF completes and enables Download', async ({ page }) => {
> 61  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  62  |   await page.getByRole('button', { name: 'Add sample frames' }).click()
  63  |   await page.getByRole('button', { name: 'Export GIF' }).click()
  64  |   await expect(page.getByText('GIF ready: gif-maker-800x600.gif')).toBeVisible()
  65  |   await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
  66  | })
  67  | 
  68  | test('[A8] Download copies the filename and shows a toast', async ({ page }) => {
  69  |   await page.goto('/')
  70  |   await page.getByRole('button', { name: 'Add sample frames' }).click()
  71  |   await page.getByRole('button', { name: 'Export GIF' }).click()
  72  |   await expect(page.getByText('GIF ready: gif-maker-800x600.gif')).toBeVisible()
  73  |   await page.getByRole('button', { name: 'Download' }).click()
  74  |   await expect(page.getByText('Copied to clipboard')).toBeVisible()
  75  | })
  76  | 
  77  | test('[A9] reload keeps the frame list and settings', async ({ page }) => {
  78  |   await page.goto('/')
  79  |   await page.getByRole('button', { name: 'Add sample frames' }).click()
  80  |   await page.getByLabel('Frame delay (ms)').fill('200')
  81  |   await page.getByRole('button', { name: 'Apply' }).click()
  82  |   await page.getByRole('button', { name: 'Delete frame-2.png' }).click()
  83  |   await page.getByRole('tab', { name: 'Settings' }).click()
  84  |   await page.getByLabel('Width').fill('400')
  85  |   await page.getByLabel('Height').fill('300')
  86  |   await page.getByRole('button', { name: 'Apply' }).click()
  87  |   await page.reload()
  88  |   await expect(summary(page)).toHaveText('Frames: 2, Delay: 200ms, Size: 400x300')
  89  |   await expect(page.getByText('frame-1.png')).toBeVisible()
  90  |   await expect(page.getByText('frame-3.png')).toBeVisible()
  91  | })
  92  | 
  93  | test('[A10] History tab shows empty state before any export', async ({ page }) => {
  94  |   await page.goto('/')
  95  |   await page.getByRole('tab', { name: 'History' }).click()
  96  |   await expect(page.getByText('No GIFs exported')).toBeVisible()
  97  |   await expect(page.getByRole('button', { name: 'Go to Frames' })).toBeVisible()
  98  | })
  99  | 
  100 | test('[A11] Exporting and downloading adds an entry to History', async ({ page }) => {
  101 |   await page.goto('/')
  102 |   await page.getByRole('button', { name: 'Add sample frames' }).click()
  103 |   await page.getByRole('button', { name: 'Export GIF' }).click()
  104 |   await expect(page.getByText('GIF ready: gif-maker-800x600.gif')).toBeVisible()
  105 |   await page.getByRole('button', { name: 'Download' }).click()
  106 |   await page.getByRole('tab', { name: 'History' }).click()
  107 |   await expect(page.getByText('gif-maker-800x600.gif')).toBeVisible()
  108 |   await expect(page.getByText('3 frames, 100ms, 800x600')).toBeVisible()
  109 | })
  110 | 
  111 | test('[A12] Multiple exports stack in History newest first', async ({ page }) => {
  112 |   await page.goto('/')
  113 |   await page.getByRole('button', { name: 'Add sample frames' }).click()
  114 |   await page.getByRole('button', { name: 'Export GIF' }).click()
  115 |   await expect(page.getByText('GIF ready: gif-maker-800x600.gif')).toBeVisible()
  116 |   await page.getByRole('button', { name: 'Download' }).click()
  117 |   await page.getByLabel('Frame delay (ms)').fill('200')
  118 |   await page.getByRole('button', { name: 'Apply' }).click()
  119 |   await page.getByRole('button', { name: 'Export GIF' }).click()
  120 |   await expect(page.getByText('GIF ready: gif-maker-800x600.gif')).toBeVisible()
  121 |   await page.getByRole('button', { name: 'Download' }).click()
  122 |   await page.getByRole('tab', { name: 'History' }).click()
  123 |   await expect(page.getByText('3 frames, 200ms, 800x600')).toBeVisible()
  124 |   await expect(page.getByText('3 frames, 100ms, 800x600')).toBeVisible()
  125 | })
  126 | 
  127 | test('[A13] History empty state action returns to Frames tab', async ({ page }) => {
  128 |   await page.goto('/')
  129 |   await page.getByRole('tab', { name: 'History' }).click()
  130 |   await expect(page.getByText('No GIFs exported')).toBeVisible()
  131 |   await page.getByRole('button', { name: 'Go to Frames' }).click()
  132 |   await expect(page.getByText('Drop images or video here')).toBeVisible()
  133 | })
  134 | 
```