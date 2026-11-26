import { expect, test, type Page } from '@playwright/test'

// The day cell's accessible name is the day number only, so an exact match is
// required to distinguish "15" from e.g. "15th".
const openDay15 = (page: Page) => page.getByRole('button', { name: '15', exact: true })

// Adds a symptom through the form. If the form has a date field the given date
// is set, otherwise the entry falls back to whatever date the form defaults to.
async function addSymptom(
  page: Page,
  name: string,
  severity: string,
  date?: string,
) {
  await page.getByRole('button', { name: 'Add symptom' }).click()
  await page.getByLabel('Symptom name').fill(name)
  await page.getByLabel('Severity').selectOption(severity)
  if (date !== undefined) {
    const dateField = page.getByLabel('Date')
    if ((await dateField.count()) > 0) {
      await dateField.fill(date)
    }
  }
  await page.getByRole('button', { name: 'Save' }).click()
}

const iso = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Symptom Tracker' })).toBeVisible()
  await expect(page.getByText('No symptoms logged yet')).toBeVisible()
})

test('[A2] adding a symptom replaces the empty state', async ({ page }) => {
  await page.goto('/')
  await addSymptom(page, 'Headache', '3')
  await expect(page.getByText('No symptoms logged yet')).not.toBeVisible()
  await expect(page.locator('li').filter({ hasText: 'Headache' })).toContainText('Severity: 3')
})

test('[A3] adding a second symptom keeps both items', async ({ page }) => {
  await page.goto('/')
  await addSymptom(page, 'Headache', '3')
  await addSymptom(page, 'Fatigue', '5')
  await expect(page.locator('li').filter({ hasText: 'Headache' })).toContainText('Severity: 3')
  await expect(page.locator('li').filter({ hasText: 'Fatigue' })).toContainText('Severity: 5')
})

test('[A4] deleting a symptom leaves the other one', async ({ page }) => {
  await page.goto('/')
  await addSymptom(page, 'Headache', '3')
  await addSymptom(page, 'Fatigue', '5')
  await page.getByRole('button', { name: 'Delete Headache' }).click()
  await expect(page.locator('li').filter({ hasText: 'Headache' })).toHaveCount(0)
  await expect(page.locator('li').filter({ hasText: 'Fatigue' })).toContainText('Severity: 5')
  await expect(page.getByText('No symptoms logged yet')).not.toBeVisible()
})

test('[A5] calendar shows an empty selected day', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await openDay15(page).click()
  await expect(page.getByRole('region', { name: 'Day detail' })).toBeVisible()
  await expect(page.getByText('No symptoms on this day')).toBeVisible()
})

test('[A6] day detail shows the symptom logged on that day', async ({ page }) => {
  await page.goto('/')
  // The check is about the 15th of the current month, so the date is computed
  // from today; it is not otherwise dependent on the date.
  const today = new Date()
  await addSymptom(page, 'Headache', '3', iso(new Date(today.getFullYear(), today.getMonth(), 15)))
  await expect(page.locator('li').filter({ hasText: 'Headache' })).toHaveCount(1)
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await openDay15(page).click()
  const detail = page.getByRole('region', { name: 'Day detail' })
  await expect(detail).toBeVisible()
  await expect(detail.getByText('Headache')).toBeVisible()
})

test('[A7] consecutive days build a streak of three', async ({ page }) => {
  await page.goto('/')
  const today = new Date()
  // Three consecutive days ending today; the streak check is about consecutive
  // logging, so the dates are derived from today.
  const dates = [2, 1, 0].map((i) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)))
  const names = ['Cramp', 'Fatigue', 'Headache']
  for (let i = 0; i < 3; i++) {
    await addSymptom(page, names[i], '3', dates[i])
  }
  await page.getByRole('tab', { name: 'Trends' }).click()
  await expect(page.getByText('Current streak: 3 days')).toBeVisible()
})

test('[A8] export copies a CSV of the logged entries', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read'])
  await page.goto('/')
  await addSymptom(page, 'Headache', '3')
  await addSymptom(page, 'Fatigue', '5')
  // clipboard-read is granted so the read below succeeds even though the user
  // activation from the click may already have expired by the time it runs.
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const csv = await page.evaluate(() => navigator.clipboard.readText())
  expect(csv).toContain('Date,Symptom,Severity')
  expect(csv).toContain('Headache')
  expect(csv).toContain('Fatigue')
})

test('[A9] entries survive a reload', async ({ page }) => {
  await page.goto('/')
  await addSymptom(page, 'Headache', '3')
  await page.reload()
  await expect(page.locator('li').filter({ hasText: 'Headache' })).toContainText('Severity: 3')
})
