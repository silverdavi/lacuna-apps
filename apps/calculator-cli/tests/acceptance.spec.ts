import { expect, test } from '@playwright/test'

test('[A1] page displays the heading "Expression Calculator"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Expression Calculator' })).toBeVisible()
})

test('[A2] evaluating "2+3*4" shows "14" in the result summary', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('2+3*4')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByText('14')).toBeVisible()
})

test('[A3] sampling "x^2" from 0 to 5 in 5 steps shows a 6-row table ending at x: 5.00, y: 25.00', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Function' }).click()
  await page.getByLabel('Function').fill('x^2')
  await page.getByLabel('Start').fill('0')
  await page.getByLabel('End').fill('5')
  await page.getByLabel('Steps').fill('5')
  await page.getByRole('button', { name: 'Sample' }).click()
  const rows = page.getByRole('table').getByRole('row')
  await expect(rows).toHaveCount(6)
  const lastRow = rows.last()
  await expect(lastRow).toContainText('x: 5.00')
  await expect(lastRow).toContainText('y: 25.00')
})

test('[A4] sampling "x^2" renders a line graph with a data point in the chart area', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Function' }).click()
  await page.getByLabel('Function').fill('x^2')
  await page.getByLabel('Start').fill('0')
  await page.getByLabel('End').fill('5')
  await page.getByLabel('Steps').fill('5')
  await page.getByRole('button', { name: 'Sample' }).click()
  const chart = await page.evaluate(() => {
    const svg = document.querySelector('svg')
    if (svg) {
      return {
        present: true,
        line: svg.querySelectorAll('path, polyline, line').length,
        point: svg.querySelectorAll('circle, ellipse').length,
      }
    }
    const canvas = document.querySelector('canvas')
    return { present: !!canvas, line: 0, point: 0 }
  })
  expect(chart.present, 'chart area renders').toBe(true)
  expect(chart.line + chart.point, 'chart shows a line graph with a point').toBeGreaterThan(0)
})

test('[A5] "Copy result" copies "14" to the clipboard after evaluating "2+3*4"', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Expression').fill('2+3*4')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByText('14')).toBeVisible()
  await page.getByRole('button', { name: 'Copy result' }).click()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('14')
})

test('[A6] history lists "10/2 = 5" first and "2+3*4 = 14" second', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('2+3*4')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await page.getByLabel('Expression').fill('10/2')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('10/2 = 5')
  await expect(items.nth(1)).toContainText('2+3*4 = 14')
})

test('[A7] "Clear history" removes all items and shows "No history"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('2+3*4')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await page.getByLabel('Expression').fill('10/2')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('No history')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A8] precision "2" shows "0.33" when evaluating "1/3"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Precision' }).selectOption('2')
  await page.getByLabel('Expression').fill('1/3')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByText('0.33')).toBeVisible()
})

test('[A9] reload keeps the last evaluated expression "2+3*4" and its result "14"', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('2+3*4')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByText('14')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Expression')).toHaveValue('2+3*4')
  await expect(page.getByText('14')).toBeVisible()
})
