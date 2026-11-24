import { expect, test, type Page } from '@playwright/test'

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

test('delete shows an Undo button that restores the removed book', async ({ page }) => {
  await page.goto('/')
  await addBook(page, 'Dune', 'Frank Herbert', 'Read', '5')
  await addBook(page, 'Neuromancer', 'William Gibson', 'To Read', '4')
  await page.getByRole('button', { name: 'Delete Dune' }).click()
  await expect(row(page, 'Dune')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Undo delete Dune' })).toBeVisible()
  await page.getByRole('button', { name: 'Undo delete Dune' }).click()
  await expect(row(page, 'Dune')).toContainText('Frank Herbert')
  await expect(row(page, 'Dune')).toContainText('Read')
  await expect(row(page, 'Dune')).toContainText('5')
  await expect(row(page, 'Neuromancer')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo delete Dune' })).toHaveCount(0)
})
