import { expect, test, type Page } from '@playwright/test'

async function addDream(page: Page, fields: { title: string; description: string; tags: string }) {
  await page.getByLabel('Title').fill(fields.title)
  await page.getByLabel('Description').fill(fields.description)
  await page.getByLabel('Tags').fill(fields.tags)
  await page.getByRole('button', { name: 'Save dream' }).click()
}

test('[A1] empty app shows the "Dream Journal" heading and "No dreams yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dream Journal' })).toBeVisible()
  await expect(page.getByText('No dreams yet')).toBeVisible()
})

test('[A2] saving a dream adds a list item with its title, description and tags', async ({ page }) => {
  await page.goto('/')
  await addDream(page, { title: 'Flying', description: 'I soared over a lake', tags: 'night, calm' })
  const item = page.getByRole('listitem')
  await expect(item).toBeVisible()
  await expect(item.getByText('Flying')).toBeVisible()
  await expect(item.getByText('I soared over a lake')).toBeVisible()
  await expect(item.getByText('night')).toBeVisible()
  await expect(item.getByText('calm')).toBeVisible()
  await expect(page.getByText('No dreams yet')).toHaveCount(0)
})

test('[A3] editing "Flying" updates the description', async ({ page }) => {
  await page.goto('/')
  await addDream(page, { title: 'Flying', description: 'I soared over a lake', tags: 'night, calm' })
  await page.getByRole('button', { name: 'Edit Flying' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Flying')
  await expect(page.getByLabel('Description')).toHaveValue('I soared over a lake')
  await page.getByLabel('Description').fill('I soared over a river')
  await page.getByRole('button', { name: 'Save dream' }).click()
  await expect(page.getByRole('listitem').getByText('I soared over a river')).toBeVisible()
  await expect(page.getByText('I soared over a lake')).toHaveCount(0)
})

test('[A4] search filters the list', async ({ page }) => {
  await page.goto('/')
  await addDream(page, { title: 'Flying', description: 'I soared over a lake', tags: 'night, calm' })
  await page.getByLabel('Search').fill('soared')
  await expect(page.getByRole('listitem').getByText('Flying')).toBeVisible()
  await page.getByLabel('Search').fill('zzz')
  await expect(page.getByText('No dreams match')).toBeVisible()
  await expect(page.getByRole('listitem').getByText('Flying')).toHaveCount(0)
})

test('[A5] the Tag select filters the list by tag', async ({ page }) => {
  await page.goto('/')
  await addDream(page, { title: 'Flying', description: 'I soared over a lake', tags: 'night, calm' })
  await page.getByLabel('Tag').selectOption('night')
  await expect(page.getByRole('listitem').getByText('Flying')).toBeVisible()
  await page.getByLabel('Tag').selectOption('calm')
  await expect(page.getByRole('listitem').getByText('Flying')).toBeVisible()
  await page.getByLabel('Tag').selectOption('work')
  await expect(page.getByText('No dreams match')).toBeVisible()
  await expect(page.getByRole('listitem').getByText('Flying')).toHaveCount(0)
})

test('[A6] deleting "Flying" removes it and restores the empty state', async ({ page }) => {
  await page.goto('/')
  await addDream(page, { title: 'Flying', description: 'I soared over a lake', tags: 'night, calm' })
  await page.getByRole('button', { name: 'Delete Flying' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No dreams yet')).toBeVisible()
})

test('[A7] exporting CSV shows the count toast', async ({ page }) => {
  await page.goto('/')
  await addDream(page, { title: 'Flying', description: 'I soared over a lake', tags: 'night, calm' })
  await page.getByRole('button', { name: 'Export CSV' }).click()
  await expect(page.getByText('Exported 1 dream(s) to CSV')).toBeVisible()
})

test('[A8] reloading the page keeps the dream in the list', async ({ page }) => {
  await page.goto('/')
  await addDream(page, { title: 'Flying', description: 'I soared over a lake', tags: 'night, calm' })
  await page.reload()
  const item = page.getByRole('listitem')
  await expect(item.getByText('Flying')).toBeVisible()
  await expect(item.getByText('I soared over a lake')).toBeVisible()
})

test('[A9] reload keeps the dream titled "Flying" with its description and tags', async ({ page }) => {
  await page.goto('/')
  await addDream(page, { title: 'Flying', description: 'I soared over a lake', tags: 'night, calm' })
  await page.reload()
  const item = page.getByRole('listitem')
  await expect(item.getByText('I soared over a lake')).toBeVisible()
  await expect(item.getByText('night')).toBeVisible()
  await expect(item.getByText('calm')).toBeVisible()
})
