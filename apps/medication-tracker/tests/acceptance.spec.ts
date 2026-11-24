import { expect, test } from '@playwright/test'

async function addMedication(page: import('@playwright/test').Page, name: string, dose: string, time: string) {
  await page.getByLabel('Medication name').fill(name)
  await page.getByLabel('Dose').fill(dose)
  await page.getByLabel('Time').fill(time)
  await page.getByRole('button', { name: 'Add medication' }).click()
}

test('[A1] shows heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Medication Reminder' })).toBeVisible()
  await expect(page.getByText('No medications yet')).toBeVisible()
})

test('[A2] adding a medication creates a list item', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await expect(page.getByRole('listitem').filter({ hasText: 'Lisinopril' })).toContainText('10 mg')
  await expect(page.getByRole('listitem').filter({ hasText: 'Lisinopril' })).toContainText('08:00')
  await expect(page.getByText('No medications yet')).not.toBeVisible()
})

test('[A3] logging a dose adds an entry to the dose log', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await expect(page.getByRole('region', { name: 'Dose log' })).toContainText('Lisinopril 10 mg taken at 08:00')
})

test('[A4] deleting a medication removes it and its log', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await page.getByRole('button', { name: 'Delete Lisinopril' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Lisinopril' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Dose log' })).toContainText('No doses logged')
})

test('[A5] history tab shows a table with logged doses', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Medication' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Dose' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Time' })).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'Lisinopril' })
  await expect(row).toContainText('10 mg')
  await expect(row).toContainText('08:00')
})

test('[A6] exporting CSV copies the data to the clipboard', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Medication,Dose,Time')
  expect(text).toContain('Lisinopril,10 mg,08:00')
})

test('[A7] two medications show in the list', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await addMedication(page, 'Metformin', '500 mg', '12:00')
  const list = page.getByRole('list')
  await expect(list.getByRole('listitem')).toHaveCount(2)
  await expect(list.getByRole('listitem').filter({ hasText: 'Lisinopril' })).toBeVisible()
  await expect(list.getByRole('listitem').filter({ hasText: 'Metformin' })).toBeVisible()
})

test('[A8] search filters the list', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await addMedication(page, 'Metformin', '500 mg', '12:00')
  await page.getByLabel('Search').fill('Lis')
  await expect(page.getByRole('listitem').filter({ hasText: 'Lisinopril' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Metformin' })).toHaveCount(0)
})

test('[A9] data persists across reload', async ({ page }) => {
  await page.goto('/')
  await addMedication(page, 'Lisinopril', '10 mg', '08:00')
  await page.getByRole('button', { name: 'Log dose' }).click()
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Lisinopril' })).toContainText('10 mg')
  await expect(page.getByRole('listitem').filter({ hasText: 'Lisinopril' })).toContainText('08:00')
  await expect(page.getByRole('region', { name: 'Dose log' })).toContainText('Lisinopril 10 mg taken at 08:00')
})
