# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A2] start counts up past 1:50.00 after two seconds
- Location: tests/acceptance.spec.ts:17:1

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
  3   | const DURATION = /^\d+:\d{2}\.\d{2}$/
  4   | 
  5   | const timeDisplay = (page: Page) => page.getByRole('timer')
  6   | 
  7   | // No explicit "Signature" section exists in the spec; the duration pattern is
  8   | // taken from A3, which A4/A7/A8 also use.
  9   | 
  10  | test('[A1] shows the heading and an idle time display', async ({ page }) => {
  11  |   await page.goto('/')
  12  |   await expect(page.getByRole('heading', { name: 'Stopwatch App' })).toBeVisible()
  13  |   const t = timeDisplay(page)
  14  |   await expect(t).toHaveText('0:00.00')
  15  | })
  16  | 
  17  | test('[A2] start counts up past 1:50.00 after two seconds', async ({ page }) => {
> 18  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  19  |   const start = page.getByRole('button', { name: 'Start' })
  20  |   await start.click()
  21  |   await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  22  |   const t = timeDisplay(page)
  23  |   const value = await t.innerText()
  24  |   expect(value, 'timer is running').not.toBe('0:00.00')
  25  |   await page.waitForTimeout(2000)
  26  |   const later = (await t.innerText()).replace(',', '')
  27  |   const toSeconds = (v: string) => {
  28  |     const [m, rest] = v.split(/:/)
  29  |     return Number(m) * 60 + Number(rest)
  30  |   }
  31  |   expect(toSeconds(later)).toBeGreaterThan(110)
  32  | })
  33  | 
  34  | test('[A3] lap while running records Lap 1 with a duration', async ({ page }) => {
  35  |   await page.goto('/')
  36  |   await page.getByRole('button', { name: 'Start' }).click()
  37  |   await page.waitForTimeout(500)
  38  |   await page.getByRole('button', { name: 'Lap' }).click()
  39  |   const item = page.getByRole('listitem', { name: /Lap 1/ })
  40  |   await expect(item).toBeVisible()
  41  |   const m = (await item.innerText()).match(DURATION)
  42  |   expect(m, 'lap duration matches m:ss.cc').toBeTruthy()
  43  | })
  44  | 
  45  | test('[A4] second lap adds Lap 2; two items total', async ({ page }) => {
  46  |   await page.goto('/')
  47  |   await page.getByRole('button', { name: 'Start' }).click()
  48  |   await page.waitForTimeout(300)
  49  |   await page.getByRole('button', { name: 'Lap' }).click()
  50  |   await page.waitForTimeout(300)
  51  |   await page.getByRole('button', { name: 'Lap' }).click()
  52  |   await expect(page.getByRole('listitem', { name: /Lap 1/ })).toBeVisible()
  53  |   const second = page.getByRole('listitem', { name: /Lap 2/ })
  54  |   await expect(second).toBeVisible()
  55  |   const m = (await second.innerText()).match(DURATION)
  56  |   expect(m, 'Lap 2 has a duration').toBeTruthy()
  57  |   await expect(page.getByRole('listitem')).toHaveCount(2)
  58  | })
  59  | 
  60  | test('[A5] stop freezes the time display', async ({ page }) => {
  61  |   await page.goto('/')
  62  |   await page.getByRole('button', { name: 'Start' }).click()
  63  |   await page.waitForTimeout(1200)
  64  |   await page.getByRole('button', { name: 'Stop' }).click()
  65  |   await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  66  |   const t = timeDisplay(page)
  67  |   const v1 = await t.innerText()
  68  |   await page.waitForTimeout(2000)
  69  |   const v2 = await t.innerText()
  70  |   expect(v2).toBe(v1)
  71  | })
  72  | 
  73  | test('[A6] reset clears the display and the lap list', async ({ page }) => {
  74  |   await page.goto('/')
  75  |   await page.getByRole('button', { name: 'Start' }).click()
  76  |   await page.waitForTimeout(400)
  77  |   await page.getByRole('button', { name: 'Lap' }).click()
  78  |   await page.waitForTimeout(200)
  79  |   await page.getByRole('button', { name: 'Reset' }).click()
  80  |   await expect(timeDisplay(page)).toHaveText('0:00.00')
  81  |   await expect(page.getByText('No laps yet')).toBeVisible()
  82  |   await expect(page.getByRole('listitem')).toHaveCount(0)
  83  | })
  84  | 
  85  | test('[A7] laps survive a reload with their durations', async ({ page }) => {
  86  |   await page.goto('/')
  87  |   await page.getByRole('button', { name: 'Start' }).click()
  88  |   await page.waitForTimeout(300)
  89  |   await page.getByRole('button', { name: 'Lap' }).click()
  90  |   await page.waitForTimeout(300)
  91  |   await page.getByRole('button', { name: 'Lap' }).click()
  92  |   const d1 = (await page.getByRole('listitem', { name: /Lap 1/ }).innerText()).match(DURATION)![0]
  93  |   const d2 = (await page.getByRole('listitem', { name: /Lap 2/ }).innerText()).match(DURATION)![0]
  94  |   await page.reload()
  95  |   await expect(page.getByRole('listitem', { name: new RegExp(`Lap 1\\b.*${escapeRegex(d1)}`, 's') })).toBeVisible()
  96  |   await expect(page.getByRole('listitem', { name: new RegExp(`Lap 2\\b.*${escapeRegex(d2)}`, 's') })).toBeVisible()
  97  | })
  98  | 
  99  | test('[A8] copy laps puts the lap list on the clipboard', async ({ page }) => {
  100 |   await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  101 |   await page.goto('/')
  102 |   await page.getByRole('button', { name: 'Start' }).click()
  103 |   await page.waitForTimeout(300)
  104 |   await page.getByRole('button', { name: 'Lap' }).click()
  105 |   await page.waitForTimeout(300)
  106 |   await page.getByRole('button', { name: 'Lap' }).click()
  107 |   await page.getByRole('button', { name: 'Copy laps' }).click()
  108 |   const clip = await page.evaluate(() => navigator.clipboard.readText())
  109 |   expect(clip).toContain('Lap 1')
  110 |   expect(clip).toContain('Lap 2')
  111 |   const d1 = (await page.getByRole('listitem', { name: /Lap 1/ }).innerText()).match(DURATION)![0]
  112 |   const d2 = (await page.getByRole('listitem', { name: /Lap 2/ }).innerText()).match(DURATION)![0]
  113 |   expect(clip).toContain(d1)
  114 |   expect(clip).toContain(d2)
  115 | })
  116 | 
  117 | test('[A9] a single lap survives a reload', async ({ page }) => {
  118 |   await page.goto('/')
```