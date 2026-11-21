import { expect, test, type Page } from '@playwright/test'

async function addHabit(page: Page, name: string) {
  await page.getByLabel('Habit name').fill(name)
  await page.getByRole('button', { name: 'Add habit' }).click()
}

function streakOf(page: Page, name: string) {
  return page.getByRole('listitem').filter({ hasText: name }).getByText(/Streak: \d+/)
}

test('[A1] page heading is "Habit Heatmap"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Habit Heatmap' })).toBeVisible()
})

test('[A2] with no habits the page shows "No habits yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No habits yet')).toBeVisible()
})

test('[A3] adding "Read" creates a list item and removes "No habits yet"', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toBeVisible()
  await expect(page.getByText('No habits yet')).toHaveCount(0)
})

test('[A4] "Log today" logs today for "Read" and shows "Streak: 1"', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await page.getByRole('button', { name: 'Log today' }).click()
  await expect(streakOf(page, 'Read')).toContainText('Streak: 1')
})

test('[A5] "Log yesterday" after "Log today" gives "Streak: 2"', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await page.getByRole('button', { name: 'Log today' }).click()
  await page.getByRole('button', { name: 'Log yesterday' }).click()
  await expect(streakOf(page, 'Read')).toContainText('Streak: 2')
})

test('[A6] logging today again does not change the streak', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await page.getByRole('button', { name: 'Log today' }).click()
  await page.getByRole('button', { name: 'Log yesterday' }).click()
  await page.getByRole('button', { name: 'Log today' }).click()
  await expect(streakOf(page, 'Read')).toContainText('Streak: 2')
})

test('[A7] "Delete Read" removes the habit and shows "No habits yet"', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await page.getByRole('button', { name: 'Delete Read' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toHaveCount(0)
  await expect(page.getByText('No habits yet')).toBeVisible()
})

test('[A8] the "Heatmap" tab shows a grid where today has data-value="1"', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await page.getByRole('button', { name: 'Log today' }).click()
  await page.getByRole('tab', { name: 'Heatmap' }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  // The spec pins data-value="1" on today's cell; reading the attribute back after a user action is allowed.
  await expect(page.locator('[data-value="1"]')).not.toHaveCount(0)
})

test('[A9] reload keeps the habit and its logged entries', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await page.getByRole('button', { name: 'Log today' }).click()
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toBeVisible()
  await expect(streakOf(page, 'Read')).toContainText('Streak: 1')
})
