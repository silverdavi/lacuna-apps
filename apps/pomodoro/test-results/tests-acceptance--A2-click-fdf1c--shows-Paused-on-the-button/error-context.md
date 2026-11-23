# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A2] clicking Pause stops the countdown and shows Paused on the button
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
  3   | // The timer display reads "MM:SS".
  4   | const time = (page: Page) => page.getByText(/\d{2}:\d{2}/)
  5   | 
  6   | // Read the current MM:SS display, trimming whitespace.
  7   | async function display(page: Page) {
  8   |   return (await time(page).first().innerText()).trim()
  9   | }
  10  | 
  11  | // The button labelled by the spec's words: Start / Pause / Reset / Switch.
  12  | const button = (page: Page, name: string) => page.getByRole('button', { name })
  13  | 
  14  | // The work-time field, named from the spec's "work time" wording.
  15  | const workTime = (page: Page) => page.getByLabel('Work time')
  16  | 
  17  | test('[A1] clicking Start begins a 25-minute countdown', async ({ page }) => {
  18  |   await page.goto('/')
  19  |   await expect(await display(page)).toBe('25:00')
  20  |   await button(page, 'Start').click()
  21  |   // The countdown must tick down from 25:00 within its test timeout.
  22  |   await expect(async () => {
  23  |     expect(await display(page)).not.toBe('25:00')
  24  |   }).toPass()
  25  | })
  26  | 
  27  | test('[A2] clicking Pause stops the countdown and shows Paused on the button', async ({ page }) => {
> 28  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  29  |   await button(page, 'Start').click()
  30  |   await button(page, 'Pause').click()
  31  |   await expect(button(page, 'Paused')).toBeVisible()
  32  |   await expect(button(page, 'Start')).toHaveCount(0)
  33  |   await expect(button(page, 'Pause')).toHaveCount(0)
  34  |   const frozen = await display(page)
  35  |   await expect(async () => {
  36  |     expect(await display(page)).toBe(frozen)
  37  |   }).toPass()
  38  | })
  39  | 
  40  | test('[A3] clicking Reset stops the countdown and returns to 25:00', async ({ page }) => {
  41  |   await page.goto('/')
  42  |   await button(page, 'Start').click()
  43  |   await button(page, 'Reset').click()
  44  |   await expect(await display(page)).toBe('25:00')
  45  |   await expect(button(page, 'Start')).toBeVisible()
  46  | })
  47  | 
  48  | test('[A4] after the work interval ends the timer switches to a 5-minute break', async ({ page }) => {
  49  |   await page.goto('/')
  50  |   // The spec fixes the work interval at 25 minutes, which is too long to run
  51  |   // inside a test. Use the work-time field to set a 1-minute work interval, run
  52  |   // it down to 00:00, and confirm the app then takes over with the 5-minute break.
  53  |   await workTime(page).fill('1')
  54  |   await expect(async () => {
  55  |     expect(await display(page)).toBe('1:00')
  56  |   }).toPass()
  57  |   await button(page, 'Start').click()
  58  |   await expect(async () => {
  59  |     expect(await display(page)).toBe('00:00')
  60  |   }).toPass()
  61  |   await expect(async () => {
  62  |     expect(await display(page)).toBe('5:00')
  63  |   }).toPass()
  64  | })
  65  | 
  66  | test('[A5] clicking Switch toggles between work and break modes', async ({ page }) => {
  67  |   await page.goto('/')
  68  |   await expect(await display(page)).toBe('25:00')
  69  |   await button(page, 'Switch').click()
  70  |   await expect(await display(page)).toBe('5:00')
  71  |   await button(page, 'Switch').click()
  72  |   await expect(await display(page)).toBe('25:00')
  73  | })
  74  | 
  75  | test('[A6] typing 30 in the work time field changes the interval to 30 minutes', async ({ page }) => {
  76  |   await page.goto('/')
  77  |   await workTime(page).fill('30')
  78  |   await expect(async () => {
  79  |     expect(await display(page)).toBe('30:00')
  80  |   }).toPass()
  81  | })
  82  | 
  83  | test('[A7] the timer updates every second while running', async ({ page }) => {
  84  |   await page.goto('/')
  85  |   await button(page, 'Start').click()
  86  |   // A live per-second timer shows a different value one second on, then the
  87  |   // next. Poll until the display has changed, then confirm it changed again.
  88  |   const start = await display(page)
  89  |   const changed = await expect
  90  |     .poll(async () => (await display(page)) !== start, { timeout: 30_000 })
  91  |     .toBeTruthy()
  92  |   expect(changed, 'the display advanced from the initial value').toBe(true)
  93  |   const first = await display(page)
  94  |   await expect
  95  |     .poll(async () => (await display(page)) !== first, { timeout: 30_000 })
  96  |     .toBeTruthy()
  97  | })
  98  | 
  99  | test('[A8] reopening the app retains the last interval setting', async ({ page }) => {
  100 |   await page.goto('/')
  101 |   await workTime(page).fill('30')
  102 |   await expect(async () => {
  103 |     expect(await display(page)).toBe('30:00')
  104 |   }).toPass()
  105 |   // Close the tab and reopen it. The interval setting is kept in the browser,
  106 |   // so a fresh visit to the app must come back on 30:00.
  107 |   await page.close()
  108 |   const reopened = await page.context().newPage()
  109 |   await reopened.goto('/')
  110 |   await expect(async () => {
  111 |     expect(await display(reopened)).toBe('30:00')
  112 |   }).toPass()
  113 | })
  114 | 
  115 | test('[A9] reload keeps the current interval and state', async ({ page }) => {
  116 |   await page.goto('/')
  117 |   // Work mode, mid-countdown: read the exact remaining value, reload, and the
  118 |   // interval (work) plus that remaining value must come back unchanged.
  119 |   await button(page, 'Start').click()
  120 |   await expect(async () => {
  121 |     expect(await display(page)).not.toBe('25:00')
  122 |   }).toPass()
  123 |   const frozen = await display(page)
  124 |   await page.reload()
  125 |   await expect(async () => {
  126 |     expect(await display(page)).toBe(frozen)
  127 |   }).toPass()
  128 |   // Break mode: switch to the break and reload; the break interval must be
```