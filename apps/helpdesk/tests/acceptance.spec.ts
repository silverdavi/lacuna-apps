import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function addTicket(page: Page, subject: string, customer: string, priority: string) {
  await page.getByLabel('Subject').fill(subject)
  await page.getByLabel('Customer').fill(customer)
  await page.getByLabel('Priority').selectOption(priority)
  await page.getByRole('button', { name: 'Add ticket' }).click()
}

function row(page: Page, text: string) {
  return page.locator('tr').filter({ hasText: text })
}

// reads the document order of the two rows after a user action; no page mutation
async function orderBefore(page: Page, first: string, second: string) {
  return page.evaluate(
    ([a, b]) =>
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(a) ?? false) <
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(b) ?? false),
    [first, second],
  )
}

test('[A1] empty app shows the Helpdesk heading and "No tickets yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Helpdesk' })).toBeVisible()
  await expect(page.getByText('No tickets yet')).toBeVisible()
})

test('[A2] adding a ticket shows a row with subject, customer, priority and Open status', async ({
  page,
}) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  const r = row(page, 'Server down')
  await expect(r).toContainText('Alice')
  await expect(r).toContainText('High')
  await expect(r).toContainText('Open')
  await expect(page.getByText('No tickets yet')).toHaveCount(0)
})

test('[A3] clicking the Priority header sorts so High comes before Low', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await addTicket(page, 'Login issue', 'Bob', 'Low')
  await expect(page.locator('tr')).toHaveCount(3)
  await page.getByRole('columnheader', { name: 'Priority' }).click()
  expect(await orderBefore(page, 'Server down', 'Login issue')).toBe(true)
})

test('[A4] typing in the Search box filters to matching rows', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await addTicket(page, 'Login issue', 'Bob', 'Low')
  await page.getByLabel('Search').fill('Alice')
  await expect(row(page, 'Alice')).toBeVisible()
  await expect(row(page, 'Bob')).toHaveCount(0)
  await page.getByLabel('Search').fill('')
  await expect(row(page, 'Alice')).toBeVisible()
  await expect(row(page, 'Bob')).toBeVisible()
})

test('[A5] the Open, Closed and All chips each show the right rows', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await addTicket(page, 'Login issue', 'Bob', 'Low')
  await row(page, 'Login issue').getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Status').selectOption('Closed')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(row(page, 'Server down')).toBeVisible()
  await expect(row(page, 'Login issue')).toHaveCount(0)
  await page.getByRole('button', { name: 'Closed', exact: true }).click()
  await expect(row(page, 'Login issue')).toBeVisible()
  await expect(row(page, 'Server down')).toHaveCount(0)
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await expect(row(page, 'Server down')).toBeVisible()
  await expect(row(page, 'Login issue')).toBeVisible()
})

test('[A6] editing pre-fills the form and Save updates the row to Closed', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await row(page, 'Server down').getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByLabel('Status')).toHaveValue('Open')
  await page.getByLabel('Status').selectOption('Closed')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Server down')).toContainText('Closed')
})

test('[A7] Delete removes the row', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await addTicket(page, 'Login issue', 'Bob', 'Low')
  await row(page, 'Login issue').getByRole('button', { name: 'Delete' }).click()
  await expect(row(page, 'Login issue')).toHaveCount(0)
  await expect(row(page, 'Server down')).toBeVisible()
})

test('[A8] Export CSV downloads helpdesk.csv with the header and a data row', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('helpdesk.csv')
  const lines = readFileSync((await download.path())!, 'utf8').split('\n')
  expect(lines[0]).toBe('Subject,Customer,Priority,Status')
  expect(lines).toContain('Server down,Alice,High,Open')
})

test('[A9] a ticket survives a reload', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await page.reload()
  const r = row(page, 'Server down')
  await expect(r).toContainText('Alice')
  await expect(r).toContainText('High')
  await expect(r).toContainText('Open')
})
