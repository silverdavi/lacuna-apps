import { expect, test, type Locator, type Page } from '@playwright/test'

const addTask = async (page: Page, title: string, due?: string) => {
  await page.getByLabel('Task title', { exact: true }).fill(title)
  if (due !== undefined) await page.getByLabel('Due date', { exact: true }).fill(due)
  await page.getByRole('button', { name: 'Add task', exact: true }).click()
}

const taskItem = (page: Page, title: string): Locator =>
  page.getByRole('listitem').filter({ hasText: title })

test('[A1] empty state shows heading, empty message and 0% progress', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Simple Todo List', exact: true })).toBeVisible()
  await expect(page.getByText('No tasks yet', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Completion', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '0',
  )
})

test('[A2] adding a task creates a listitem with its checkbox', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  const item = taskItem(page, 'Buy milk')
  await expect(item).toHaveCount(1)
  await expect(item.getByRole('checkbox', { name: 'Buy milk', exact: true })).not.toBeChecked()
  await expect(page.getByRole('progressbar', { name: 'Completion', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '0',
  )
})

test('[A3] tasks are listed in the order they were added', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Buy milk')
  await expect(items.nth(1)).toContainText('Call mom')
})

test('[A4] checking a task strikes it through and updates progress', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  const item = taskItem(page, 'Buy milk')
  await item.getByRole('checkbox', { name: 'Buy milk', exact: true }).check()
  await expect(item.getByText('Buy milk', { exact: true })).toHaveCSS('text-decoration-line', 'line-through')
  await expect(page.getByRole('progressbar', { name: 'Completion', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '50',
  )
})

test('[A5] dragging a task handle reorders the list', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await page
    .getByRole('button', { name: 'Drag Call mom', exact: true })
    .dragTo(taskItem(page, 'Buy milk'))
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Call mom')
  await expect(items.nth(1)).toContainText('Buy milk')
})

test('[A6] adding a duplicate task is rejected', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Buy milk')
  await expect(taskItem(page, 'Buy milk')).toHaveCount(1)
  await expect(page.getByText('Task already exists', { exact: true })).toBeVisible()
})

test('[A7] deleting the last task restores the empty state', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await page.getByRole('button', { name: 'Delete Buy milk', exact: true }).click()
  await expect(taskItem(page, 'Buy milk')).toHaveCount(0)
  await expect(page.getByText('No tasks yet', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Completion', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '0',
  )
})

test('[A8] a due date is shown on the task', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk', '2024-01-15')
  const item = taskItem(page, 'Buy milk')
  await expect(item).toBeVisible()
  await expect(item.getByText('Due: Jan 15, 2024', { exact: true })).toBeVisible()
})

test('[A9] tasks and their checked state survive a reload', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await taskItem(page, 'Buy milk').getByRole('checkbox', { name: 'Buy milk', exact: true }).check()
  await page.reload()
  await expect(taskItem(page, 'Buy milk').getByRole('checkbox', { name: 'Buy milk', exact: true })).toBeChecked()
  await expect(taskItem(page, 'Call mom').getByRole('checkbox', { name: 'Call mom', exact: true })).not.toBeChecked()
  await expect(page.getByRole('progressbar', { name: 'Completion', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '50',
  )
})
