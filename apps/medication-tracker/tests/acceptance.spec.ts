import { expect, test } from '@playwright/test'

async function addMedication(
  page: import('@playwright/test').Page,
  name: string,
  dose: string,
  time: string,
) {
  await page.getByLabel('Medication name').fill(name)
  await page.getByLabel('Dose').fill(dose)
  await page.getByLabel('Time').fill(time)
  await page.getByRole('button', { name: 'Add medication' }).click()
}

test('[A1] Fresh app shows heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Medication Reminder' })).toBeVisible()
  await expect(page.getByText('No medications yet')).toBeVisible()
})

test('[A2] Adding a medication creates a list item and clears the empty state', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  const item = page.getByRole('listitem').filter({ hasText: 'Lisinopril' })
  await expect(item).toContainText('10 mg')
  await expect(item).toContainText('08:00')
  await expect(page.getByText('No medications yet')).toHaveCount(0)
})

test('[A3] Logging a dose adds an entry to the Dose log section', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await expect(page.getByText('Lisinopril 10 mg taken at 08:00')).toBeVisible()
})

test('[A4] Deleting a medication removes it and clears the Dose log', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await page.getByRole('button', { name: 'Delete Lisinopril' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Lisinopril' })).toHaveCount(0)
  await expect(page.getByText('No doses logged')).toBeVisible()
})

test('[A5] History tab shows a table with Date, Medication, Dose, Time columns and a logged row', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  const table = page.getByRole('table')
  await expect(table.getByRole('columnheader', { name: 'Date' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Medication' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Dose' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Time' })).toBeVisible()
  const row = table.getByRole('row').filter({ hasText: 'Lisinopril' })
  await expect(row).toContainText('10 mg')
  await expect(row).toContainText('08:00')
})

test('[A6] Export CSV copies a CSV with header and medication row to the clipboard', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const csv = await page.evaluate(() => navigator.clipboard.readText())
  expect(csv).toContain('Medication,Dose,Time')
  expect(csv).toContain('Lisinopril,10 mg,08:00')
})

test('[A7] Adding a second medication shows both items and keeps the Dose log empty', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await addMedication(page, 'Metformin', '500 mg', '12:00')
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.first()).toContainText('Lisinopril')
  await expect(items.last()).toContainText('Metformin')
  await expect(page.getByText('No doses logged')).toBeVisible()
})

test('[A8] The Search field filters the medication list', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await addMedication(page, 'Metformin', '500 mg', '12:00')
  await page.getByLabel('Search').fill('Lis')
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('Lisinopril')
  await expect(page.getByRole('listitem').filter({ hasText: 'Metformin' })).toHaveCount(0)
})

test('[A9] Medications and logged doses persist after a reload', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'Lisinopril' })
  await expect(item).toContainText('10 mg')
  await expect(item).toContainText('08:00')
  await expect(page.getByText('Lisinopril 10 mg taken at 08:00')).toBeVisible()
})
