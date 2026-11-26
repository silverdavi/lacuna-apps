import { expect, test, type Page } from '@playwright/test'

function guest(page: Page, name: string) {
  return page.locator('tr').filter({ hasText: name })
}

async function addGuest(page: Page, name: string, email: string, rsvp: string) {
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('RSVP').selectOption(rsvp)
  await page.getByRole('button', { name: 'Add guest' }).click()
}

test('[A1] empty app shows heading "Guest List" and "No guests yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Guest List' })).toBeVisible()
  await expect(page.getByText('No guests yet')).toBeVisible()
})

test('[A2] adding Alice shows a row with her name, email and status and clears the empty note', async ({ page }) => {
  await page.goto('/')
  await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  const row = guest(page, 'Alice')
  await expect(row).toContainText('Alice')
  await expect(row).toContainText('alice@example.com')
  await expect(row).toContainText('Accepted')
  await expect(page.getByText('No guests yet')).toHaveCount(0)
})

test('[A3] adding Bob adds a second row and the summary shows "Accepted: 1"', async ({ page }) => {
  await page.goto('/')
  await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  await addGuest(page, 'Bob', 'bob@example.com', 'Pending')
  const row = guest(page, 'Bob')
  await expect(row).toContainText('Bob')
  await expect(row).toContainText('bob@example.com')
  await expect(row).toContainText('Pending')
  await expect(page.getByText('Accepted: 1')).toBeVisible()
})

test('[A4] deleting Alice removes her row and the summary shows "Accepted: 0"', async ({ page }) => {
  await page.goto('/')
  await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  await addGuest(page, 'Bob', 'bob@example.com', 'Pending')
  await page.getByRole('button', { name: 'Delete Alice' }).click()
  await expect(guest(page, 'Alice')).toHaveCount(0)
  await expect(guest(page, 'Bob')).toBeVisible()
  await expect(page.getByText('Accepted: 0')).toBeVisible()
})

test('[A5] clicking the Name column header sorts rows alphabetically by name', async ({ page }) => {
  await page.goto('/')
  await addGuest(page, 'Bob', 'bob@example.com', 'Pending')
  await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  await page.getByRole('columnheader', { name: 'Name' }).click()
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
  await expect(rows.nth(0)).toContainText('Alice')
  await expect(rows.nth(1)).toContainText('Bob')
})

test('[A6] Export CSV shows the toast "CSV exported"', async ({ page }) => {
  await page.goto('/')
  await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  await expect(page.getByText('CSV exported')).toBeVisible()
})

test('[A7] searching "ali" shows only Alice and hides Bob', async ({ page }) => {
  await page.goto('/')
  await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  await addGuest(page, 'Bob', 'bob@example.com', 'Pending')
  await page.getByLabel('Search').fill('ali')
  await expect(guest(page, 'Alice')).toBeVisible()
  await expect(guest(page, 'Bob')).toHaveCount(0)
})

test('[A8] editing Alice pre-fills the form and saving Declined updates the row', async ({ page }) => {
  await page.goto('/')
  await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  await page.getByRole('button', { name: 'Edit Alice' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Alice')
  await expect(page.getByLabel('Email')).toHaveValue('alice@example.com')
  await page.getByLabel('RSVP').selectOption('Declined')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(guest(page, 'Alice')).toContainText('Declined')
})

test('[A9] reload keeps Alice with her email and status visible', async ({ page }) => {
  await page.goto('/')
  await addGuest(page, 'Alice', 'alice@example.com', 'Accepted')
  await page.reload()
  const row = guest(page, 'Alice')
  await expect(row).toBeVisible()
  await expect(row).toContainText('alice@example.com')
  await expect(row).toContainText('Accepted')
})
