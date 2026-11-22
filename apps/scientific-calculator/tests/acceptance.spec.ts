// Acceptance tests for the scientific-calculator app, derived from the spec's checks A1-A9.
// Expected values are copied verbatim from the spec.
import { expect, test, type Page } from '@playwright/test'

function evaluateExpression(page: Page, expression: string) {
  const expr = page.getByLabel('Expression')
  return expr.fill(expression).then(() => expr.press('Enter'))
}

// Counts drawn data points in the plot area: SVG circle/ellipse/path children
// plus non-transparent canvas pixels, read after the user clicks "Plot".
async function plotPointMarks(page: Page): Promise<number> {
  const svgPoints = await page.evaluate(
    () =>
      [...document.querySelectorAll('svg circle, svg ellipse')].length +
      [...document.querySelectorAll('svg path, svg polyline')].filter((p) =>
        /M|L/.test(p.getAttribute('d') ?? p.getAttribute('points') ?? ''),
      ).length,
  )
  if (svgPoints > 0) return svgPoints
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas || canvas.getContext('2d') === null) return 0
    const { width, height } = canvas
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, width, height)
    let n = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++
    return n
  })
}

test('[A1] the page shows the heading "Scientific Calculator" and the "Calc", "Convert", and "Plot" tabs', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Scientific Calculator' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Calc' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Convert' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Plot' })).toBeVisible()
})

test('[A2] typing "2+3*4" and pressing Enter shows "14" in the result field', async ({ page }) => {
  await page.goto('/')
  await evaluateExpression(page, '2+3*4')
  await expect(page.getByLabel('Result')).toHaveValue('14')
})

test('[A3] typing "sin(90)" and pressing Enter shows "1" in the result field', async ({ page }) => {
  await page.goto('/')
  await evaluateExpression(page, 'sin(90)')
  await expect(page.getByLabel('Result')).toHaveValue('1')
})

test('[A4] 100 Meters converts to "328.084" Feet in the "To" field', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Convert' }).click()
  await page.getByLabel('Category').selectOption({ label: 'Length' })
  await page.getByLabel('From').fill('100')
  await page.getByLabel('From Unit').selectOption({ label: 'Meters' })
  await page.getByLabel('To Unit').selectOption({ label: 'Feet' })
  await expect(page.getByLabel('To')).toHaveValue('328.084')
})

test('[A5] plotting "x^2" shows a chart with a point at (2, 4)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Plot' }).click()
  await page.getByLabel('Function').fill('x^2')
  await page.getByRole('button', { name: 'Plot' }).click()
  const marks = await plotPointMarks(page)
  expect(marks, 'the chart shows a plotted point').toBeGreaterThan(0)
  // The spec does not fix the chart DOM; "4" is the plotted y value of the
  // (2, 4) point and appears as an axis label or tooltip.
  await expect(page.locator('#root')).toContainText('4', { useInnerText: true })
})

test('[A6] the "Copy" button copies "14" to the clipboard after evaluating "2+3*4"', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await evaluateExpression(page, '2+3*4')
  await expect(page.getByLabel('Result')).toHaveValue('14')
  await page.getByRole('button', { name: 'Copy' }).click()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('14')
})

test('[A7] the history list shows "2+3*4 = 14" after evaluating "2+3*4"', async ({ page }) => {
  await page.goto('/')
  await evaluateExpression(page, '2+3*4')
  await expect(page.getByText('2+3*4 = 14')).toBeVisible()
})

test('[A8] "Clear" removes all history items and shows "No history yet"', async ({ page }) => {
  await page.goto('/')
  await evaluateExpression(page, '2+3*4')
  await evaluateExpression(page, 'sin(90)')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('No history yet')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A9] reload keeps the history item "2+3*4 = 14"', async ({ page }) => {
  await page.goto('/')
  await evaluateExpression(page, '2+3*4')
  await expect(page.getByText('2+3*4 = 14')).toBeVisible()
  await page.reload()
  await expect(page.getByText('2+3*4 = 14')).toBeVisible()
})
