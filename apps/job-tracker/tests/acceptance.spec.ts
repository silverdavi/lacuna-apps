import { expect, test, type Page } from '@playwright/test'

async function addApplication(
  page: Page,
  company: string,
  role: string,
  status: string,
  interviewDate = '',
) {
  await page.getByLabel('Company').fill(company)
  await page.getByLabel('Role').fill(role)
  await page.getByLabel('Status').selectOption({ label: status })
  const date = page.getByLabel('Interview Date')
  if (interviewDate) await date.fill(interviewDate)
  await page.getByRole('button', { name: 'Add application' }).click()
}

function row(page: Page, company: string) {
  return page.locator('tr').filter({ hasText: company })
}

async function orderBefore(page: Page, first: string, second: string) {
  // reads the document order of the two rows after a user action; no page mutation
  return page.evaluate(
    ([a, b]) => [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(a) ?? false) <
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(b) ?? false),
    [first, second],
  )
}

test('[A1] empty app shows the heading, "No applications yet" and the Add application button', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Job Application Tracker' })).toBeVisible()
  await expect(page.getByText('No applications yet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add application' })).toBeVisible()
})

test('[A2] adding an application shows a row with the company and role and removes the empty text', async ({
  page,
}) => {
  await page.goto('/')
  await addApplication(page, 'Acme Corp', 'Software Engineer', 'Applied')
  const r = row(page, 'Acme Corp')
  await expect(r).toContainText('Software Engineer')
  await expect(page.getByText('No applications yet')).toHaveCount(0)
})

test('[A3] clicking the Status column header sorts so Interview comes before Applied', async ({ page }) => {
  await page.goto('/')
  await addApplication(page, 'Acme Corp', 'Software Engineer', 'Applied')
  await addApplication(page, 'Beta Inc', 'Product Manager', 'Interview')
  await page.getByRole('columnheader', { name: 'Status' }).click()
  expect(await orderBefore(page, 'Beta Inc', 'Acme Corp')).toBe(true)
})

test('[A4] the Search field filters to matching rows', async ({ page }) => {
  await page.goto('/')
  await addApplication(page, 'Acme Corp', 'Software Engineer', 'Applied')
  await addApplication(page, 'Beta Inc', 'Product Manager', 'Interview')
  await page.getByLabel('Search').fill('Acme')
  await expect(row(page, 'Acme Corp')).toBeVisible()
  await expect(row(page, 'Beta Inc')).toBeHidden()
})

test('[A5] the Interview filter chip shows only matching rows and toggles off', async ({ page }) => {
  await page.goto('/')
  await addApplication(page, 'Acme Corp', 'Software Engineer', 'Applied')
  await addApplication(page, 'Beta Inc', 'Product Manager', 'Interview')
  const chip = page.getByRole('button', { name: 'Interview' })
  await chip.click()
  await expect(row(page, 'Beta Inc')).toBeVisible()
  await expect(row(page, 'Acme Corp')).toBeHidden()
  await chip.click()
  await expect(row(page, 'Beta Inc')).toBeVisible()
  await expect(row(page, 'Acme Corp')).toBeVisible()
})

test('[A6] editing pre-fills the form and Save updates the row', async ({ page }) => {
  await page.goto('/')
  await addApplication(page, 'Acme Corp', 'Software Engineer', 'Applied')
  await row(page, 'Acme Corp').getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByLabel('Status')).toHaveValue('Applied')
  await page.getByLabel('Status').selectOption({ label: 'Rejected' })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Acme Corp')).toContainText('Rejected')
})

test('[A7] Delete removes the row', async ({ page }) => {
  await page.goto('/')
  await addApplication(page, 'Acme Corp', 'Software Engineer', 'Applied')
  await addApplication(page, 'Beta Inc', 'Product Manager', 'Interview')
  await row(page, 'Beta Inc').getByRole('button', { name: 'Delete' }).click()
  await expect(row(page, 'Beta Inc')).toHaveCount(0)
  await expect(row(page, 'Acme Corp')).toBeVisible()
})

test('[A8] Export CSV downloads applications.csv with the header and a data row', async ({ page }) => {
  await page.goto('/')
  await addApplication(page, 'Acme Corp', 'Software Engineer', 'Applied')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('applications.csv')
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  const lines = readFileSync(path, 'utf8').trim().split('\n')
  expect(lines[0]).toBe('Company,Role,Status,Interview Date')
  expect(lines[1]).toContain('Acme Corp')
})

test('[A9] an application survives a reload with its edited status', async ({ page }) => {
  await page.goto('/')
  await addApplication(page, 'Acme Corp', 'Software Engineer', 'Applied')
  await row(page, 'Acme Corp').getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Status').selectOption({ label: 'Rejected' })
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()
  const r = row(page, 'Acme Corp')
  await expect(r).toContainText('Software Engineer')
  await expect(r).toContainText('Rejected')
})
