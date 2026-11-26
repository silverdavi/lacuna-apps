import { expect, test, type Page } from '@playwright/test'

async function addCourse(page: Page, name: string, credits: string, grade: string) {
  await page.getByLabel('Course Name').fill(name)
  await page.getByLabel('Credits').fill(credits)
  await page.getByLabel('Grade').selectOption(grade)
  await page.getByRole('button', { name: 'Add Course' }).click()
}

function rowOf(page: Page, name: string) {
  return page.locator('tr').filter({ has: page.getByRole('cell', { name: name, exact: true }) })
}

test('[A1] empty state shows heading, "No courses yet" and "GPA: 0.00"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'GPA Calculator' })).toBeVisible()
  await expect(page.getByText('No courses yet')).toBeVisible()
  await expect(page.getByText('GPA: 0.00')).toBeVisible()
})

test('[A2] adding Math 101 with 4 credits and grade A shows a 4.00 row and GPA 4.00', async ({ page }) => {
  await page.goto('/')
  await addCourse(page, 'Math 101', '4', 'A')
  await expect(rowOf(page, 'Math 101')).toContainText('4')
  await expect(rowOf(page, 'Math 101')).toContainText('A')
  await expect(rowOf(page, 'Math 101')).toContainText('4.00')
  await expect(page.getByText('GPA: 4.00')).toBeVisible()
})

test('[A3] adding Physics 201 with 3 credits and grade B shows a 3.00 row and GPA 3.70', async ({ page }) => {
  await page.goto('/')
  await addCourse(page, 'Math 101', '4', 'A')
  await addCourse(page, 'Physics 201', '3', 'B')
  await expect(rowOf(page, 'Physics 201')).toContainText('3')
  await expect(rowOf(page, 'Physics 201')).toContainText('B')
  await expect(rowOf(page, 'Physics 201')).toContainText('3.00')
  await expect(page.getByText('GPA: 3.70')).toBeVisible()
})

test('[A4] an empty course name is rejected with "Course name is required" and adds no row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Course Name').fill('')
  await page.getByLabel('Credits').fill('4')
  await page.getByLabel('Grade').selectOption('A')
  await page.getByRole('button', { name: 'Add Course' }).click()
  await expect(page.getByText('Course name is required')).toBeVisible()
  // nothing was added: the table still shows the empty state
  await expect(page.getByText('No courses yet')).toBeVisible()
})

test('[A5] deleting Math 101 leaves only Physics 201 and GPA 3.00', async ({ page }) => {
  await page.goto('/')
  await addCourse(page, 'Math 101', '4', 'A')
  await addCourse(page, 'Physics 201', '3', 'B')
  await page.getByRole('button', { name: 'Delete Math 101' }).click()
  await expect(rowOf(page, 'Math 101')).toHaveCount(0)
  await expect(rowOf(page, 'Physics 201')).toContainText('3')
  await expect(rowOf(page, 'Physics 201')).toContainText('B')
  await expect(page.getByText('GPA: 3.00')).toBeVisible()
})

test('[A6] the Chart tab shows a bar for each course with height proportional to its grade point', async ({ page }) => {
  await page.goto('/')
  await addCourse(page, 'Math 101', '4', 'A')
  await addCourse(page, 'Physics 201', '3', 'B')
  await page.getByRole('tab', { name: 'Chart' }).click()
  // the bar chart renders into a canvas
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
  const dims = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) throw new Error('no canvas in chart view')
    return { w: c.width, h: c.height }
  })
  // sample columns of pixels; a column of a taller bar has more opaque pixels above it
  const barPixels = async (x: number) =>
    page.evaluate(({ w, h, x }) => {
      const c = document.querySelector('canvas')!
      const { data } = c.getContext('2d')!.getImageData(0, 0, w, h)
      let top = -1
      let count = 0
      for (let y = 0; y < h; y++) {
        const a = data[(y * w + x) * 4 + 3]
        if (a > 0) {
          count++
          if (top === -1) top = y
        }
      }
      return { top, count }
    }, { w: dims.w, h: dims.h, x })
  // two bars: sample roughly a third and two thirds across the chart width
  const left = await barPixels(Math.floor(dims.w / 3))
  const right = await barPixels(Math.floor((2 * dims.w) / 3))
  expect(left.count).toBeGreaterThan(0)
  expect(right.count).toBeGreaterThan(0)
  // Math 101 (4.00) is added first, so it is the left bar; Physics 201 (3.00) the right bar
  // the left bar must be taller: it has more filled pixels and reaches higher
  expect(left.count).toBeGreaterThan(right.count)
  expect(left.top).toBeLessThan(right.top)
})

test('[A7] Copy GPA copies "GPA: 3.70" to the clipboard', async ({ page, context }) => {
  // the user action that copies must happen after the clipboard permission is granted
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addCourse(page, 'Math 101', '4', 'A')
  await addCourse(page, 'Physics 201', '3', 'B')
  await page.getByRole('button', { name: 'Copy GPA' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const after = await page.evaluate(() => navigator.clipboard.readText())
  expect(after).toBe('GPA: 3.70')
})

test('[A8] switching the Scale to 5.0 changes grade points and the GPA to 4.25', async ({ page }) => {
  await page.goto('/')
  await addCourse(page, 'Math 101', '4', 'A')
  await addCourse(page, 'Physics 201', '3', 'B')
  // A -> 5.0, B -> 4.0; (4*5.0 + 3*4.0) / 7 = 4.25
  await page.getByLabel('Scale').selectOption('5.0')
  await expect(rowOf(page, 'Math 101')).toContainText('5.00')
  await expect(rowOf(page, 'Physics 201')).toContainText('4.00')
  await expect(page.getByText('GPA: 4.25')).toBeVisible()
})

test('[A9] reload keeps the added courses and the GPA 3.70', async ({ page }) => {
  await page.goto('/')
  await addCourse(page, 'Math 101', '4', 'A')
  await addCourse(page, 'Physics 201', '3', 'B')
  await page.reload()
  await expect(rowOf(page, 'Math 101')).toContainText('A')
  await expect(rowOf(page, 'Math 101')).toContainText('4.00')
  await expect(rowOf(page, 'Physics 201')).toContainText('B')
  await expect(rowOf(page, 'Physics 201')).toContainText('3.00')
  await expect(page.getByText('GPA: 3.70')).toBeVisible()
})
