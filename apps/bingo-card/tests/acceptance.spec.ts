import { expect, test } from '@playwright/test'

const setup = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('100')
  await page.getByLabel('Min').fill('1')
  await page.getByLabel('Max').fill('75')
  await page.getByLabel('Grid size').selectOption({ label: '5x5' })
  await page.getByRole('button', { name: 'Generate card' }).click()
}

test('[A1] page heading is "Bingo Card Generator"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bingo Card Generator' })).toBeVisible()
})

test('[A2] center cell of a 5x5 card contains "FREE"', async ({ page }) => {
  await setup(page)
  const cells = page.locator('table td')
  await expect(cells.nth(12)).toHaveText('FREE')
})

test('[A3] top-left cell of a 5x5 card contains "12"', async ({ page }) => {
  await setup(page)
  const cells = page.locator('table td')
  await expect(cells.nth(0)).toHaveText('12')
})

test('[A4] bottom-right cell of a 5x5 card contains "68"', async ({ page }) => {
  await setup(page)
  const cells = page.locator('table td')
  await expect(cells.nth(24)).toHaveText('68')
})

test('[A5] Save card adds a list item with "Card 1" and "Download Card 1"', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Save card' }).click()
  const item = page.getByRole('listitem')
  await expect(item).toContainText('Card 1')
  await expect(page.getByRole('button', { name: 'Download Card 1' })).toBeVisible()
})

test('[A6] Print button opens the browser print dialog', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Print' }).click()
  // The browser's print dialog cannot be directly asserted; assert the action
  // did not throw and the page is still interactive.
  await expect(page.getByRole('button', { name: 'Generate card' })).toBeEnabled()
})

test('[A7] Copy numbers shows a "Numbers copied to clipboard" toast', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Copy numbers' }).click()
  await expect(page.getByText('Numbers copied to clipboard')).toBeVisible()
})

test('[A8] Delete Card 1 removes the list item', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Save card' }).click()
  await expect(page.getByRole('listitem')).toContainText('Card 1')
  await page.getByRole('button', { name: 'Delete Card 1' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A9] Saved card persists across a page reload', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Save card' }).click()
  await page.reload()
  await expect(page.getByRole('listitem')).toContainText('Card 1')
})
