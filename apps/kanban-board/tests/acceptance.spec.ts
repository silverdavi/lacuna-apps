import { expect, test } from '@playwright/test'

async function addCard(page: import('@playwright/test').Page, title: string, column: 0 | 1 = 0) {
  await page.getByRole('button', { name: 'Add card' }).nth(column).click()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] page shows heading and three columns', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Kanban Board' })).toBeVisible()
  for (const label of ['To Do', 'In Progress', 'Done']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
})

test('[A2] adding a card via the card editor', async ({ page }) => {
  await page.goto('/')
  await addCard(page, 'Write spec')
  await expect(page.getByText('Write spec')).toBeVisible()
})

test('[A3] To Do WIP count shows 1 after adding a card', async ({ page }) => {
  await page.goto('/')
  await addCard(page, 'Write spec')
  const todoHeader = page.locator('h2', { hasText: 'To Do' })
  await expect(todoHeader).toContainText('1')
})

test('[A4] editing a card title updates the card', async ({ page }) => {
  await page.goto('/')
  await addCard(page, 'Write spec')
  await page.getByText('Write spec').click()
  await page.getByLabel('Title').fill('Write final spec')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Write final spec')).toBeVisible()
  await expect(page.getByText('Write spec', { exact: true })).toHaveCount(0)
})

// A5: drag "Write final spec" To Do -> In Progress; To Do shows 0, In Progress shows 1.
// Note: a bare getByText('0') would not match inside "01", so assert per-column headers.
test('[A5] dragging a card to In Progress moves it and updates WIP counts', async ({ page }) => {
  await page.goto('/')
  await addCard(page, 'Write spec')
  await page.getByText('Write spec').click()
  await page.getByLabel('Title').fill('Write final spec')
  await page.getByRole('button', { name: 'Save' }).click()

  await page.getByText('Write final spec').dragTo(page.getByText('In Progress', { exact: true }))
  await expect(page.getByText('Write final spec')).toBeVisible()
  await expect(page.locator('h2', { hasText: 'To Do' })).toContainText('0')
  await expect(page.locator('h2', { hasText: 'In Progress' })).toContainText('1')
})

test('[A6] deleting a card removes it and resets WIP count', async ({ page }) => {
  await page.goto('/')
  await addCard(page, 'Write spec')
  await page.getByText('Write spec').click()
  await page.getByLabel('Title').fill('Write final spec')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByText('Write final spec').dragTo(page.getByText('In Progress', { exact: true }))
  await page.getByRole('button', { name: 'Delete card' }).click()
  await expect(page.getByText('Write final spec')).toHaveCount(0)
  await expect(page.locator('h2', { hasText: 'In Progress' })).toContainText('0')
})

test('[A7] adding a card to In Progress shows its WIP count', async ({ page }) => {
  await page.goto('/')
  await addCard(page, 'Review code', 1)
  await expect(page.getByText('Review code')).toBeVisible()
  await expect(page.locator('h2', { hasText: 'In Progress' })).toContainText('1')
})

test('[A8] Export JSON copies board state to clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const empty = await page.evaluate(() => navigator.clipboard.readText())
  expect(JSON.parse(empty)).toEqual([])

  await addCard(page, 'Write spec')
  await page.getByText('Write spec').click()
  await page.getByLabel('Title').fill('Write final spec')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Write final spec')
})

test('[A9] reload keeps the card and its WIP count', async ({ page }) => {
  await page.goto('/')
  await addCard(page, 'Review code', 1)
  await page.reload()
  await expect(page.getByText('Review code')).toBeVisible()
  await expect(page.locator('h2', { hasText: 'In Progress' })).toContainText('1')
})
