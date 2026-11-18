import { expect, test, type Page } from '@playwright/test'

async function addTask(page: Page, text: string) {
  await page.getByLabel('New task').fill(text)
  await page.getByLabel('New task').press('Enter')
}

async function item(page: Page, name: string) {
  return page.getByRole('listitem', { name })
}

test('[A1] empty list shows heading, empty text and 0% progress', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Task List' })).toBeVisible()
  await expect(page.getByText('No tasks yet')).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveValue(0)
})

test('[A2] adding a task shows it unchecked and progress stays 0%', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await expect(item(page, 'Buy milk')).toBeVisible()
  await expect(page.getByLabel('Buy milk')).not.toBeChecked()
  await expect(page.getByRole('progressbar')).toHaveValue(0)
})

test('[A3] checking a task strikes it through and progress shows 50%', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await page.getByLabel('Buy milk').click()
  await expect(page.getByLabel('Buy milk')).toBeChecked()
  await expect(item(page, 'Buy milk')).toHaveText(/Buy milk/)
  // strikethrough: item text renders with line-through
  await expect(item(page, 'Buy milk').getByText('Buy milk')).toHaveCSS('text-decoration-line', 'line-through')
  await expect(page.getByRole('progressbar')).toHaveValue(50)
})

test('[A4] an empty task adds nothing and shows the toast', async ({ page }) => {
  // The spec reads as submitting the field with no text in it; "Empty" is its name for that.
  await page.goto('/')
  await page.getByLabel('New task').fill('')
  await page.getByLabel('New task').press('Enter')
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('Task text cannot be empty')).toBeVisible()
})

test('[A5] Edit turns the item into a pre-filled input and Enter saves it', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await item(page, 'Buy milk').getByRole('button', { name: 'Edit' }).click()
  const input = page.getByRole('textbox', { name: /edit/i })
  await expect(input).toBeVisible()
  await expect(input).toHaveValue('Buy milk')
  await input.fill('Buy oat milk')
  await input.press('Enter')
  await expect(item(page, 'Buy oat milk')).toBeVisible()
  await expect(item(page, 'Buy milk')).toHaveCount(0)
})

test('[A6] Delete removes the item, toast offers Undo which restores it in place', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await item(page, 'Buy milk').getByRole('button', { name: 'Delete' }).click()
  await expect(item(page, 'Buy milk')).toHaveCount(0)
  await expect(item(page, 'Walk dog')).toBeVisible()
  await expect(page.getByText('Task deleted')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  const items = page.getByRole('listitem')
  expect(await items.count()).toBe(2)
  expect(await items.nth(0).innerText()).toContain('Buy milk')
  expect(await items.nth(1).innerText()).toContain('Walk dog')
})

test('[A7] Alt+ArrowUp on a focused item moves it above the previous one', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await item(page, 'Walk dog').focus()
  await page.keyboard.press('Alt+ArrowUp')
  const items = page.getByRole('listitem')
  expect(await items.nth(0).innerText()).toContain('Walk dog')
  expect(await items.nth(1).innerText()).toContain('Buy milk')
})

test('[A8] added tasks persist across a reload in the same order', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await page.reload()
  const items = page.getByRole('listitem')
  expect(await items.count()).toBe(2)
  expect(await items.nth(0).innerText()).toContain('Buy milk')
  expect(await items.nth(1).innerText()).toContain('Walk dog')
  await expect(page.getByRole('progressbar')).toHaveValue(0)
})
