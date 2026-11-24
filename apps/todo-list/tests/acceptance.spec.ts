import { expect, test } from '@playwright/test'

const exact = { exact: true }

async function addTask(page: import('@playwright/test').Page, title: string, due?: string) {
  await page.getByLabel('Task title', exact).fill(title)
  if (due) await page.getByLabel('Due date', exact).fill(due)
  await page.getByRole('button', { name: 'Add task', ...exact }).click()
}

async function taskItem(page: import('@playwright/test').Page, title: string) {
  return page.getByRole('listitem').filter({ hasText: title })
}

test('[A1] empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Simple Todo List', ...exact })).toBeVisible()
  await expect(page.getByText('No tasks yet', exact)).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Completion', ...exact })).toHaveAttribute('aria-valuenow', '0')
})

test('[A2] add a task', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  const item = taskItem(page, 'Buy milk')
  await expect(item).toBeVisible()
  await expect(page.getByLabel('Buy milk', exact)).not.toBeChecked()
  await expect(page.getByRole('progressbar', { name: 'Completion', ...exact })).toHaveAttribute('aria-valuenow', '0')
})

test('[A3] add a second task in order', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await expect(page.getByRole('listitem').first()).toContainText('Buy milk')
  await expect(page.getByRole('listitem').nth(1)).toContainText('Call mom')
})

test('[A4] checking a task strikes it through and updates progress', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await page.getByLabel('Buy milk', exact).check()
  await expect(page.getByText('Buy milk', exact)).toHaveCSS('text-decoration-line', 'line-through')
  await expect(page.getByRole('progressbar', { name: 'Completion', ...exact })).toHaveAttribute('aria-valuenow', '50')
})

test('[A5] dragging a task above another reorders the list', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await page.getByRole('button', { name: 'Drag Call mom', ...exact }).dragTo(taskItem(page, 'Buy milk'))
  await expect(page.getByRole('listitem').first()).toContainText('Call mom')
  await expect(page.getByRole('listitem').nth(1)).toContainText('Buy milk')
})

test('[A6] adding a duplicate title is rejected', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Buy milk')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('status')).toContainText('Task already exists')
})

test('[A7] deleting the only task restores the empty state', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await page.getByRole('button', { name: 'Delete Buy milk', ...exact }).click()
  await expect(page.getByText('No tasks yet', exact)).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Completion', ...exact })).toHaveAttribute('aria-valuenow', '0')
})

test('[A8] a due date is shown in the item', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk', '2024-01-15')
  await expect(taskItem(page, 'Buy milk')).toContainText('Buy milk')
  await expect(taskItem(page, 'Buy milk')).toContainText('Due: Jan 15, 2024')
})

test('[A9] tasks persist across a reload', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await page.getByLabel('Buy milk', exact).check()
  await page.reload()
  await expect(page.getByLabel('Buy milk', exact)).toBeChecked()
  await expect(page.getByLabel('Call mom', exact)).not.toBeChecked()
  await expect(page.getByRole('progressbar', { name: 'Completion', ...exact })).toHaveAttribute('aria-valuenow', '50')
})
