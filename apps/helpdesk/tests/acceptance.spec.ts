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

function orderBefore(page: Page, first: string, second: string) {
  // reads the document order of the two rows after a user action; no page mutation
  return page.evaluate(
    ([a, b]) => [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(a) ?? false) <
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(b) ?? false),
    [first, second],
  )
}

// A5: a "filter chip" may be a button or another role; accept a button named by
// the label, falling back to the exact text node, and exclude table rows so the
// match is the chip, not a Status cell.
function chip(page: Page, label: string) {
  return page
    .getByRole('button', { name: label, exact: true })
    .or(page.getByText(label, { exact: true }))
    .filter({ hasNot: page.locator('tr') })
    .first()
}

test('[A1] empty app shows the Helpdesk heading and "No tickets yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Helpdesk' })).toBeVisible()
  await expect(page.getByText('No tickets yet')).toBeVisible()
})

test('[A2] adding a ticket shows a row with subject, customer and priority', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  const r = row(page, 'Server down')
  await expect(r).toContainText('Server down')
  await expect(r).toContainText('Alice')
  await expect(r).toContainText('High')
  await expect(page.getByText('No tickets yet')).toHaveCount(0)
})

test('[A3] clicking the Priority header sorts so High comes before Low', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await addTicket(page, 'Login issue', 'Bob', 'Low')
  expect(await row(page, 'Server down').count() + row(page, 'Login issue').count(), 'two rows').toBe(2)
  await page.getByRole('columnheader', { name: 'Priority' }).click()
  expect(await orderBefore(page, 'Server down', 'Login issue')).toBe(true)
})

test('[A4] typing Alice in Search filters to the Alice row; clearing restores both', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await addTicket(page, 'Login issue', 'Bob', 'Low')
  await page.getByLabel('Search').fill('Alice')
  await expect(row(page, 'Server down')).toBeVisible()
  await expect(row(page, 'Login issue')).toHaveCount(0)
  await page.getByLabel('Search').fill('')
  await expect(row(page, 'Server down')).toBeVisible()
  await expect(row(page, 'Login issue')).toBeVisible()
})

test('[A5] the Open, Closed and All chips filter by status', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await addTicket(page, 'Login issue', 'Bob', 'Low')
  await page.getByRole('button', { name: 'Edit' }).first().click()
  await page.getByLabel('Status').selectOption('Closed')
  await page.getByRole('button', { name: 'Save' }).click()
  await chip(page, 'Open').click()
  await expect(row(page, 'Login issue')).toBeVisible()
  await expect(row(page, 'Server down')).toHaveCount(0)
  await chip(page, 'Closed').click()
  await expect(row(page, 'Server down')).toBeVisible()
  await expect(row(page, 'Login issue')).toHaveCount(0)
  await chip(page, 'All').click()
  await expect(row(page, 'Server down')).toBeVisible()
  await expect(row(page, 'Login issue')).toBeVisible()
})

test('[A6] editing a ticket changes its status and the row shows it', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await row(page, 'Server down').getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Status').selectOption('Closed')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Server down')).toContainText('Closed')
})

test('[A7] deleting the Login issue ticket removes its row', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  await addTicket(page, 'Login issue', 'Bob', 'Low')
  await row(page, 'Login issue').getByRole('button', { name: 'Delete' }).click()
  await expect(row(page, 'Login issue')).toHaveCount(0)
  await expect(row(page, 'Server down')).toBeVisible()
})

test('[A8] Export CSV downloads helpdesk.csv with the header and data rows', async ({ page }) => {
  await page.goto('/')
  await addTicket(page, 'Server down', 'Alice', 'High')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('helpdesk.csv')
  const lines = readFileSync((await download.path())!, 'utf8').split('\n')
  expect(lines[0]).toBe('Subject,Customer,Priority,Status')
  expect(lines[1]).toBe('Server down,Alice,High,Open')
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
