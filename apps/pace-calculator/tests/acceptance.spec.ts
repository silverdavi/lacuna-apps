import { expect, test, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/')
}

async function solve(page: Page, target: string, values: Record<string, string>) {
  await page.getByLabel('Solve for').selectOption({ label: target })
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label).fill(value)
  }
}

test('[A1] page shows the heading and the three labelled input fields', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Running Pace Calculator' })).toBeVisible()
  await expect(page.getByLabel('Distance (km)')).toBeVisible()
  await expect(page.getByLabel('Time (min)')).toBeVisible()
  await expect(page.getByLabel('Pace (min/km)')).toBeVisible()
})

test('[A2] solving for pace with 5 km and 30 min shows 6.00', async ({ page }) => {
  await open(page)
  await solve(page, 'Pace', { 'Distance (km)': '5', 'Time (min)': '30' })
  await expect(page.getByLabel('Pace')).toHaveValue('6.00')
})

test('[A3] solving for time with 5 km and 6 min/km shows 30.00', async ({ page }) => {
  await open(page)
  await solve(page, 'Time', { 'Distance (km)': '5', 'Pace (min/km)': '6' })
  await expect(page.getByLabel('Time')).toHaveValue('30.00')
})

test('[A4] solving for distance with 30 min and 6 min/km shows 5.00', async ({ page }) => {
  await open(page)
  await solve(page, 'Distance', { 'Time (min)': '30', 'Pace (min/km)': '6' })
  await expect(page.getByLabel('Distance')).toHaveValue('5.00')
})

test('[A5] solving for pace with 0 km shows the error and leaves the result empty', async ({ page }) => {
  await open(page)
  await solve(page, 'Pace', { 'Distance (km)': '0', 'Time (min)': '30' })
  await expect(page.getByText('Distance must be greater than 0')).toBeVisible()
  await expect(page.getByLabel('Pace')).toHaveValue('')
})

test('[A6] breakdown table has the 5 km / 30 min row and the chart shows a line with x=5, y=6', async ({ page }) => {
  await open(page)
  await solve(page, 'Pace', { 'Distance (km)': '5', 'Time (min)': '30' })
  const row = page.locator('tr', { hasText: '5 km' })
  await expect(row).toBeVisible()
  await expect(row).toHaveText(/30 min/)
  await page.getByRole('tab', { name: 'Chart' }).click()
  await expect(page.locator('[aria-label="x=5, y=6"]')).toBeVisible()
})

test('[A7] clicking Copy result shows the copied toast', async ({ page, context }) => {
  await open(page)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await solve(page, 'Pace', { 'Distance (km)': '5', 'Time (min)': '30' })
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Result copied to clipboard')).toBeVisible()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toContain('6.00')
})

test('[A8] solving for pace with 10 km and 30 min shows 3.00', async ({ page }) => {
  await open(page)
  await solve(page, 'Pace', { 'Distance (km)': '10', 'Time (min)': '30' })
  await expect(page.getByLabel('Pace')).toHaveValue('3.00')
})

test('[A9] reload keeps the last calculation', async ({ page }) => {
  await open(page)
  await solve(page, 'Pace', { 'Distance (km)': '5', 'Time (min)': '30' })
  await expect(page.getByLabel('Pace')).toHaveValue('6.00')
  await page.reload()
  await expect(page.getByLabel('Pace')).toHaveValue('6.00')
  await expect(page.locator('tr', { hasText: '5 km' })).toHaveText(/30 min/)
})
