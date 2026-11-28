import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Loads Q1 Product Launch template with CPM duration and critical path', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Project Gantt' })).toBeVisible()
  await expect(page.getByText('18d', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('table', { name: 'Project schedule' })).toContainText('Public launch milestone')
  await expect(page.getByRole('table', { name: 'Project schedule' })).toContainText('0d (CPM)')
})

test('[A2] Adding a dependent task extends critical path and persists across reload', async ({ page }) => {
  await page.getByLabel('New task name').fill('Post-launch retrospective')
  await page.getByLabel('New task duration (days)').fill('3')
  await page.getByLabel('Depends on').selectOption('T7')
  await page.getByRole('button', { name: 'Add task' }).click()

  await expect(page.getByText('21d', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('table', { name: 'Project schedule' })).toContainText('Post-launch retrospective')

  await page.reload()
  await expect(page.getByText('21d', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('table', { name: 'Project schedule' })).toContainText('Post-launch retrospective')
})

test('[A3] Editing task duration recalculates CPM and supports Undo/Redo', async ({ page }) => {
  // T1 is selected by default (4 days); change to 7 days -> project duration 18 + 3 = 21d
  await page.getByLabel('Duration (days, 0 = milestone)').fill('7')
  await expect(page.getByText('21d', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('18d', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByText('21d', { exact: true }).first()).toBeVisible()
})

test('[A4] Critical path filter and zoom controls work', async ({ page }) => {
  await page.getByRole('button', { name: 'Day', exact: true }).click()
  await page.getByLabel('Critical path only').check()
  // T4 (Partner beta program) has slack and is not critical
  await expect(page.getByRole('table', { name: 'Project schedule' })).not.toContainText('Partner beta program')
  await expect(page.getByRole('table', { name: 'Project schedule' })).toContainText('Market & pricing brief')
})

test('[A5] Export ICS and CSV trigger file downloads', async ({ page }) => {
  const icsDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export ICS' }).click()
  expect((await icsDownload).suggestedFilename()).toBe('project-gantt.ics')

  const csvDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  expect((await csvDownload).suggestedFilename()).toBe('project-gantt.csv')
})
