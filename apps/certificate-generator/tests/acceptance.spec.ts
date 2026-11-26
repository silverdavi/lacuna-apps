import { expect, test, type Page } from '@playwright/test'

async function fillForm(page: Page, values: { recipient?: string; course?: string; date?: string; issuer?: string }) {
  if (values.recipient !== undefined) await page.getByLabel('Recipient name').fill(values.recipient)
  if (values.course !== undefined) await page.getByLabel('Course title').fill(values.course)
  if (values.date !== undefined) await page.getByLabel('Date').fill(values.date)
  if (values.issuer !== undefined) await page.getByLabel('Issuer').fill(values.issuer)
}

test('[A1] page heading and default form fields', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Certificate Generator', exact: true })).toBeVisible()
  await expect(page.getByLabel('Recipient name')).toBeVisible()
  await expect(page.getByLabel('Course title')).toBeVisible()
  await expect(page.getByLabel('Date')).toBeVisible()
  await expect(page.getByLabel('Issuer')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate PDF' })).toBeVisible()
})

test('[A2] generating a certificate adds "Alice Smith - Web Development" to the list', async ({ page }) => {
  await page.goto('/')
  await fillForm(page, { recipient: 'Alice Smith', course: 'Web Development', date: '2023-10-15', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()

  await expect(page.locator('text=Alice Smith - Web Development').first()).toBeVisible()
})

test('[A3] Download PDF triggers a download named Alice_Smith_Web_Development.pdf', async ({ page }) => {
  await page.goto('/')
  await fillForm(page, { recipient: 'Alice Smith', course: 'Web Development', date: '2023-10-15', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()

  await expect(page.locator('text=Alice Smith - Web Development').first()).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).first().click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Alice_Smith_Web_Development.pdf')
})

test('[A4] History tab shows a table with Recipient, Course, Date, Issuer and the Alice Smith row', async ({ page }) => {
  await page.goto('/')
  await fillForm(page, { recipient: 'Alice Smith', course: 'Web Development', date: '2023-10-15', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()

  await page.getByRole('tab', { name: 'History' }).click()

  const table = page.getByRole('table')
  await expect(table.getByRole('columnheader', { name: 'Recipient' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Course' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Date' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Issuer' })).toBeVisible()

  const row = table.locator('tr').filter({ hasText: 'Alice Smith' }).first()
  await expect(row.getByRole('cell', { name: 'Alice Smith' })).toBeVisible()
  await expect(row.getByRole('cell', { name: 'Web Development' })).toBeVisible()
  await expect(row.getByRole('cell', { name: '2023-10-15' })).toBeVisible()
  await expect(row.getByRole('cell', { name: 'Acme Corp' })).toBeVisible()
})

test('[A5] Delete removes the Alice Smith row and shows "No certificates yet"', async ({ page }) => {
  await page.goto('/')
  await fillForm(page, { recipient: 'Alice Smith', course: 'Web Development', date: '2023-10-15', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()

  await page.getByRole('tab', { name: 'History' }).click()

  const row = page.getByRole('table').locator('tr').filter({ hasText: 'Alice Smith' }).first()
  await row.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByRole('cell', { name: 'Alice Smith' })).toHaveCount(0)
  await expect(page.locator('text=No certificates yet').first()).toBeVisible()
})

test('[A6] empty recipient shows "Recipient name is required" and adds no entry', async ({ page }) => {
  await page.goto('/')
  await fillForm(page, { recipient: '', course: 'Web Development', date: '2023-10-15', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()

  await expect(page.locator('text=Recipient name is required').first()).toBeVisible()
  // No certificate entry was created: the "Name - Course" entry pattern is absent.
  await expect(page.locator('text=/\\S+ - Web Development/')).toHaveCount(0)
})

test('[A7] generating two certificates shows both entries in the list', async ({ page }) => {
  await page.goto('/')
  await fillForm(page, { recipient: 'Alice Smith', course: 'Web Development', date: '2023-10-15', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()
  await fillForm(page, { recipient: 'Bob Jones', course: 'Data Science', date: '2023-11-20', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()

  await expect(page.locator('text=Alice Smith - Web Development').first()).toBeVisible()
  await expect(page.locator('text=Bob Jones - Data Science').first()).toBeVisible()
})

test('[A8] History tab shows one row for each generated certificate', async ({ page }) => {
  await page.goto('/')
  await fillForm(page, { recipient: 'Alice Smith', course: 'Web Development', date: '2023-10-15', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()
  await fillForm(page, { recipient: 'Bob Jones', course: 'Data Science', date: '2023-11-20', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()

  await page.getByRole('tab', { name: 'History' }).click()

  const table = page.getByRole('table')
  const aliceRow = table.locator('tr').filter({ hasText: 'Alice Smith' }).first()
  await expect(aliceRow.getByRole('cell', { name: 'Alice Smith' })).toBeVisible()
  await expect(aliceRow.getByRole('cell', { name: 'Web Development' })).toBeVisible()
  await expect(aliceRow.getByRole('cell', { name: '2023-10-15' })).toBeVisible()
  await expect(aliceRow.getByRole('cell', { name: 'Acme Corp' })).toBeVisible()

  const bobRow = table.locator('tr').filter({ hasText: 'Bob Jones' }).first()
  await expect(bobRow.getByRole('cell', { name: 'Bob Jones' })).toBeVisible()
  await expect(bobRow.getByRole('cell', { name: 'Data Science' })).toBeVisible()
  await expect(bobRow.getByRole('cell', { name: '2023-11-20' })).toBeVisible()
  await expect(bobRow.getByRole('cell', { name: 'Acme Corp' })).toBeVisible()
})

test('[A9] reload keeps the Alice Smith certificate in the History tab', async ({ page }) => {
  await page.goto('/')
  await fillForm(page, { recipient: 'Alice Smith', course: 'Web Development', date: '2023-10-15', issuer: 'Acme Corp' })
  await page.getByRole('button', { name: 'Generate PDF' }).click()
  await expect(page.locator('text=Alice Smith - Web Development').first()).toBeVisible()

  await page.reload()

  await page.getByRole('tab', { name: 'History' }).click()
  const table = page.getByRole('table')
  const row = table.locator('tr').filter({ hasText: 'Alice Smith' }).first()
  await expect(row.getByRole('cell', { name: 'Alice Smith' })).toBeVisible()
  await expect(row.getByRole('cell', { name: 'Web Development' })).toBeVisible()
  await expect(row.getByRole('cell', { name: '2023-10-15' })).toBeVisible()
  await expect(row.getByRole('cell', { name: 'Acme Corp' })).toBeVisible()
})
