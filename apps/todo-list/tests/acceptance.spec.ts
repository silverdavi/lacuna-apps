import { expect, test, type Page, type Locator } from '@playwright/test'

// Sync helper: Locator.filter() is synchronous, and an async helper would
// return a Promise that expect() rejects.
function taskItem(page: Page, title: string) {
  return page.getByRole('listitem').filter({ hasText: title })
}

function addTask(page: Page, title: string, due?: string) {
  return (async () => {
    await page.getByLabel('Task title', { exact: true }).fill(title)
    if (due) await page.getByLabel('Due date', { exact: true }).fill(due)
    await page.getByRole('button', { name: 'Add task', exact: true }).click()
  })()
}

const progress = (page: Page) =>
  page.getByRole('progressbar', { name: 'Completion', exact: true })

test('[A1] empty app shows heading, "No tasks yet" and progress 0', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Simple Todo List' })).toBeVisible()
  await expect(page.getByText('No tasks yet', { exact: true })).toBeVisible()
  await expect(progress(page)).toHaveAttribute('aria-valuenow', '0')
})

test('[A2] adding "Buy milk" creates one item and progress stays 0', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await expect(taskItem(page, 'Buy milk')).toHaveCount(1)
  await expect(taskItem(page, 'Buy milk').getByRole('checkbox', { name: 'Buy milk', exact: true })).not.toBeChecked()
  await expect(progress(page)).toHaveAttribute('aria-valuenow', '0')
})

test('[A3] two tasks keep list order', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  const items = page.getByRole('list', { name: 'Tasks', exact: true }).getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Buy milk')
  await expect(items.nth(1)).toContainText('Call mom')
})

test('[A4] checking a task strikes its title and progress becomes 50', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await page.getByRole('checkbox', { name: 'Buy milk', exact: true }).check()
  await expect(taskItem(page, 'Buy milk').getByText('Buy milk', { exact: true })).toHaveCSS('text-decoration-line', 'line-through')
  await expect(progress(page)).toHaveAttribute('aria-valuenow', '50')
})

test('[A5] dragging "Call mom" onto "Buy milk" reorders the list', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await page.getByRole('button', { name: 'Drag Call mom', exact: true }).dragTo(taskItem(page, 'Buy milk'))
  const items = page.getByRole('list', { name: 'Tasks', exact: true }).getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Call mom')
  await expect(items.nth(1)).toContainText('Buy milk')
})

test('[A6] adding a duplicate shows "Task already exists"', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Buy milk')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByText('Task already exists', { exact: true })).toBeVisible()
})

test('[A7] deleting the only task shows "No tasks yet" and progress 0', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await page.getByRole('button', { name: 'Delete Buy milk', exact: true }).click()
  await expect(page.getByText('No tasks yet', { exact: true })).toBeVisible()
  await expect(progress(page)).toHaveAttribute('aria-valuenow', '0')
})

test('[A8] a due date renders as "Due: Jan 15, 2024"', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk', '2024-01-15')
  await expect(taskItem(page, 'Buy milk')).toContainText('Due: Jan 15, 2024')
})

test('[A9] reload keeps tasks and their checked state', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await page.getByRole('checkbox', { name: 'Buy milk', exact: true }).check()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Buy milk', exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Call mom', exact: true })).not.toBeChecked()
  await expect(progress(page)).toHaveAttribute('aria-valuenow', '50')
})

test('[A10] tabs: Done lists only checked tasks, Settings has "Clear completed"', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  await page.getByRole('checkbox', { name: 'Buy milk', exact: true }).check()
  await page.getByRole('tab', { name: 'Done', exact: true }).click()
  const doneItems = page.getByRole('list', { name: 'Tasks', exact: true }).getByRole('listitem')
  await expect(doneItems).toHaveCount(1)
  await expect(doneItems.nth(0)).toContainText('Buy milk')
  await expect(doneItems.nth(0)).not.toContainText('Call mom')
  await page.getByRole('tab', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Clear completed', exact: true })).toBeVisible()
})

test('[A11] Export CSV downloads tasks.csv with a header and two data rows', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Call mom')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV', exact: true }).click(),
  ])
  expect(download.suggestedFilename()).toBe('tasks.csv')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n')
  expect(lines[0]).toBe('title,due,done')
  expect(lines.slice(1)).toHaveLength(2)
})
