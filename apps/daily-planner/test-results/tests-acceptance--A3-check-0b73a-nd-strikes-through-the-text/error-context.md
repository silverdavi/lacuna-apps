# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] checking "Buy milk" shows "1/1" and strikes through the text
- Location: tests/acceptance.spec.ts:30:1

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
  3   | function event(page: Page, title: string) {
  4   |   return page.getByText(title, { exact: true }).first()
  5   | }
  6   | 
  7   | async function addEvent(page: Page, title: string, date: string, time: string) {
  8   |   await page.getByRole('button', { name: 'Add event' }).click()
  9   |   await page.getByLabel('Title').fill(title)
  10  |   await page.getByLabel('Date').fill(date)
  11  |   await page.getByLabel('Time').fill(time)
  12  |   await page.getByRole('button', { name: 'Save' }).click()
  13  | }
  14  | 
  15  | test('[A1] the page shows the heading and both tabs', async ({ page }) => {
  16  |   await page.goto('/')
  17  |   await expect(page.getByRole('heading', { name: 'Daily Planner' })).toBeVisible()
  18  |   await expect(page.getByRole('tab', { name: 'Tasks' })).toBeVisible()
  19  |   await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible()
  20  | })
  21  | 
  22  | test('[A2] adding "Buy milk" shows a checklist item with progress "0/1"', async ({ page }) => {
  23  |   await page.goto('/')
  24  |   await page.getByLabel('New task').fill('Buy milk')
  25  |   await page.getByLabel('New task').press('Enter')
  26  |   await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
  27  |   await expect(page.getByText('0/1', { exact: true })).toBeVisible()
  28  | })
  29  | 
  30  | test('[A3] checking "Buy milk" shows "1/1" and strikes through the text', async ({ page }) => {
> 31  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  32  |   await page.getByLabel('New task').fill('Buy milk')
  33  |   await page.getByLabel('New task').press('Enter')
  34  |   await page.getByRole('checkbox').first().click()
  35  |   await expect(page.getByText('1/1', { exact: true })).toBeVisible()
  36  |   const struck = await page.evaluate(() => {
  37  |     const items = Array.from(document.querySelectorAll('li'))
  38  |     const hit = items.find((li) => li.textContent?.includes('Buy milk'))
  39  |     return hit
  40  |       ? getComputedStyle(hit.querySelector('span, label, div') ?? hit).textDecorationLine
  41  |       : 'none'
  42  |   })
  43  |   expect(struck, 'the task text is struck through').toContain('line-through')
  44  | })
  45  | 
  46  | test('[A4] clicking "Delete Buy milk" removes the item and the progress', async ({ page }) => {
  47  |   await page.goto('/')
  48  |   await page.getByLabel('New task').fill('Buy milk')
  49  |   await page.getByLabel('New task').press('Enter')
  50  |   await expect(page.getByText('0/1', { exact: true })).toBeVisible()
  51  |   await page.getByRole('button', { name: 'Delete Buy milk' }).click()
  52  |   await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toHaveCount(0)
  53  |   await expect(page.getByText('0/1', { exact: true })).toHaveCount(0)
  54  | })
  55  | 
  56  | test('[A5] adding "Team Sync" on 2023-10-25 14:00 shows it in the month view', async ({ page }) => {
  57  |   await page.goto('/')
  58  |   await page.getByRole('tab', { name: 'Calendar' }).click()
  59  |   await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  60  |   await expect(event(page, 'Team Sync')).toBeVisible()
  61  |   await expect(event(page, 'Team Sync')).toContainText('14:00')
  62  |   await expect(page.getByText('October 2023').first()).toBeVisible()
  63  | })
  64  | 
  65  | test('[A6] the Week view shows "Team Sync" in the Wednesday, October 25 column', async ({ page }) => {
  66  |   await page.goto('/')
  67  |   await page.getByRole('tab', { name: 'Calendar' }).click()
  68  |   await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  69  |   await page.getByRole('tab', { name: 'Week' }).click()
  70  |   const column = page.getByRole('columnheader', { name: /Wednesday/ })
  71  |   await expect(column).toBeVisible()
  72  |   await expect(column).toContainText('Team Sync')
  73  | })
  74  | 
  75  | test('[A7] "Export ICS" copies text containing "BEGIN:VEVENT" and "SUMMARY:Team Sync"', async ({ page, context }) => {
  76  |   await page.goto('/')
  77  |   await page.getByRole('tab', { name: 'Calendar' }).click()
  78  |   await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  79  |   // grant before the export click so the clipboard write can succeed
  80  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  81  |   await page.getByRole('button', { name: 'Export ICS' }).click()
  82  |   const text = await page.evaluate(() => navigator.clipboard.readText())
  83  |   expect(text).toContain('BEGIN:VEVENT')
  84  |   expect(text).toContain('SUMMARY:Team Sync')
  85  | })
  86  | 
  87  | test('[A8] setting recurrence to Daily adds "Team Sync" on October 26, 2023', async ({ page }) => {
  88  |   await page.goto('/')
  89  |   await page.getByRole('tab', { name: 'Calendar' }).click()
  90  |   await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  91  |   await event(page, 'Team Sync').click()
  92  |   await page.getByLabel('Recurrence').selectOption('Daily')
  93  |   await page.getByRole('button', { name: 'Save' }).click()
  94  |   // A8: a second "Team Sync" appears on October 26, 2023 in the month view.
  95  |   await expect(page.getByText('Team Sync', { exact: true })).toHaveCount(2)
  96  | })
  97  | 
  98  | test('[A9] the task and the event survive a reload', async ({ page }) => {
  99  |   await page.goto('/')
  100 |   await page.getByLabel('New task').fill('Buy milk')
  101 |   await page.getByLabel('New task').press('Enter')
  102 |   await page.getByRole('tab', { name: 'Calendar' }).click()
  103 |   await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  104 |   await page.reload()
  105 |   await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
  106 |   await expect(event(page, 'Team Sync')).toBeVisible()
  107 | })
  108 | 
```