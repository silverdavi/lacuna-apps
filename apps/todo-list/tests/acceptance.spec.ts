import { expect, test, type Page } from '@playwright/test'

function progressValue(page: Page) {
  return page.getByRole('progressbar').first().getAttribute('aria-valuenow')
}

test('[A1] empty app shows heading, empty text and 0% progress', async ({ page }) => {
  await page.goto('/')
  expect(page.getByRole('heading', { name: 'Simple Todo List' })).toBeVisible()
  expect(page.getByText('No tasks yet')).toBeVisible()
  const progress = await progressValue(page)
  expect(progress).toBe('0')
})

test('[A2] adding a task creates an unchecked item and keeps progress at 0%', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task title').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Buy milk' })
  await expect(item).toBeVisible()
  await expect(item.getByRole('checkbox')).not.toBeChecked()
  const progress = await progressValue(page)
  expect(progress).toBe('0')
})

test('[A3] tasks keep insertion order', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task title').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task title').fill('Call mom')
  await page.getByRole('button', { name: 'Add task' }).click()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Buy milk')
  await expect(items.nth(1)).toContainText('Call mom')
})

test('[A4] checking a task strikes it through and sets progress to 50%', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task title').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task title').fill('Call mom')
  await page.getByRole('button', { name: 'Add task' }).click()
  const milk = page.getByRole('listitem').filter({ hasText: 'Buy milk' })
  await milk.getByRole('checkbox').click()
  const title = milk.locator('span, div, label').filter({ hasText: /^Buy milk$/ }).first()
  const strike = await title.evaluate((el) => getComputedStyle(el).textDecorationLine)
  expect(strike, 'completed task title has strikethrough styling').toContain('line-through')
  const progress = await progressValue(page)
  expect(progress).toBe('50')
})

test('[A5] dragging an item above another reorders the list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task title').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task title').fill('Call mom')
  await page.getByRole('button', { name: 'Add task' }).click()
  const mom = page.getByRole('listitem').filter({ hasText: 'Call mom' })
  const milk = page.getByRole('listitem').filter({ hasText: 'Buy milk' })
  await mom.dragTo(milk)
  const items = page.getByRole('listitem')
  await expect(items.nth(0)).toContainText('Call mom')
  await expect(items.nth(1)).toContainText('Buy milk')
})

test('[A6] adding a duplicate shows "Task already exists" and adds nothing', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task title').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task title').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByText('Task already exists')).toBeVisible()
})

test('[A7] deleting the only task shows the empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task title').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByRole('button', { name: 'Delete Buy milk' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No tasks yet')).toBeVisible()
  const progress = await progressValue(page)
  expect(progress).toBe('0')
})

test('[A8] a due date is shown as "Due: Jan 15, 2024"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task title').fill('Buy milk')
  await page.getByLabel('Due date').fill('2024-01-15')
  await page.getByRole('button', { name: 'Add task' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Buy milk' })
  await expect(item).toContainText('Due: Jan 15, 2024')
})

test('[A9] reload keeps a completed task and its progress', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task title').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByRole('listitem').getByRole('checkbox').click()
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'Buy milk' })
  await expect(item).toBeVisible()
  await expect(item.getByRole('checkbox')).toBeChecked()
  const progress = await progressValue(page)
  expect(progress).toBe('50')
})
