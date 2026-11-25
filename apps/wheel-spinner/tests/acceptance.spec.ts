import { expect, test, type Page } from '@playwright/test'

async function addEntry(page: Page, name: string) {
  await page.getByLabel('Entry name').fill(name)
  await page.getByRole('button', { name: 'Add entry' }).click()
}

async function spin(page: Page) {
  await page.getByRole('button', { name: 'Spin' }).click()
}

test('[A1] shows the heading and the empty entries list', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wheel Spinner' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('[A2] adds an entry and replaces the empty list text', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice')
  await expect(page.getByText('Alice')).toBeVisible()
  await expect(page.getByText('No entries yet')).toHaveCount(0)
})

test('[A3] spin shows a result banner naming one of the entries', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice')
  await addEntry(page, 'Bob')
  await spin(page)
  const winner = await page.getByRole('status').textContent()
  expect(winner?.trim()).toMatch(/^Winner: (Alice|Bob)$/)
})

test('[A4] copy result copies the current result text', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addEntry(page, 'Alice')
  await addEntry(page, 'Bob')
  await spin(page)
  await page.getByRole('button', { name: 'Copy result' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  const winner = await page.getByRole('status').textContent()
  expect(clip).toBe(winner?.trim())
})

test('[A5] history tab shows the spin log with the last winner', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice')
  await addEntry(page, 'Bob')
  await spin(page)
  const winner = await page.getByRole('status').textContent()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('Spin log')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: winner?.trim() ?? '' })).toHaveCount(1)
})

test('[A6] deletes a single entry', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice')
  await addEntry(page, 'Bob')
  await page.getByRole('button', { name: 'Delete Bob' }).click()
  await expect(page.getByText('Bob')).toHaveCount(0)
  await expect(page.getByText('Alice')).toBeVisible()
})

test('[A7] reset all clears the entries and the history', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice')
  await addEntry(page, 'Bob')
  await spin(page)
  await page.getByRole('button', { name: 'Reset all' }).click()
  await expect(page.getByText('No entries yet')).toBeVisible()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('No spins yet')).toBeVisible()
})

test('[A8] adds a second entry next to an existing one', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice')
  await addEntry(page, 'Carol')
  await expect(page.getByText('Alice')).toBeVisible()
  await expect(page.getByText('Carol')).toBeVisible()
})

test('[A9] reload keeps the entries and the spin log', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alice')
  await spin(page)
  const winner = await page.getByRole('status').textContent()
  await page.reload()
  await expect(page.getByText('Alice')).toBeVisible()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('row').filter({ hasText: winner?.trim() ?? '' })).toHaveCount(1)
})
