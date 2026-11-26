# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A8] switching the Scale to 5.0 changes grade points and the GPA to 4.25
- Location: tests/acceptance.spec.ts:114:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  15  |   await page.goto('/')
  16  |   await expect(page.getByRole('heading', { name: 'GPA Calculator' })).toBeVisible()
  17  |   await expect(page.getByText('No courses yet')).toBeVisible()
  18  |   await expect(page.getByText('GPA: 0.00')).toBeVisible()
  19  | })
  20  | 
  21  | test('[A2] adding Math 101 with 4 credits and grade A shows a 4.00 row and GPA 4.00', async ({ page }) => {
  22  |   await page.goto('/')
  23  |   await addCourse(page, 'Math 101', '4', 'A')
  24  |   await expect(rowOf(page, 'Math 101')).toContainText('4')
  25  |   await expect(rowOf(page, 'Math 101')).toContainText('A')
  26  |   await expect(rowOf(page, 'Math 101')).toContainText('4.00')
  27  |   await expect(page.getByText('GPA: 4.00')).toBeVisible()
  28  | })
  29  | 
  30  | test('[A3] adding Physics 201 with 3 credits and grade B shows a 3.00 row and GPA 3.70', async ({ page }) => {
  31  |   await page.goto('/')
  32  |   await addCourse(page, 'Math 101', '4', 'A')
  33  |   await addCourse(page, 'Physics 201', '3', 'B')
  34  |   await expect(rowOf(page, 'Physics 201')).toContainText('3')
  35  |   await expect(rowOf(page, 'Physics 201')).toContainText('B')
  36  |   await expect(rowOf(page, 'Physics 201')).toContainText('3.00')
  37  |   await expect(page.getByText('GPA: 3.70')).toBeVisible()
  38  | })
  39  | 
  40  | test('[A4] an empty course name is rejected with "Course name is required" and adds no row', async ({ page }) => {
  41  |   await page.goto('/')
  42  |   await page.getByLabel('Course Name').fill('')
  43  |   await page.getByLabel('Credits').fill('4')
  44  |   await page.getByLabel('Grade').selectOption('A')
  45  |   await page.getByRole('button', { name: 'Add Course' }).click()
  46  |   await expect(page.getByText('Course name is required')).toBeVisible()
  47  |   // nothing was added: the table still shows the empty state
  48  |   await expect(page.getByText('No courses yet')).toBeVisible()
  49  | })
  50  | 
  51  | test('[A5] deleting Math 101 leaves only Physics 201 and GPA 3.00', async ({ page }) => {
  52  |   await page.goto('/')
  53  |   await addCourse(page, 'Math 101', '4', 'A')
  54  |   await addCourse(page, 'Physics 201', '3', 'B')
  55  |   await page.getByRole('button', { name: 'Delete Math 101' }).click()
  56  |   await expect(rowOf(page, 'Math 101')).toHaveCount(0)
  57  |   await expect(rowOf(page, 'Physics 201')).toContainText('3')
  58  |   await expect(rowOf(page, 'Physics 201')).toContainText('B')
  59  |   await expect(page.getByText('GPA: 3.00')).toBeVisible()
  60  | })
  61  | 
  62  | test('[A6] the Chart tab shows a bar for each course with height proportional to its grade point', async ({ page }) => {
  63  |   await page.goto('/')
  64  |   await addCourse(page, 'Math 101', '4', 'A')
  65  |   await addCourse(page, 'Physics 201', '3', 'B')
  66  |   await page.getByRole('tab', { name: 'Chart' }).click()
  67  |   // the bar chart renders into a canvas
  68  |   const canvas = page.locator('canvas').first()
  69  |   await expect(canvas).toBeVisible()
  70  |   const dims = await page.evaluate(() => {
  71  |     const c = document.querySelector('canvas')
  72  |     if (!c) throw new Error('no canvas in chart view')
  73  |     return { w: c.width, h: c.height }
  74  |   })
  75  |   // sample columns of pixels; a column of a taller bar has more opaque pixels above it
  76  |   const barPixels = async (x: number) =>
  77  |     page.evaluate(({ w, h, x }) => {
  78  |       const c = document.querySelector('canvas')!
  79  |       const { data } = c.getContext('2d')!.getImageData(0, 0, w, h)
  80  |       let top = -1
  81  |       let count = 0
  82  |       for (let y = 0; y < h; y++) {
  83  |         const a = data[(y * w + x) * 4 + 3]
  84  |         if (a > 0) {
  85  |           count++
  86  |           if (top === -1) top = y
  87  |         }
  88  |       }
  89  |       return { top, count }
  90  |     }, { w: dims.w, h: dims.h, x })
  91  |   // two bars: sample roughly a third and two thirds across the chart width
  92  |   const left = await barPixels(Math.floor(dims.w / 3))
  93  |   const right = await barPixels(Math.floor((2 * dims.w) / 3))
  94  |   expect(left.count).toBeGreaterThan(0)
  95  |   expect(right.count).toBeGreaterThan(0)
  96  |   // Math 101 (4.00) is added first, so it is the left bar; Physics 201 (3.00) the right bar
  97  |   // the left bar must be taller: it has more filled pixels and reaches higher
  98  |   expect(left.count).toBeGreaterThan(right.count)
  99  |   expect(left.top).toBeLessThan(right.top)
  100 | })
  101 | 
  102 | test('[A7] Copy GPA copies "GPA: 3.70" to the clipboard', async ({ page, context }) => {
  103 |   // the user action that copies must happen after the clipboard permission is granted
  104 |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  105 |   await page.goto('/')
  106 |   await addCourse(page, 'Math 101', '4', 'A')
  107 |   await addCourse(page, 'Physics 201', '3', 'B')
  108 |   await page.getByRole('button', { name: 'Copy GPA' }).click()
  109 |   // read the clipboard after the user action; no page or storage mutation
  110 |   const after = await page.evaluate(() => navigator.clipboard.readText())
  111 |   expect(after).toBe('GPA: 3.70')
  112 | })
  113 | 
  114 | test('[A8] switching the Scale to 5.0 changes grade points and the GPA to 4.25', async ({ page }) => {
> 115 |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  116 |   await addCourse(page, 'Math 101', '4', 'A')
  117 |   await addCourse(page, 'Physics 201', '3', 'B')
  118 |   // A -> 5.0, B -> 4.0; (4*5.0 + 3*4.0) / 7 = 4.25
  119 |   await page.getByLabel('Scale').selectOption('5.0')
  120 |   await expect(rowOf(page, 'Math 101')).toContainText('5.00')
  121 |   await expect(rowOf(page, 'Physics 201')).toContainText('4.00')
  122 |   await expect(page.getByText('GPA: 4.25')).toBeVisible()
  123 | })
  124 | 
  125 | test('[A9] reload keeps the added courses and the GPA 3.70', async ({ page }) => {
  126 |   await page.goto('/')
  127 |   await addCourse(page, 'Math 101', '4', 'A')
  128 |   await addCourse(page, 'Physics 201', '3', 'B')
  129 |   await page.reload()
  130 |   await expect(rowOf(page, 'Math 101')).toContainText('A')
  131 |   await expect(rowOf(page, 'Math 101')).toContainText('4.00')
  132 |   await expect(rowOf(page, 'Physics 201')).toContainText('B')
  133 |   await expect(rowOf(page, 'Physics 201')).toContainText('3.00')
  134 |   await expect(page.getByText('GPA: 3.70')).toBeVisible()
  135 | })
  136 | 
```