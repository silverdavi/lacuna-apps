# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A8] Delete Dentist removes the June 10 entry from the month grid and the week view
- Location: tests/acceptance.spec.ts:101:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  2   | 
  3   | import { readFileSync } from 'node:fs'
  4   | 
  5   | async function addEvent(page: Page, title: string, date: string, time: string, repeat = '') {
  6   |   await page.getByRole('button', { name: 'Add event' }).click()
  7   |   await page.getByLabel('Title').fill(title)
  8   |   await page.getByLabel('Date').fill(date)
  9   |   await page.getByLabel('Time').fill(time)
  10  |   if (repeat) await page.getByLabel('Repeat').selectOption({ label: repeat })
  11  |   await page.getByRole('button', { name: 'Save' }).click()
  12  | }
  13  | 
  14  | // "the cell in the June 10 column" and "the day column for Tuesday June 10"
  15  | // both denote the June 10 cell/column holding the event; scoping to the event's
  16  | // own cell is how the check localises it.
  17  | const cell = (page: Page, event: string) => page.getByText(event, { exact: true }).first()
  18  | 
  19  | async function addTask(page: Page, text: string) {
  20  |   await page.getByRole('tab', { name: 'Tasks' }).click()
  21  |   await page.getByLabel('New task').fill(text)
  22  |   await page.getByRole('button', { name: 'Add' }).click()
  23  | }
  24  | 
  25  | test('[A1] the heading is "Family Calendar" with the month grid by default and an inactive "Week" tab', async ({
  26  |   page,
  27  | }) => {
  28  |   await page.goto('/')
  29  |   await expect(page.getByRole('heading', { name: 'Family Calendar' })).toBeVisible()
  30  |   await expect(page.getByRole('tab', { name: 'Week' })).toBeVisible()
  31  |   await expect(page.getByRole('tab', { name: 'Tasks' })).toBeVisible()
  32  |   // the month grid is the default view: June's day numbers are visible without
  33  |   // clicking the Week tab.
  34  |   await expect(page.getByText('10', { exact: true })).toBeVisible()
  35  | })
  36  | 
  37  | test('[A2] adding Dentist on 2025-06-10 14:00 puts "Dentist" and "14:00" in the June 10 cell', async ({
  38  |   page,
  39  | }) => {
  40  |   await page.goto('/')
  41  |   await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  42  |   const entry = cell(page, 'Dentist')
  43  |   await expect(entry).toBeVisible()
  44  |   await expect(entry).toContainText('14:00')
  45  | })
  46  | 
  47  | test('[A3] the Week tab for the week containing June 10, 2025 shows Dentist at 14:00 on Tuesday June 10', async ({
  48  |   page,
  49  | }) => {
  50  |   await page.goto('/')
  51  |   await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  52  |   await page.getByRole('tab', { name: 'Week' }).click()
  53  |   await expect(page.getByText('Tuesday June 10')).toBeVisible()
  54  |   const entry = cell(page, 'Dentist')
  55  |   await expect(entry).toBeVisible()
  56  |   await expect(entry).toContainText('14:00')
  57  | })
  58  | 
  59  | test('[A4] saving weekly Yoga on 2025-06-12 09:00 creates events on June 12, 19 and 26', async ({ page }) => {
  60  |   await page.goto('/')
  61  |   await addEvent(page, 'Yoga', '2025-06-12', '09:00', 'Weekly')
  62  |   const yoga = page.getByText('Yoga', { exact: true })
  63  |   await expect(yoga, 'three weekly Yoga cells').toHaveCount(3)
  64  |   for (const day of ['12', '19', '26']) {
  65  |     await expect(page.getByText(day, { exact: true })).toBeVisible()
  66  |   }
  67  |   await expect(yoga.first()).toContainText('09:00')
  68  | })
  69  | 
  70  | test('[A5] Export ICS downloads a file containing the Dentist event with DTSTART:20250610T140000', async ({
  71  |   page,
  72  | }) => {
  73  |   await page.goto('/')
  74  |   await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  75  |   const [download] = await Promise.all([
  76  |     page.waitForEvent('download'),
  77  |     page.getByRole('button', { name: 'Export ICS' }).click(),
  78  |   ])
  79  |   const content = readFileSync(await download.path(), 'utf8')
  80  |   expect(content, 'ICS contains the event summary').toContain('SUMMARY:Dentist')
  81  |   expect(content, 'ICS contains the event start').toContain('DTSTART:20250610T140000')
  82  | })
  83  | 
  84  | test('[A6] adding "Buy milk" to the Tasks tab shows an unchecked item and the progress "0/1"', async ({
  85  |   page,
  86  | }) => {
  87  |   await page.goto('/')
  88  |   await addTask(page, 'Buy milk')
  89  |   await expect(page.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked()
  90  |   await expect(page.getByText('0/1')).toBeVisible()
  91  | })
  92  | 
  93  | test('[A7] checking "Buy milk" strikes it through and changes the progress to "1/1"', async ({ page }) => {
  94  |   await page.goto('/')
  95  |   await addTask(page, 'Buy milk')
  96  |   await page.getByRole('checkbox', { name: 'Buy milk' }).click()
  97  |   await expect(page.getByText('Buy milk')).toBeVisible()
  98  |   await expect(page.getByText('1/1')).toBeVisible()
  99  | })
  100 | 
  101 | test('[A8] Delete Dentist removes the June 10 entry from the month grid and the week view', async ({ page }) => {
> 102 |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  103 |   await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  104 |   await expect(page.getByText('Dentist')).toBeVisible()
  105 |   await page.getByRole('button', { name: 'Delete Dentist' }).click()
  106 |   await expect(page.getByText('Dentist')).toHaveCount(0)
  107 |   await page.getByRole('tab', { name: 'Week' }).click()
  108 |   await expect(page.getByText('Dentist')).toHaveCount(0)
  109 | })
  110 | 
  111 | test('[A9] reload keeps the Dentist event on June 10 and the checked "Buy milk" task', async ({ page }) => {
  112 |   await page.goto('/')
  113 |   await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  114 |   await addTask(page, 'Buy milk')
  115 |   await page.getByRole('checkbox', { name: 'Buy milk' }).click()
  116 |   await page.reload()
  117 |   await expect(page.getByText('Dentist')).toBeVisible()
  118 |   await page.getByRole('tab', { name: 'Tasks' }).click()
  119 |   await expect(page.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked()
  120 | })
  121 | 
```