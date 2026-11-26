import { expect, test, type Page } from '@playwright/test'

const description = (page: Page) => page.getByLabel('Description', { exact: true })
const expression = (page: Page) => page.getByLabel('Cron expression', { exact: true })
const occurrences = (page: Page) => page.getByRole('table', { name: 'Next occurrences', exact: true })

test('[A1] heading "Cron Explainer" and the "Expression to Text" tab are active by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Cron Explainer' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Expression to Text' })).toHaveAttribute('aria-selected', 'true')
})

test('[A2] "0 9 * * 1" shows "At 09:00 on Monday" and the first occurrence row has 2025-01-06 and 09:00', async ({ page }) => {
  await page.goto('/')
  await expression(page).fill('0 9 * * 1')
  await expect(description(page)).toContainText('At 09:00 on Monday')
  const table = occurrences(page)
  await expect(table).toBeVisible()
  await expect(table.getByRole('row')).toHaveCount(6) // header + the five occurrences the app shows
  const firstRow = table.getByRole('row').nth(1)
  await expect(firstRow).toContainText(/^2025-01-06\s+09:00/m)
})

test('[A3] "*/15 8-10 * * *" shows "Every 15 minutes between 08:00 and 10:00" and the first occurrence row has 08:00', async ({ page }) => {
  await page.goto('/')
  await expression(page).fill('*/15 8-10 * * *')
  await expect(description(page)).toContainText('Every 15 minutes between 08:00 and 10:00')
  const table = occurrences(page)
  await expect(table).toBeVisible()
  // the spec fixes only the time of the first row, so assert it without anchoring to a date
  await expect(table.getByRole('row').nth(1)).toContainText(/08:00/)
})

test('[A4] "Copy description" after entering "0 9 * * 1" shows the toast "Description copied"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await expression(page).fill('0 9 * * 1')
  await page.getByRole('button', { name: 'Copy description' }).click()
  await expect(page.getByText('Description copied')).toBeVisible()
})

// The spec calls the Time field a <select> ("selecting" an option), which cannot take a text fill;
// a datetime-local input is the only time widget that accepts fill() as well as selecting 09:00,
// so the test tries both: fill first, then selectOption if the control is a select.
async function setTime(page: Page, value: string) {
  const time = page.getByLabel('Time', { exact: true })
  const tag = await time.evaluate((el) => el.tagName)
  if (tag === 'SELECT') await time.selectOption(value)
  else await time.fill(value)
}

test('[A5] Text to Expression: "Every day" at 09:00 generates "0 9 * * *"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Text to Expression' }).click()
  await page.getByLabel('Frequency', { exact: true }).selectOption({ label: 'Every day' })
  await setTime(page, '09:00')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(expression(page)).toHaveValue('0 9 * * *')
})

test('[A6] Text to Expression: "Weekly" with Monday at 14:30 generates "30 14 * * 1"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Text to Expression' }).click()
  await page.getByLabel('Frequency', { exact: true }).selectOption({ label: 'Weekly' })
  await page.getByRole('checkbox', { name: 'Monday' }).click()
  await setTime(page, '14:30')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(expression(page)).toHaveValue('30 14 * * 1')
})

test('[A7] "99 99 * * *" shows "Invalid cron expression" and hides the "Next occurrences" table', async ({ page }) => {
  await page.goto('/')
  await expression(page).fill('99 99 * * *')
  await expect(description(page)).toContainText('Invalid cron expression')
  await expect(occurrences(page)).toBeHidden()
})

test('[A8] "0 0 1 1 *" shows "At 00:00 on January 1" and the first occurrence row has 2025-01-01 and 00:00', async ({ page }) => {
  await page.goto('/')
  await expression(page).fill('0 0 1 1 *')
  await expect(description(page)).toContainText('At 00:00 on January 1')
  const table = occurrences(page)
  await expect(table).toBeVisible()
  const firstRow = table.getByRole('row').nth(1)
  await expect(firstRow).toContainText(/2025-01-01\s+00:00/)
})

test('[A9] reload keeps "0 9 * * 1" in the expression field and "At 09:00 on Monday" in the description', async ({ page }) => {
  await page.goto('/')
  await expression(page).fill('0 9 * * 1')
  await page.reload()
  await expect(expression(page)).toHaveValue('0 9 * * 1')
  await expect(description(page)).toContainText('At 09:00 on Monday')
})
