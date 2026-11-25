import { expect, test, type Page } from '@playwright/test'

async function evaluate(page: Page, expression: string) {
  await page.getByLabel('Expression', { exact: true }).fill(expression)
  await page.getByRole('button', { name: 'Evaluate' }).click()
}

test('[A1] page shows heading and intro text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Scientific Calculator' })).toBeVisible()
  await expect(page.getByText('Enter an expression')).toBeVisible()
})

test('[A2] 2 + 3 * 4 evaluates to 14', async ({ page }) => {
  await page.goto('/')
  await evaluate(page, '2 + 3 * 4')
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue('14')
})

test('[A3] sin(30) in degrees evaluates to 0.5', async ({ page }) => {
  await page.goto('/')
  await evaluate(page, 'sin(30)')
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue('0.5')
})

test('[A4] log(1000) evaluates to 3', async ({ page }) => {
  await page.goto('/')
  await evaluate(page, 'log(1000)')
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue('3')
})

test('[A5] 2 ^ 10 evaluates to 1024', async ({ page }) => {
  await page.goto('/')
  await evaluate(page, '2 ^ 10')
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue('1024')
})

test('[A6] chart of sin(x) has x=30, y=0.5 in degrees and x=30, y=-0.988 in radians', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Angle mode').selectOption({ label: 'Degrees' })
  await evaluate(page, 'sin(x)')
  await page.getByRole('tab', { name: 'Chart' }).click()
  await expect(page.locator('[aria-label="x=30, y=0.5"]')).toBeVisible()
  await page.getByLabel('Angle mode').selectOption({ label: 'Radians' })
  await evaluate(page, 'sin(x)')
  await expect(page.locator('[aria-label="x=30, y=-0.988"]')).toBeVisible()
})

test('[A7] Copy result copies 5 to the clipboard after evaluating 2 + 3', async ({ page, context }) => {
  await page.goto('/')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await evaluate(page, '2 + 3')
  await page.getByRole('button', { name: 'Copy result' }).click()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('5')
})

test('[A8] history shows 2 + 3 = 5 and Clear history empties it', async ({ page }) => {
  await page.goto('/')
  await evaluate(page, '2 + 3')
  await expect(page.getByText('2 + 3 = 5')).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('No history')).toBeVisible()
})

test('[A9] reload keeps expression 2 + 3 and the history item', async ({ page }) => {
  await page.goto('/')
  await evaluate(page, '2 + 3')
  await expect(page.getByText('2 + 3 = 5')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Expression', { exact: true })).toHaveValue('2 + 3')
  await expect(page.getByText('2 + 3 = 5')).toBeVisible()
})
