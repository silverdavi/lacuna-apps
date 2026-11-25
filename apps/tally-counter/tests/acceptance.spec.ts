import { expect, test, type Page } from '@playwright/test'

async function setGoal(page: Page, value: string) {
  await page.getByLabel('Daily Goal').fill(value)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] the page displays the heading "Tally Counter"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tally Counter' })).toBeVisible()
})

test('[A2] clicking "Add" increments the counter display from "0" to "1"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('0', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('1', { exact: true })).toBeVisible()
})

test('[A3] setting the daily goal to 10 updates the progress indicator to "1/10"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add' }).click()
  await setGoal(page, '10')
  await expect(page.getByText('1/10', { exact: true })).toBeVisible()
})

test('[A4] clicking "Reset" changes the counter to "0" and the progress indicator to "0/10"', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add' }).click()
  await setGoal(page, '10')
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByText('0', { exact: true })).toBeVisible()
  await expect(page.getByText('0/10', { exact: true })).toBeVisible()
})

test('[A5] the "History" tab shows a list containing "Today: 1"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('listitem', { name: 'Today: 1' })).toBeVisible()
})

test('[A6] "Clear History" removes "Today: 1" and shows "No history yet"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Clear History' }).click()
  await expect(page.getByText('Today: 1')).toHaveCount(0)
  await expect(page.getByText('No history yet')).toBeVisible()
})

test('[A7] the heatmap in the "History" tab shows a cell with title "Today: 1"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  // Read-only after a user action: some element must carry the pinned title.
  const titles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[title]')).map((el) => el.getAttribute('title') ?? ''),
  )
  expect(titles, 'a heatmap cell has the title "Today: 1"').toContain('Today: 1')
})

test('[A8] the trend chart in the "History" tab shows a data point with the value "1"', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  // Read-only after a user action: the only value charted is the single count of 1.
  const point = await page.evaluate(() => {
    const byText = Array.from(document.querySelectorAll('text, tspan, circle, rect, path, line')).find(
      (el) => (el.textContent ?? '').trim() === '1',
    )
    if (byText) return true
    const points = document.querySelectorAll(
      'circle, rect, [data-value], [aria-valuenow], [aria-valuetext]',
    )
    return Array.from(points).some((el) => {
      const v = el.getAttribute('data-value') ?? el.getAttribute('aria-valuenow') ?? el.getAttribute('aria-valuetext')
      return v === '1'
    })
  })
  expect(point, 'the trend chart has a data point with the value "1"').toBe(true)
})

test('[A9] reload keeps the counter "1" and the daily goal "10" visible in the main view', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add' }).click()
  await setGoal(page, '10')
  await page.reload()
  await expect(page.getByText('1', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Daily Goal')).toHaveValue('10')
})
