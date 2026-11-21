import { expect, test, type Page } from '@playwright/test'

// The form's date input is labelled "Date" (A6: "the date set to the 15th").
// A5/A6 target the day cell labelled "15" in the current month.
async function addSymptom(
  page: Page,
  name: string,
  severity: string,
  opts: { date?: string; open?: boolean } = {},
) {
  if (opts.open !== false) await page.getByRole('button', { name: 'Add symptom' }).click()
  await page.getByLabel('Symptom name').fill(name)
  await page.getByLabel('Severity').selectOption(severity)
  if (opts.date !== undefined) await page.getByLabel('Date').fill(opts.date)
  await page.getByRole('button', { name: 'Save' }).click()
}

function day15(page: Page) {
  return page.getByRole('cell', { name: '15' }).first()
}

test('[A1] empty app shows the heading and "No symptoms logged yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Symptom Tracker' })).toBeVisible()
  await expect(page.getByText('No symptoms logged yet')).toBeVisible()
})

test('[A2] adding Headache at Severity 3 replaces the empty text with a list item', async ({ page }) => {
  await page.goto('/')
  await addSymptom(page, 'Headache', '3')
  const item = page.getByRole('listitem').filter({ hasText: 'Headache' })
  await expect(item).toContainText('Headache')
  await expect(item).toContainText('Severity: 3')
  await expect(page.getByText('No symptoms logged yet')).toHaveCount(0)
})

test('[A3] adding Fatigue at Severity 5 gives a list with both items', async ({ page }) => {
  await page.goto('/')
  await addSymptom(page, 'Headache', '3')
  await addSymptom(page, 'Fatigue', '5')
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('listitem').filter({ hasText: 'Fatigue' })).toContainText('Severity: 5')
  await expect(page.getByRole('listitem').filter({ hasText: 'Headache' })).toContainText('Severity: 3')
})

test('[A4] Delete Headache removes it and the empty text does not return', async ({ page }) => {
  await page.goto('/')
  await addSymptom(page, 'Headache', '3')
  await addSymptom(page, 'Fatigue', '5')
  await page.getByRole('button', { name: 'Delete Headache' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Headache' })).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Fatigue' })).toBeVisible()
  await expect(page.getByText('No symptoms logged yet')).toHaveCount(0)
})

test('[A5] Calendar tab month grid: day 15 with no entry shows "No symptoms on this day"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await day15(page).click()
  await expect(page.getByText('No symptoms on this day')).toBeVisible()
})

test('[A6] the 15th shows "Headache" in the day detail panel', async ({ page }) => {
  await page.goto('/')
  const day15 = new Date()
  const date = `${day15.getFullYear()}-${String(day15.getMonth() + 1).padStart(2, '0')}-15`
  await addSymptom(page, 'Headache', '3', { date })
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await day15(page).click()
  await expect(page.getByText('Headache').last()).toBeVisible()
})

test('[A7] three consecutive days give the Trends heatmap "Current streak: 3 days"', async ({ page }) => {
  await page.goto('/')
  const today = new Date()
  const iso = (offset: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  await addSymptom(page, 'Headache', '3', { date: iso(2) })
  await addSymptom(page, 'Fatigue', '5', { date: iso(1) })
  await addSymptom(page, 'Nausea', '2', { date: iso(0) })
  await page.getByRole('tab', { name: 'Trends' }).click()
  await expect(page.getByText('Current streak: 3 days')).toBeVisible()
})

test('[A8] Export CSV copies the header and one row per entry', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addSymptom(page, 'Headache', '3', { date: '2026-01-05' })
  await addSymptom(page, 'Fatigue', '5', { date: '2026-01-06' })
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Date,Symptom,Severity')
  expect(text).toContain('Headache')
  expect(text).toContain('3')
  expect(text).toContain('Fatigue')
  expect(text).toContain('5')
})

test('[A9] a logged symptom survives a reload', async ({ page }) => {
  await page.goto('/')
  await addSymptom(page, 'Headache', '3')
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'Headache' })
  await expect(item).toContainText('Headache')
  await expect(item).toContainText('Severity: 3')
})
