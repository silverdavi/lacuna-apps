import { expect, test, type Page } from '@playwright/test'

async function addBook(page: Page, data: {
  title: string
  author: string
  status: string
  rating: string
}) {
  await page.getByLabel('Title').fill(data.title)
  await page.getByLabel('Author').fill(data.author)
  await page.getByLabel('Status').selectOption(data.status)
  await page.getByLabel('Rating').fill(data.rating)
  await page.getByRole('button', { name: 'Add book' }).click()
}

async function seedTwoBooks(page: Page) {
  await addBook(page, { title: 'Dune', author: 'Frank Herbert', status: 'Read', rating: '5' })
  await addBook(page, { title: 'Neuromancer', author: 'William Gibson', status: 'To Read', rating: '4' })
}

test('[A1] heading and empty state are shown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Reading Tracker' })).toBeVisible()
  await expect(page.getByText('No books yet')).toBeVisible()
})

test('[A2] adding a book shows it in the table', async ({ page }) => {
  await page.goto('/')
  await addBook(page, { title: 'Dune', author: 'Frank Herbert', status: 'Read', rating: '5' })
  const row = page.getByRole('row').filter({ hasText: 'Dune' })
  await expect(row).toContainText('Frank Herbert')
  await expect(row).toContainText('Read')
  await expect(row).toContainText('5')
  await expect(page.getByText('No books yet')).not.toBeVisible()
})

test('[A3] two rows and sorting by Title', async ({ page }) => {
  await page.goto('/')
  await seedTwoBooks(page)
  // The spec's "shows two rows" means the two added data rows, excluding the header row.
  await expect(page.getByRole('row').filter({ hasText: 'Dune' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Neuromancer' })).toBeVisible()
  await page.getByRole('columnheader', { name: 'Title' }).click()
  const duneRow = page.getByRole('row').filter({ hasText: 'Dune' })
  const neuromancerRow = page.getByRole('row').filter({ hasText: 'Neuromancer' })
  const duneBox = await duneRow.boundingBox()
  const neuBox = await neuromancerRow.boundingBox()
  expect(duneBox!.y, 'Dune sorts before Neuromancer').toBeLessThan(neuBox!.y)
})

test('[A4] search filters to the matching book only', async ({ page }) => {
  await page.goto('/')
  await seedTwoBooks(page)
  await page.getByLabel('Search').fill('Dun')
  await expect(page.getByRole('row').filter({ hasText: 'Dune' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Neuromancer' })).not.toBeVisible()
})

test('[A5] editing a rating updates the row', async ({ page }) => {
  await page.goto('/')
  await addBook(page, { title: 'Dune', author: 'Frank Herbert', status: 'Read', rating: '5' })
  await page.getByRole('button', { name: 'Edit Dune' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Dune')
  await expect(page.getByLabel('Author')).toHaveValue('Frank Herbert')
  await page.getByLabel('Rating').fill('4')
  await page.getByRole('button', { name: 'Save' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Dune' })
  await expect(row).toContainText('4')
})

test('[A6] deleting removes the row', async ({ page }) => {
  await page.goto('/')
  await seedTwoBooks(page)
  await page.getByRole('button', { name: 'Delete Dune' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Neuromancer' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Dune' })).not.toBeVisible()
})

test('[A7] status filter shows only matching rows', async ({ page }) => {
  await page.goto('/')
  await seedTwoBooks(page)
  await page.getByLabel('Status filter').selectOption('To Read')
  await expect(page.getByRole('row').filter({ hasText: 'Neuromancer' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Dune' })).not.toBeVisible()
  await page.getByLabel('Status filter').selectOption('All')
  await expect(page.getByRole('row').filter({ hasText: 'Dune' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Neuromancer' })).toBeVisible()
})

test('[A8] export downloads a CSV with the record', async ({ page }) => {
  await page.goto('/')
  await addBook(page, { title: 'Dune', author: 'Frank Herbert', status: 'Read', rating: '5' })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click()
  ])
  const fs = await import('node:fs')
  const path = await import('node:path')
  const dest = path.join(__dirname, `${download.suggestedFilename()}`)
  await download.saveAs(dest)
  const content = await fs.promises.readFile(dest, 'utf8')
  await fs.promises.unlink(dest).catch(() => {})
  expect(content).toContain('Dune,Frank Herbert,Read,5')
})

test('[A9] reload keeps the record', async ({ page }) => {
  await page.goto('/')
  await addBook(page, { title: 'Dune', author: 'Frank Herbert', status: 'Read', rating: '5' })
  await page.reload()
  const row = page.getByRole('row').filter({ hasText: 'Dune' })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Frank Herbert')
  await expect(row).toContainText('Read')
})
