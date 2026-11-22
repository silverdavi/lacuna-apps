import { expect, test } from '@playwright/test'

test('[A1] heading and input panel text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Scientific Calculator' })).toBeVisible()
  await expect(page.getByText('Enter an expression')).toBeVisible()
})

test('[A2] evaluates 2 + 3 * 4 to 14', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('2 + 3 * 4')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('14')
})

test('[A3] evaluates sin(30) to 0.5', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('sin(30)')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('0.5')
})

test('[A4] evaluates log(1000) to 3', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('log(1000)')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('3')
})

test('[A5] evaluates 2 ^ 10 to 1024', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('2 ^ 10')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('1024')
})

// The spec names "the chart tab" and gives the y-value at x=30 for each angle
// mode: 0.5 in Degrees, -0.988 in Radians. The chart DOM is unspecified, so
// we confirm the chart surfaces the plotted value in each mode.
test('[A6] chart reflects angle mode for sin(x)', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Expression').fill('sin(x)')
  await page.getByRole('select', { name: 'Angle mode' }).selectOption('Degrees')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  const chartTab = page.getByRole('tab', { name: /chart/i })
  await chartTab.click()
  const degChart = page.locator('svg, canvas').first()
  await expect(degChart).toBeVisible()
  await expect(page.getByText('0.5')).toBeVisible()

  await page.getByRole('select', { name: 'Angle mode' }).selectOption('Radians')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await chartTab.click()
  const radChart = page.locator('svg, canvas').first()
  await expect(radChart).toBeVisible()
  await expect(page.getByText('-0.988')).toBeVisible()
})

test('[A7] copy result copies 5 to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Expression').fill('2 + 3')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('5')
  await page.getByRole('button', { name: 'Copy result' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('5')
})

test('[A8] history shows evaluated item and clear removes it', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('2 + 3')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByText('2 + 3 = 5')).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('No history')).toBeVisible()
})

test('[A9] reload keeps expression and history', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Expression').fill('2 + 3')
  await page.getByRole('button', { name: 'Evaluate' }).click()
  await expect(page.getByText('2 + 3 = 5')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Expression')).toHaveValue('2 + 3')
  await expect(page.getByText('2 + 3 = 5')).toBeVisible()
})
