import { expect, test } from '@playwright/test'

const app = process.env.APP ?? 'notes-app'

test.describe('Quick Notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('empty state with a title and a Save note button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Quick Notes' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save note' })).toBeVisible()
    await expect(page.getByText('No notes yet')).toBeVisible()
    await page.screenshot({ path: `artifacts/${app}/01-empty.png` })
  })

  test('saving a note shows it in the list', async ({ page }) => {
    await page.getByLabel('Title').fill('Grocery')
    await page.getByLabel('Content').fill('Milk, eggs')
    await page.getByRole('button', { name: 'Save note' }).click()
    const item = page.getByRole('listitem').filter({ hasText: 'Grocery' })
    await expect(item).toBeVisible()
    await expect(item).toContainText('Milk, eggs')
    await page.screenshot({ path: `artifacts/${app}/02-saved.png` })
  })

  test('archiving a note moves it to the Archived tab', async ({ page }) => {
    await page.getByLabel('Title').fill('Stale')
    await page.getByLabel('Content').fill('old note')
    await page.getByRole('button', { name: 'Save note' }).click()
    await page.getByRole('button', { name: 'Archive', exact: true }).click()
    await page.getByRole('tab', { name: 'Archived' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: 'Stale' })).toBeVisible()
    await page.screenshot({ path: `artifacts/${app}/03-archived.png` })
  })

  test('deleting a note removes it from the list', async ({ page }) => {
    await page.getByLabel('Title').fill('Throwaway')
    await page.getByLabel('Content').fill('scratch')
    await page.getByRole('button', { name: 'Save note' }).click()
    await page.getByRole('button', { name: 'Delete Throwaway' }).click()
    await expect(page.getByRole('listitem')).toHaveCount(0)
    await expect(page.getByText('No notes yet')).toBeVisible()
    await page.screenshot({ path: `artifacts/${app}/04-deleted.png` })
  })

  test('editing a note changes its content', async ({ page }) => {
    await page.getByLabel('Title').fill('Brief')
    await page.getByLabel('Content').fill('first draft')
    await page.getByRole('button', { name: 'Save note' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Content').fill('second draft')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: 'Brief' })).toContainText('second draft')
    await expect(page.getByText('first draft')).toHaveCount(0)
    await page.screenshot({ path: `artifacts/${app}/05-edited.png` })
  })

  test('searching narrows the list', async ({ page }) => {
    await page.getByLabel('Title').fill('Alpha')
    await page.getByLabel('Content').fill('one')
    await page.getByRole('button', { name: 'Save note' }).click()
    await page.getByLabel('Title').fill('Beta')
    await page.getByLabel('Content').fill('two')
    await page.getByRole('button', { name: 'Save note' }).click()
    await page.getByLabel('Search').fill('Alpha')
    await expect(page.getByRole('listitem').filter({ hasText: 'Alpha' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Beta' })).toHaveCount(0)
    await page.screenshot({ path: `artifacts/${app}/06-search.png` })
  })

  test('notes persist across reload', async ({ page }) => {
    await page.getByLabel('Title').fill('Durable')
    await page.getByLabel('Content').fill('kept')
    await page.getByRole('button', { name: 'Save note' }).click()
    await page.reload()
    await expect(page.getByRole('listitem').filter({ hasText: 'Durable' })).toBeVisible()
    await page.screenshot({ path: `artifacts/${app}/07-persisted.png` })
  })

  test('export downloads a JSON backup containing the note', async ({ page }) => {
    await page.getByLabel('Title').fill('Export')
    await page.getByLabel('Content').fill('payload')
    await page.getByRole('button', { name: 'Save note' }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export JSON' }).click(),
    ])
    const fs = await import('node:fs/promises')
    const body = await fs.readFile(await download.path()!, 'utf8')
    expect(body).toContain('Export')
    expect(body).toContain('payload')
    await page.screenshot({ path: `artifacts/${app}/08-export.png` })
  })

  test('keyboard only: save a note with Tab and Enter', async ({ page }) => {
    await page.getByLabel('Title').focus()
    await page.keyboard.type('Keys')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.type('tabbed')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('listitem').filter({ hasText: 'Keys' })).toBeVisible()
    await page.screenshot({ path: `artifacts/${app}/09-keyboard.png` })
  })
})
