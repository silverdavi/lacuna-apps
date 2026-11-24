# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A7] filters workouts by search
- Location: tests/acceptance.spec.ts:100:1

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
  3   | test('[A1] shows heading and empty state', async ({ page }) => {
  4   |   await page.goto('/')
  5   |   await expect(page.getByRole('heading', { name: 'Gym Workout Logger' })).toBeVisible()
  6   |   await expect(page.getByText('No workouts yet')).toBeVisible()
  7   | })
  8   | 
  9   | test('[A2] adds an exercise to a workout', async ({ page }) => {
  10  |   await page.goto('/')
  11  |   await page.getByRole('button', { name: 'Add workout' }).click()
  12  |   await page.getByLabel('Exercise').fill('Bench Press')
  13  |   await page.getByLabel('Reps').fill('8')
  14  |   await page.getByLabel('Weight (lbs)').fill('100')
  15  |   await page.getByLabel('Sets').fill('1')
  16  |   await page.getByRole('button', { name: 'Save exercise' }).click()
  17  |   const row = page.getByRole('row').filter({ hasText: 'Bench Press' })
  18  |   await expect(row.getByText('8')).toBeVisible()
  19  |   await expect(row.getByText('100')).toBeVisible()
  20  |   await expect(row.getByText('1')).toBeVisible()
  21  |   await page.getByRole('button', { name: 'Finish workout' }).click()
  22  |   await expect(page.getByRole('listitem').filter({ hasText: 'Bench Press' })).toBeVisible()
  23  | })
  24  | 
  25  | test('[A3] adds a second exercise and shows the total', async ({ page }) => {
  26  |   await page.goto('/')
  27  |   await page.getByRole('button', { name: 'Add workout' }).click()
  28  |   await page.getByLabel('Exercise').fill('Bench Press')
  29  |   await page.getByLabel('Reps').fill('8')
  30  |   await page.getByLabel('Weight (lbs)').fill('100')
  31  |   await page.getByLabel('Sets').fill('1')
  32  |   await page.getByRole('button', { name: 'Save exercise' }).click()
  33  |   await page.getByLabel('Exercise').fill('Squat')
  34  |   await page.getByLabel('Reps').fill('10')
  35  |   await page.getByLabel('Weight (lbs)').fill('135')
  36  |   await page.getByLabel('Sets').fill('3')
  37  |   await page.getByRole('button', { name: 'Save exercise' }).click()
  38  |   await page.getByRole('button', { name: 'Finish workout' }).click()
  39  |   const item = page.getByRole('listitem').filter({ hasText: 'Bench Press' })
  40  |   await expect(item).toHaveText(/Bench Press/)
  41  |   await expect(item).toHaveText(/Squat/)
  42  |   await expect(item).toHaveText(/2/)
  43  | })
  44  | 
  45  | test('[A4] deletes an exercise from a workout', async ({ page }) => {
  46  |   await page.goto('/')
  47  |   await page.getByRole('button', { name: 'Add workout' }).click()
  48  |   await page.getByLabel('Exercise').fill('Bench Press')
  49  |   await page.getByLabel('Reps').fill('8')
  50  |   await page.getByLabel('Weight (lbs)').fill('100')
  51  |   await page.getByLabel('Sets').fill('1')
  52  |   await page.getByRole('button', { name: 'Save exercise' }).click()
  53  |   await page.getByLabel('Exercise').fill('Squat')
  54  |   await page.getByLabel('Reps').fill('10')
  55  |   await page.getByLabel('Weight (lbs)').fill('135')
  56  |   await page.getByLabel('Sets').fill('3')
  57  |   await page.getByRole('button', { name: 'Save exercise' }).click()
  58  |   await page.getByRole('button', { name: 'Finish workout' }).click()
  59  |   await page.getByRole('button', { name: 'Delete Squat' }).click()
  60  |   const item = page.getByRole('listitem').filter({ hasText: 'Bench Press' })
  61  |   await expect(item).toHaveText(/Bench Press/)
  62  |   await expect(item).not.toHaveText(/Squat/)
  63  |   await expect(item).toHaveText(/1/)
  64  | })
  65  | 
  66  | test('[A5] deletes an entire workout', async ({ page }) => {
  67  |   await page.goto('/')
  68  |   await page.getByRole('button', { name: 'Add workout' }).click()
  69  |   await page.getByLabel('Exercise').fill('Bench Press')
  70  |   await page.getByLabel('Reps').fill('8')
  71  |   await page.getByLabel('Weight (lbs)').fill('100')
  72  |   await page.getByLabel('Sets').fill('1')
  73  |   await page.getByRole('button', { name: 'Save exercise' }).click()
  74  |   await page.getByRole('button', { name: 'Finish workout' }).click()
  75  |   await page.getByRole('button', { name: 'Delete Bench Press' }).click()
  76  |   await expect(page.getByText('No workouts yet')).toBeVisible()
  77  | })
  78  | 
  79  | test('[A6] exports workouts to CSV', async ({ page }) => {
  80  |   await page.goto('/')
  81  |   await page.getByRole('button', { name: 'Add workout' }).click()
  82  |   await page.getByLabel('Exercise').fill('Bench Press')
  83  |   await page.getByLabel('Reps').fill('8')
  84  |   await page.getByLabel('Weight (lbs)').fill('100')
  85  |   await page.getByLabel('Sets').fill('1')
  86  |   await page.getByRole('button', { name: 'Save exercise' }).click()
  87  |   await page.getByRole('button', { name: 'Finish workout' }).click()
  88  |   const [download] = await Promise.all([
  89  |     page.waitForEvent('download'),
  90  |     page.getByRole('button', { name: 'Export CSV' }).click(),
  91  |   ])
  92  |   expect(download.suggestedFilename()).toBe('workouts.csv')
  93  |   const path = await download.path()
  94  |   const fs = await import('node:fs')
  95  |   const content = fs.readFileSync(path, 'utf8')
  96  |   expect(content).toContain('Exercise,Reps,Weight,Sets')
  97  |   expect(content).toContain('Bench Press,8,100,1')
  98  | })
  99  | 
  100 | test('[A7] filters workouts by search', async ({ page }) => {
> 101 |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  102 |   await page.getByRole('button', { name: 'Add workout' }).click()
  103 |   await page.getByLabel('Exercise').fill('Bench Press')
  104 |   await page.getByLabel('Reps').fill('8')
  105 |   await page.getByLabel('Weight (lbs)').fill('100')
  106 |   await page.getByLabel('Sets').fill('1')
  107 |   await page.getByRole('button', { name: 'Save exercise' }).click()
  108 |   await page.getByRole('button', { name: 'Finish workout' }).click()
  109 |   await page.getByRole('button', { name: 'Add workout' }).click()
  110 |   await page.getByLabel('Exercise').fill('Squat')
  111 |   await page.getByLabel('Reps').fill('10')
  112 |   await page.getByLabel('Weight (lbs)').fill('135')
  113 |   await page.getByLabel('Sets').fill('3')
  114 |   await page.getByRole('button', { name: 'Save exercise' }).click()
  115 |   await page.getByRole('button', { name: 'Finish workout' }).click()
  116 |   await page.getByLabel('Search workouts').fill('Squat')
  117 |   await expect(page.getByRole('listitem').filter({ hasText: 'Squat' })).toBeVisible()
  118 |   await expect(page.getByRole('listitem').filter({ hasText: 'Bench Press' })).toHaveCount(0)
  119 |   await page.getByLabel('Search workouts').fill('Bench')
  120 |   await expect(page.getByRole('listitem').filter({ hasText: 'Bench Press' })).toBeVisible()
  121 |   await expect(page.getByRole('listitem').filter({ hasText: 'Squat' })).toHaveCount(0)
  122 | })
  123 | 
  124 | test('[A8] history tab lists workouts and sorts by date descending', async ({ page }) => {
  125 |   await page.goto('/')
  126 |   await page.getByRole('button', { name: 'Add workout' }).click()
  127 |   await page.getByLabel('Exercise').fill('Deadlift')
  128 |   await page.getByLabel('Reps').fill('5')
  129 |   await page.getByLabel('Weight (lbs)').fill('225')
  130 |   await page.getByLabel('Sets').fill('1')
  131 |   await page.getByRole('button', { name: 'Save exercise' }).click()
  132 |   await page.getByRole('button', { name: 'Finish workout' }).click()
  133 |   await page.getByRole('tab', { name: 'History' }).click()
  134 |   await expect(page.getByRole('table')).toBeVisible()
  135 |   await page.getByRole('columnheader', { name: 'Date' }).click()
  136 |   await expect(page.getByText('Deadlift')).toBeVisible()
  137 | })
  138 | 
  139 | test('[A9] workouts persist across reload', async ({ page }) => {
  140 |   await page.goto('/')
  141 |   await page.getByRole('button', { name: 'Add workout' }).click()
  142 |   await page.getByLabel('Exercise').fill('Deadlift')
  143 |   await page.getByLabel('Reps').fill('5')
  144 |   await page.getByLabel('Weight (lbs)').fill('225')
  145 |   await page.getByLabel('Sets').fill('1')
  146 |   await page.getByRole('button', { name: 'Save exercise' }).click()
  147 |   await page.getByRole('button', { name: 'Finish workout' }).click()
  148 |   await page.reload()
  149 |   await expect(page.getByRole('listitem').filter({ hasText: 'Deadlift' })).toBeVisible()
  150 | })
  151 | 
```