import { expect, test } from '@playwright/test'

async function seed(page: any, entries: Array<{ name: string; score: string }>) {
  for (const e of entries) {
    await page.getByLabel('Name').fill(e.name)
    await page.getByLabel('Score').fill(e.score)
    await page.getByRole('button', { name: 'Save' }).click()
  }
}

test('[A1] heading and empty list text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Score Keeper' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('[A2] adding an entry shows it in the table', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alpha')
  await page.getByLabel('Score').fill('15')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Alpha')).toBeVisible()
  await expect(page.getByText('15')).toBeVisible()
  await expect(page.getByText('No entries yet')).not.toBeVisible()
})

test('[A3] editing an entry updates the row', async ({ page }) => {
  await page.goto('/')
  await seed(page, [{ name: 'Alpha', score: '15' }])
  await page.locator('tr', { hasText: 'Alpha' }).getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Alpha')
  await expect(page.getByLabel('Score')).toHaveValue('15')
  await page.getByLabel('Score').fill('20')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('tr', { hasText: 'Alpha' })).toContainText('20')
})

test('[A4] deleting an entry removes its row', async ({ page }) => {
  await page.goto('/')
  await seed(page, [{ name: 'Alpha', score: '15' }, { name: 'Beta', score: '10' }])
  await page.getByRole('button', { name: 'Delete Beta' }).click()
  await expect(page.locator('tr', { hasText: 'Beta' })).toHaveCount(0)
  await expect(page.locator('tr', { hasText: 'Alpha' })).toContainText('15')
})

test('[A5] search filters the table', async ({ page }) => {
  await page.goto('/')
  await seed(page, [{ name: 'Alpha', score: '15' }, { name: 'Beta', score: '10' }])
  await page.getByLabel('Search').fill('Al')
  await expect(page.locator('tr', { hasText: 'Alpha' })).toBeVisible()
  await expect(page.locator('tr', { hasText: 'Beta' })).toHaveCount(0)
})

test('[A6] clicking the Score header sorts and re-sorts', async ({ page }) => {
  await page.goto('/')
  await seed(page, [{ name: 'Alpha', score: '15' }, { name: 'Beta', score: '10' }])
  await page.getByRole('columnheader', { name: 'Score' }).click()
  await expect(page.locator('tr', { hasText: 'Alpha' })).toBeVisible()
  await expect(page.locator('tr', { hasText: 'Beta' })).toBeVisible()
  const first = page.locator('tbody tr').first()
  await expect(first).toContainText('Alpha')
  await page.getByRole('columnheader', { name: 'Score' }).click()
  await expect(page.locator('tbody tr').first()).toContainText('Beta')
})

test('[A7] Export CSV copies the data to the clipboard', async ({ page }) => {
  await page.goto('/')
  await seed(page, [{ name: 'Alpha', score: '15' }])
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('Name,Score')
  expect(clip).toContain('Alpha,15')
})

test('[A8] saving without a score shows a validation message', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alpha')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Score is required')).toBeVisible()
  await expect(page.locator('tr', { hasText: 'Alpha' })).toHaveCount(0)
})

test('[A9] entries survive a reload', async ({ page }) => {
  await page.goto('/')
  await seed(page, [{ name: 'Alpha', score: '15' }])
  await page.reload()
  await expect(page.locator('tr', { hasText: 'Alpha' })).toContainText('15')
})
