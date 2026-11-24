import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function addBook(page: Page, title: string, author: string, status: string, rating: string) {
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Author').fill(author)
  await page.getByLabel('Status').selectOption({ label: status })
  await page.getByLabel('Rating').fill(rating)
  await page.getByRole('button', { name: 'Add book' }).click()
}

function row(page: Page, title: string) {
  return page.locator('tr').filter({ hasText: title })
}

function orderBefore(page: Page, first: string, second: string) {
  // reads the document order of the two rows after a user action; no page mutation
  return page.evaluate(
    ([a, b]) =>
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(a) ?? false) <
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(b) ?? false),
    [first, second],
  )
}

test('[A1] empty app shows the heading and "No books yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Reading Tracker' })).toBeVisible()
  await expect(page.getByText('No books yet')).toBeVisible()
})

test('[A2] adding a book shows it in a row and clears "No books yet"', async ({ page }) => {
  await page.goto('/')
  await addBook(page, 'Dune', 'Frank Herbert', 'Read', '5')
  await expect(page.getByText('No books yet')).toHaveCount(0)
  const r = row(page, 'Dune')
  await expect(r).toContainText('Dune')
  await expect(r).toContainText('Frank Herbert')
  await expect(r).toContainText('Read')
  await expect(r).toContainText('5')
})

test('[A3] clicking the Title header sorts rows so Dune comes before Neuromancer', async ({ page }) => {
  await page.goto('/')
  await addBook(page, 'Dune', 'Frank Herbert', 'Read', '5')
  await addBook(page, 'Neuromancer', 'William Gibson', 'To Read', '4')
  await expect(page.locator('tr').filter({ has: page.getByRole('button', { name: /Edit / }) })).toHaveCount(2)
  await page.getByRole('columnheader', { name: 'Title' }).click()
  expect(await orderBefore(page, 'Dune', 'Neuromancer')).toBe(true)
})

test('[A4] typing in the Search box filters the table', async ({ page }) => {
  await page.goto('/')
  await addBook(page, 'Dune', 'Frank Herbert', 'Read', '5')
  await addBook(page, 'Neuromancer', 'William Gibson', 'To Read', '4')
  await page.getByLabel('Search').fill('Dun')
  await expect(row(page, 'Dune')).toBeVisible()
  await expect(row(page, 'Neuromancer')).toHaveCount(0)
})

test('[A5] Edit opens the form pre-filled and Save updates the row', async ({ page }) => {
  await page.goto('/')
  await addBook(page, 'Dune', 'Frank Herbert', 'Read', '5')
  await addBook(page, 'Neuromancer', 'William Gibson', 'To Read', '4')
  await page.getByRole('button', { name: 'Edit Dune' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Dune')
  await expect(page.getByLabel('Author')).toHaveValue('Frank Herbert')
  await page.getByLabel('Rating').fill('4')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Dune')).toContainText('4')
})

test('[A6] Delete removes the book row', async ({ page }) => {
  await page.goto('/')
  await addBook(page, 'Dune', 'Frank Herbert', 'Read', '5')
  await addBook(page, 'Neuromancer', 'William Gibson', 'To Read', '4')
  await page.getByRole('button', { name: 'Delete Dune' }).click()
  await expect(row(page, 'Dune')).toHaveCount(0)
  await expect(row(page, 'Neuromancer')).toBeVisible()
})

test('[A7] the Status filter shows only matching rows and All shows them all', async ({ page }) => {
  await page.goto('/')
  await addBook(page, 'Dune', 'Frank Herbert', 'Read', '5')
  await addBook(page, 'Neuromancer', 'William Gibson', 'To Read', '4')
  await page.getByLabel('Status filter').selectOption({ label: 'To Read' })
  await expect(row(page, 'Neuromancer')).toBeVisible()
  await expect(row(page, 'Dune')).toHaveCount(0)
  await page.getByLabel('Status filter').selectOption({ label: 'All' })
  await expect(row(page, 'Neuromancer')).toBeVisible()
  await expect(row(page, 'Dune')).toBeVisible()
})

test('[A8] Export CSV downloads a file with the record line', async ({ page }) => {
  await page.goto('/')
  await addBook(page, 'Dune', 'Frank Herbert', 'Read', '5')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const content = readFileSync((await download.path())!, 'utf8')
  expect(content).toContain('Dune,Frank Herbert,Read,5')
})

test('[A9] a book survives a reload', async ({ page }) => {
  await page.goto('/')
  await addBook(page, 'Dune', 'Frank Herbert', 'Read', '5')
  await page.reload()
  const r = row(page, 'Dune')
  await expect(r).toContainText('Dune')
  await expect(r).toContainText('Frank Herbert')
  await expect(r).toContainText('Read')
})
