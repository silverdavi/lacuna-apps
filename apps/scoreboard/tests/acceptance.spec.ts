import { expect, test } from '@playwright/test'

async function addEntry(page: import('@playwright/test').Page, name: string, score: string) {
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Score').fill(score)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Score Keeper' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('[A2] adding Alpha with score 15 adds a row and clears the empty state', async ({
  page,
}) => {
  await page.goto('/')
  await addEntry(page, 'Alpha', '15')
  await expect(page.getByText('Alpha')).toBeVisible()
  await expect(page.getByText('15')).toBeVisible()
  await expect(page.getByText('No entries yet')).toHaveCount(0)
})

test('[A3] editing Alpha from 15 to 20 updates the row', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alpha', '15')
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Alpha')
  await expect(page.getByLabel('Score')).toHaveValue('15')
  await page.getByLabel('Score').fill('20')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('20')).toBeVisible()
  await expect(page.getByText('15')).toHaveCount(0)
})

test('[A4] deleting Beta removes its row', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alpha', '15')
  await addEntry(page, 'Beta', '10')
  await page.getByRole('button', { name: 'Delete Beta' }).click()
  await expect(page.getByText('Alpha')).toBeVisible()
  await expect(page.getByText('15')).toBeVisible()
  await expect(page.getByText('Beta')).toHaveCount(0)
  await expect(page.getByText('10')).toHaveCount(0)
})

test('[A5] typing "Al" in search filters to only the Alpha row', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alpha', '15')
  await addEntry(page, 'Beta', '10')
  await page.getByLabel('Search').fill('Al')
  await expect(page.getByText('Alpha')).toBeVisible()
  await expect(page.getByText('Beta')).toHaveCount(0)
})

test('[A6] clicking the Score column header sorts, then reverses', async ({
  page,
}) => {
  await page.goto('/')
  await addEntry(page, 'Alpha', '15')
  await addEntry(page, 'Beta', '10')
  await page.getByRole('columnheader', { name: 'Score' }).click()
  await expect(page.getByText('Alpha')).toBeVisible()
  await expect(page.getByText('Beta')).toBeVisible()
  const alphaPos = await page.getByText('Alpha').first().boundingBox()
  const betaPos = await page.getByText('Beta').first().boundingBox()
  expect(alphaPos?.y, 'Alpha appears before Beta after ascending sort').toBeLessThan(
    betaPos!.y,
  )
  await page.getByRole('columnheader', { name: 'Score' }).click()
  const alphaPos2 = await page.getByText('Alpha').first().boundingBox()
  const betaPos2 = await page.getByText('Beta').first().boundingBox()
  expect(betaPos2?.y, 'Beta appears before Alpha after descending sort').toBeLessThan(
    alphaPos2!.y,
  )
})

test('[A7] Export CSV copies a CSV string with the header and Alpha,15', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addEntry(page, 'Alpha', '15')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard includes the header').toContain('Name,Score')
  expect(text, 'clipboard includes the Alpha row').toContain('Alpha,15')
})

test('[A8] leaving Score empty and clicking Save shows "Score is required"', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alpha')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Score is required')).toBeVisible()
  await expect(page.getByText('Alpha')).toHaveCount(0)
})

test('[A9] reload keeps Alpha with score 15 in the table', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'Alpha', '15')
  await page.reload()
  await expect(page.getByText('Alpha')).toBeVisible()
  await expect(page.getByText('15')).toBeVisible()
})
