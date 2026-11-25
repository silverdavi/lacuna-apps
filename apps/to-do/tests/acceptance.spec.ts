import { expect, test, type Page } from '@playwright/test'

const item = (page: Page, text: string) =>
  page.getByRole('listitem').filter({ hasText: text })

async function addTask(page: Page, text: string) {
  await page.getByLabel('New task', { exact: true }).fill(text)
  await page.getByLabel('New task', { exact: true }).press('Enter')
}

test('[A1] empty state shows heading, empty note and zero progress', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Task List', exact: true })).toBeVisible()
  await expect(page.getByText('No tasks yet', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Progress', exact: true })).toHaveAttribute('aria-valuenow', '0')
})

test('[A2] adding a task shows it and progress stays 0', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  const li = item(page, 'Buy milk')
  await expect(li).toBeVisible()
  await expect(li.getByRole('checkbox', { name: 'Buy milk', exact: true })).not.toBeChecked()
  await expect(page.getByRole('progressbar', { name: 'Progress', exact: true })).toHaveAttribute('aria-valuenow', '0')
})

test('[A3] checking a task strikes it through and updates progress', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await item(page, 'Buy milk').getByRole('checkbox', { name: 'Buy milk', exact: true }).click()
  await expect(page.getByText('Buy milk', { exact: true })).toHaveCSS('text-decoration-line', 'line-through')
  await expect(page.getByRole('progressbar', { name: 'Progress', exact: true })).toHaveAttribute('aria-valuenow', '50')
})

test('[A4] empty input adds nothing and shows the error', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('New task', { exact: true }).press('Enter')
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('Task text cannot be empty', { exact: true })).toBeVisible()
})

test('[A5] editing a task replaces its text', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await page.getByRole('button', { name: 'Edit Buy milk', exact: true }).click()
  await expect(page.getByLabel('Edit Buy milk', { exact: true })).toHaveValue('Buy milk')
  await page.getByLabel('Edit Buy milk', { exact: true }).fill('Buy oat milk')
  await page.getByLabel('Edit Buy milk', { exact: true }).press('Enter')
  await expect(item(page, 'Buy oat milk').getByRole('checkbox', { name: 'Buy oat milk', exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Buy milk', exact: true })).toHaveCount(0)
})

test('[A6] deleting a task shows a toast; undo restores the order', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await page.getByRole('button', { name: 'Delete Buy milk', exact: true }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('status').getByText('Task deleted', { exact: true })).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(item(page, 'Buy milk')).toBeFirst()
  await expect(item(page, 'Walk dog')).toBeLast()
})

test('[A7] Alt+ArrowUp on a checkbox moves the task up and keeps focus', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  const box = item(page, 'Walk dog').getByRole('checkbox', { name: 'Walk dog', exact: true })
  await box.focus()
  await box.press('Alt+ArrowUp')
  await expect(item(page, 'Walk dog')).toBeFirst()
  await expect(item(page, 'Buy milk')).toBeLast()
  await expect(box).toBeFocused()
})

test('[A8] reload keeps the list and its progress', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await page.reload()
  await expect(item(page, 'Buy milk')).toBeFirst()
  await expect(item(page, 'Walk dog')).toBeLast()
  await expect(page.getByRole('progressbar', { name: 'Progress', exact: true })).toHaveAttribute('aria-valuenow', '0')
})
