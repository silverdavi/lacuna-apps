# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A5] a second run shows two rows with its date, distance, time and pace
- Location: tests/acceptance.spec.ts:44:1

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
  3   | async function addRun(page: Page, date: string, distance: string, time: string) {
  4   |   await page.getByRole('button', { name: 'Add run' }).click()
  5   |   await page.getByLabel('Date').fill(date)
  6   |   await page.getByLabel('Distance (km)').fill(distance)
  7   |   await page.getByLabel('Time (min)').fill(time)
  8   |   await page.getByRole('button', { name: 'Save run' }).click()
  9   | }
  10  | 
  11  | test('[A1] empty state shows heading and No runs yet text', async ({ page }) => {
  12  |   await page.goto('/')
  13  |   await expect(page.getByRole('heading', { name: 'Running Log' })).toBeVisible()
  14  |   await expect(page.getByText('No runs yet')).toBeVisible()
  15  | })
  16  | 
  17  | test('[A2] adding a run shows a row with date, distance, time and pace', async ({ page }) => {
  18  |   await page.goto('/')
  19  |   await addRun(page, '2024-01-15', '5.2', '28')
  20  |   await expect(page.getByText('No runs yet')).toHaveCount(0)
  21  |   const row = page.getByRole('row').filter({ hasText: '2024-01-15' })
  22  |   await expect(row).toContainText('5.2 km')
  23  |   await expect(row).toContainText('28 min')
  24  |   await expect(row).toContainText('5:24/km')
  25  | })
  26  | 
  27  | test('[A3] deleting the run removes the row and restores No runs yet', async ({ page }) => {
  28  |   await page.goto('/')
  29  |   await addRun(page, '2024-01-15', '5.2', '28')
  30  |   await page.getByRole('button', { name: 'Delete 2024-01-15' }).click()
  31  |   await expect(page.getByRole('row').filter({ hasText: '2024-01-15' })).toHaveCount(0)
  32  |   await expect(page.getByText('No runs yet')).toBeVisible()
  33  | })
  34  | 
  35  | test('[A4] clicking the Distance column header sorts distances descending', async ({ page }) => {
  36  |   await page.goto('/')
  37  |   await addRun(page, '2024-01-15', '5.2', '28')
  38  |   await addRun(page, '2024-01-16', '10.5', '52')
  39  |   await page.getByRole('columnheader', { name: 'Distance' }).click()
  40  |   const first = page.getByRole('row').filter({ hasText: 'km' }).first()
  41  |   await expect(first).toContainText('10.5 km')
  42  | })
  43  | 
  44  | test('[A5] a second run shows two rows with its date, distance, time and pace', async ({ page }) => {
> 45  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  46  |   await addRun(page, '2024-01-15', '5.2', '28')
  47  |   await addRun(page, '2024-01-16', '10.5', '52')
  48  |   await expect(page.getByRole('row').filter({ hasText: 'km' })).toHaveCount(2)
  49  |   const row = page.getByRole('row').filter({ hasText: '2024-01-16' })
  50  |   await expect(row).toContainText('10.5 km')
  51  |   await expect(row).toContainText('52 min')
  52  |   await expect(row).toContainText('4:57/km')
  53  | })
  54  | 
  55  | test('[A6] the Chart tab shows a line chart with a labelled data point', async ({ page }) => {
  56  |   await page.goto('/')
  57  |   await addRun(page, '2024-01-15', '5.2', '28')
  58  |   await page.getByRole('tab', { name: 'Chart' }).click()
  59  |   await expect(page.getByText('Distance over time')).toBeVisible()
  60  |   const point = page.locator('svg').getByText('5.2', { exact: true })
  61  |   await expect(point).toBeVisible()
  62  | })
  63  | 
  64  | test('[A7] Export CSV downloads the run data with the spec header', async ({ page }) => {
  65  |   await page.goto('/')
  66  |   await addRun(page, '2024-01-15', '5.2', '28')
  67  |   const [download] = await Promise.all([
  68  |     page.waitForEvent('download'),
  69  |     page.getByRole('button', { name: 'Export CSV' }).click(),
  70  |   ])
  71  |   const stream = await download.createReadStream()
  72  |   const chunks: Buffer[] = []
  73  |   for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  74  |   const text = Buffer.concat(chunks).toString('utf8')
  75  |   const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  76  |   expect(lines[0]).toBe('date,distance_km,time_min,pace')
  77  |   expect(lines[1]).toBe('2024-01-15,5.2,28,5:24/km')
  78  | })
  79  | 
  80  | test('[A8] search filters rows and shows No runs match when nothing matches', async ({ page }) => {
  81  |   await page.goto('/')
  82  |   await addRun(page, '2024-01-15', '5.2', '28')
  83  |   await addRun(page, '2024-01-16', '10.5', '52')
  84  |   const search = page.getByLabel('Search runs')
  85  |   await search.fill('10.5')
  86  |   await expect(page.getByRole('row').filter({ hasText: '10.5 km' })).toBeVisible()
  87  |   await expect(page.getByRole('row').filter({ hasText: '5.2 km' })).toHaveCount(0)
  88  |   await search.fill('zzz')
  89  |   await expect(page.getByText('No runs match')).toBeVisible()
  90  | })
  91  | 
  92  | test('[A9] reload keeps the run', async ({ page }) => {
  93  |   await page.goto('/')
  94  |   await addRun(page, '2024-01-15', '5.2', '28')
  95  |   await page.reload()
  96  |   const row = page.getByRole('row').filter({ hasText: '2024-01-15' })
  97  |   await expect(row).toContainText('5.2 km')
  98  |   await expect(row).toContainText('28 min')
  99  |   await expect(row).toContainText('5:24/km')
  100 | })
  101 | 
```