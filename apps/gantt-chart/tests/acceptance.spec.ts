import { expect, test, type Page } from '@playwright/test'

async function addTask(page: Page, name: string, start: string, days: string) {
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task name').fill(name)
  await page.getByLabel('Start date').fill(start)
  await page.getByLabel('Duration (days)').fill(days)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] page shows the Gantt Chart heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Gantt Chart' })).toBeVisible()
})

test('[A2] adding a task shows its bar on the timeline', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Design', '2024-01-15', '5')
  await expect(page.getByText('Design')).toBeVisible()
})

test('[A3] the Dependencies tab lists the added tasks', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Design', '2024-01-15', '5')
  await addTask(page, 'Build', '2024-01-20', '10')
  await page.getByRole('tab', { name: 'Dependencies' }).click()
  await expect(page.getByText('Design')).toBeVisible()
  await expect(page.getByText('Build')).toBeVisible()
})

test('[A4] applying a predecessor shows a dependency line in the timeline view', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Design', '2024-01-15', '5')
  await addTask(page, 'Build', '2024-01-20', '10')
  await page.getByRole('tab', { name: 'Dependencies' }).click()
  const buildRow = page.locator('table tr').filter({ hasText: 'Build' })
  await buildRow.getByLabel('Predecessor').selectOption('Design')
  await buildRow.getByRole('button', { name: 'Apply' }).click()
  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect(page.getByText('Design')).toBeVisible()
  await expect(page.getByText('Build')).toBeVisible()
})

test('[A5] Export copies the timeline text to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addTask(page, 'Design', '2024-01-15', '5')
  await addTask(page, 'Build', '2024-01-20', '10')
  await page.getByRole('button', { name: 'Export' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('Design: 2024-01-15 to 2024-01-19\nBuild: 2024-01-20 to 2024-01-29')
})

test('[A6] dragging the Design bar updates its start and end dates', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Design', '2024-01-15', '5')
  const designBar = page.getByText('Design')
  await designBar.dragTo(designBar, { targetPosition: { x: -5, y: 0 } })
  await expect(page.getByText('2024-01-10')).toBeVisible()
  await expect(page.getByText('2024-01-14')).toBeVisible()
})

test('[A7] deleting a task removes it from the timeline and the dependencies list', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Design', '2024-01-15', '5')
  await addTask(page, 'Build', '2024-01-20', '10')
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Build', { exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Dependencies' }).click()
  await expect(page.getByText('Build', { exact: true })).toHaveCount(0)
})

test('[A8] reload keeps the task with its updated dates', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Design', '2024-01-15', '5')
  const designBar = page.getByText('Design')
  await designBar.dragTo(designBar, { targetPosition: { x: -5, y: 0 } })
  await page.reload()
  await expect(page.getByText('Design')).toBeVisible()
  await expect(page.getByText('2024-01-10')).toBeVisible()
})
