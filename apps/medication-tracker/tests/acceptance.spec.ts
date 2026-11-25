// Acceptance tests for the medication-tracker app, derived from the spec's checks A1-A9.
// Expected values are copied verbatim from the spec.
import { expect, test, type Page } from '@playwright/test'

async function addMedication(page: Page, name: string, dose: string, time: string) {
  await page.getByLabel('Medication name', { exact: true }).fill(name)
  await page.getByLabel('Dose', { exact: true }).fill(dose)
  await page.getByLabel('Time', { exact: true }).fill(time)
  await page.getByRole('button', { name: 'Add medication' }).click()
}

test('[A1] the page shows the heading and the empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Medication Reminder' })).toBeVisible()
  await expect(page.getByText('No medications yet')).toBeVisible()
})

test('[A2] adding Lisinopril 10 mg 08:00 adds a list item and hides the empty state', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  const item = page.getByRole('list', { name: 'Medications' }).getByRole('listitem')
  await expect(item).toContainText('Lisinopril')
  await expect(item).toContainText('10 mg')
  await expect(item).toContainText('08:00')
  await expect(page.getByText('No medications yet')).toHaveCount(0)
})

test('[A3] logging a dose adds an entry to the Dose log region', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  const log = page.getByRole('region', { name: 'Dose log', exact: true })
  await expect(log.getByText('Lisinopril 10 mg taken at 08:00')).toBeVisible()
})

test('[A4] deleting a medication removes it and its logged doses', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await page.getByRole('button', { name: 'Delete Lisinopril' }).click()
  await expect(page.getByRole('list', { name: 'Medications' }).getByRole('listitem')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Dose log', exact: true }).getByText('No doses logged')).toBeVisible()
})

test('[A5] the History tab shows a table with the logged dose', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  const table = page.getByRole('table')
  for (const header of ['Date', 'Medication', 'Dose', 'Time']) {
    await expect(table.getByRole('columnheader', { name: header, exact: true })).toBeVisible()
  }
  const row = table.getByRole('row').filter({ hasText: 'Lisinopril' })
  await expect(row).toContainText('10 mg')
  await expect(row).toContainText('08:00')
})

test('[A6] Export CSV puts the exact CSV text on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('Medication,Dose,Time\nLisinopril,10 mg,08:00')
})

test('[A7] adding two medications shows both items and an empty dose log', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await addMedication(page, 'Metformin', '500 mg', '12:00')
  const list = page.getByRole('list', { name: 'Medications' })
  await expect(list.getByRole('listitem')).toContainText('Lisinopril')
  await expect(list.getByRole('listitem')).toContainText('Metformin')
  await expect(page.getByRole('region', { name: 'Dose log', exact: true }).getByText('No doses logged')).toBeVisible()
})

test('[A8] searching for "Lis" filters the list down to Lisinopril', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await addMedication(page, 'Metformin', '500 mg', '12:00')
  await page.getByLabel('Search', { exact: true }).fill('Lis')
  await expect(page.getByRole('list', { name: 'Medications' }).getByRole('listitem').filter({ hasText: 'Lisinopril' })).toBeVisible()
  await expect(page.getByText('Metformin')).toHaveCount(0)
})

test('[A9] a reload keeps the medication and its logged dose', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await page.reload()
  const item = page.getByRole('list', { name: 'Medications' }).getByRole('listitem')
  await expect(item).toContainText('Lisinopril')
  await expect(item).toContainText('10 mg')
  await expect(item).toContainText('08:00')
  await expect(page.getByRole('region', { name: 'Dose log', exact: true }).getByText('Lisinopril 10 mg taken at 08:00')).toBeVisible()
})
