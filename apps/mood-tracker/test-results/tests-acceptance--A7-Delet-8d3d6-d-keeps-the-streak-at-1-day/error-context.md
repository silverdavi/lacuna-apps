# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A7] Deleting the first mood removes it and keeps the streak at 1 day
- Location: tests/acceptance.spec.ts:110:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  11  |   await page.goto('/')
  12  |   await page.getByLabel('Mood').selectOption('Calm')
  13  |   await page.getByLabel('Note').fill('Good night')
  14  |   await page.getByRole('button', { name: 'Log mood' }).click()
  15  |   const item = page.getByRole('listitem').filter({ hasText: 'Calm' })
  16  |   await expect(item).toHaveText(/Calm/)
  17  |   await expect(item).toContainText('Good night')
  18  |   await expect(page.getByText('Streak: 1 days')).toBeVisible()
  19  |   await expect(page.getByText('No moods logged yet')).toHaveCount(0)
  20  | })
  21  | 
  22  | test('[A3] Logging a second mood the same day adds an item but keeps the streak at 1 day', async ({ page }) => {
  23  |   await page.goto('/')
  24  |   await page.getByLabel('Mood').selectOption('Calm')
  25  |   await page.getByRole('button', { name: 'Log mood' }).click()
  26  |   await page.getByLabel('Mood').selectOption('Anxious')
  27  |   await page.getByRole('button', { name: 'Log mood' }).click()
  28  |   const items = page.getByRole('listitem')
  29  |   await expect(items).toHaveCount(2)
  30  |   await expect(items.nth(1)).toContainText('Anxious')
  31  |   await expect(page.getByText('Streak: 1 days')).toBeVisible()
  32  | })
  33  | 
  34  | test('[A4] Logging with no mood selected shows an error and adds no item', async ({ page }) => {
  35  |   await page.goto('/')
  36  |   await page.getByRole('button', { name: 'Log mood' }).click()
  37  |   await expect(page.getByText('Select a mood')).toBeVisible()
  38  |   await expect(page.getByRole('listitem')).toHaveCount(0)
  39  | })
  40  | 
  41  | test('[A5] Heatmap shows 7 squares with only today filled using the last logged mood', async ({ page }) => {
  42  |   await page.goto('/')
  43  |   await page.getByLabel('Mood').selectOption('Anxious')
  44  |   await page.getByRole('button', { name: 'Log mood' }).click()
  45  |   const counts = await page.evaluate(() => {
  46  |     const candidates: Element[] = []
  47  |     const groups = document.querySelectorAll('[role="group"]')
  48  |     groups.forEach((g) => candidates.push(g))
  49  |     document.querySelectorAll('svg').forEach((s) => candidates.push(s))
  50  |     const scope = (root: Element): { total: number; filled: number } => {
  51  |       const svgRects = root.querySelectorAll('svg rect')
  52  |       if (svgRects.length === 7) {
  53  |         return {
  54  |           total: svgRects.length,
  55  |           filled: Array.from(svgRects).filter((r) => {
  56  |             const f = r.getAttribute('fill') ?? ''
  57  |             return f && f !== 'none' && f !== 'transparent' && f !== 'currentColor'
  58  |           }).length,
  59  |         }
  60  |       }
  61  |       const btns = root.querySelectorAll('button[aria-pressed]')
  62  |       if (btns.length === 7) {
  63  |         return {
  64  |           total: btns.length,
  65  |           filled: Array.from(btns).filter((b) => b.getAttribute('aria-pressed') === 'true').length,
  66  |         }
  67  |       }
  68  |       const data = root.querySelectorAll('[data-filled]')
  69  |       if (data.length === 7) {
  70  |         return {
  71  |           total: data.length,
  72  |           filled: Array.from(data).filter((b) => b.getAttribute('data-filled') === 'true').length,
  73  |         }
  74  |       }
  75  |       return { total: 0, filled: 0 }
  76  |     }
  77  |     for (const c of candidates) {
  78  |       const s = scope(c)
  79  |       if (s.total === 7) return s
  80  |     }
  81  |     const anyData = document.querySelectorAll('[data-filled]')
  82  |     if (anyData.length === 7) {
  83  |       return {
  84  |         total: 7,
  85  |         filled: Array.from(anyData).filter((b) => b.getAttribute('data-filled') === 'true').length,
  86  |       }
  87  |     }
  88  |     return { total: 0, filled: 0 }
  89  |   })
  90  |   expect(counts.total).toBe(7)
  91  |   expect(counts.filled).toBe(1)
  92  | })
  93  | 
  94  | test('[A6] Trend chart plots a single point at y-value 2 for an Anxious entry', async ({ page }) => {
  95  |   await page.goto('/')
  96  |   await page.getByLabel('Mood').selectOption('Anxious')
  97  |   await page.getByRole('button', { name: 'Log mood' }).click()
  98  |   const chart = await page.evaluate(() => {
  99  |     const svgs = Array.from(document.querySelectorAll('svg'))
  100 |     const candidate = svgs.find((s) => s.querySelector('polyline, path, circle'))
  101 |     if (!candidate) return { found: false, points: 0 }
  102 |     const circles = Array.from(candidate.querySelectorAll('circle'))
  103 |     const dots = Array.from(candidate.querySelectorAll('path, line')).filter((el) => el.getAttribute('stroke-linecap') === 'round')
  104 |     return { found: true, points: circles.length || dots.length }
  105 |   })
  106 |   expect(chart.found).toBe(true)
  107 |   expect(chart.points).toBe(1)
  108 | })
  109 | 
  110 | test('[A7] Deleting the first mood removes it and keeps the streak at 1 day', async ({ page }) => {
> 111 |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  112 |   await page.getByLabel('Mood').selectOption('Calm')
  113 |   await page.getByRole('button', { name: 'Log mood' }).click()
  114 |   await page.getByLabel('Mood').selectOption('Anxious')
  115 |   await page.getByRole('button', { name: 'Log mood' }).click()
  116 |   await page.getByRole('button', { name: 'Delete Calm' }).click()
  117 |   const items = page.getByRole('listitem')
  118 |   await expect(items).toHaveCount(1)
  119 |   await expect(items.first()).toContainText('Anxious')
  120 |   await expect(items.first()).not.toContainText('Calm')
  121 |   await expect(page.getByText('Streak: 1 days')).toBeVisible()
  122 | })
  123 | 
  124 | test('[A8] Moods persist after a reload', async ({ page }) => {
  125 |   await page.goto('/')
  126 |   await page.getByLabel('Mood').selectOption('Calm')
  127 |   await page.getByRole('button', { name: 'Log mood' }).click()
  128 |   await expect(page.getByRole('listitem')).toHaveCount(1)
  129 |   await page.reload()
  130 |   await expect(page.getByRole('listitem')).toHaveCount(1)
  131 |   await expect(page.getByRole('listitem').first()).toContainText('Calm')
  132 |   await expect(page.getByText('Streak: 1 days')).toBeVisible()
  133 |   const filled = await page.evaluate(() => {
  134 |     const group = document.querySelector('[role="group"]')
  135 |     const scope = group ?? document
  136 |     const pressed = scope.querySelectorAll('button[aria-pressed="true"]')
  137 |     if (pressed.length) return pressed.length
  138 |     const dataFilled = scope.querySelectorAll('[data-filled="true"]')
  139 |     if (dataFilled.length) return dataFilled.length
  140 |     const svgRects = document.querySelectorAll('svg rect')
  141 |     return Array.from(svgRects).filter((r) => {
  142 |       const f = r.getAttribute('fill') ?? ''
  143 |       return f && f !== 'none' && f !== 'transparent' && f !== 'currentColor'
  144 |     }).length
  145 |   })
  146 |   expect(filled).toBe(1)
  147 | })
  148 | 
```