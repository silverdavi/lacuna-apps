import { expect, test, type Page } from '@playwright/test'

// A1: "a month grid where the button for the 15th ... is labelled \"15\"."
// The grid shows only the current month (A8: "button \"16\""), so the month is
// whatever today's is; the day numbers 1..31 are stable regardless.
function dayButton(page: Page, day: string) {
  return page.getByRole('button', { name: day, exact: true })
}

// A4 names the strikethrough on the item's text; read it after the user's click.
async function itemText(page: Page, name: string) {
  const text = page
    .getByRole('listitem')
    .filter({ hasText: name })
    .getByText(name, { exact: true })
  const style = await text.evaluate((el) => getComputedStyle(el).textDecoration)
  return style
}

async function addTask(page: Page, name: string) {
  await page.getByLabel('New task').fill(name)
  await page.getByLabel('New task').press('Enter')
}

test('[A1] page shows the heading and a month grid with a button labelled "15"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bullet Journal' })).toBeVisible()
  await expect(dayButton(page, '15')).toBeVisible()
})

test('[A2] clicking "15" selects that day and shows "Tasks for 15"', async ({ page }) => {
  await page.goto('/')
  await dayButton(page, '15').click()
  await expect(page.getByText('Tasks for 15')).toBeVisible()
})

test('[A3] adding "Buy milk" creates an unchecked item and progress "0/1"', async ({ page }) => {
  await page.goto('/')
  await dayButton(page, '15').click()
  await addTask(page, 'Buy milk')
  await expect(page.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked()
  await expect(page.getByText('0/1', { exact: true })).toBeVisible()
})

test('[A4] checking "Buy milk" strikes through its text and shows progress "1/1"', async ({ page }) => {
  await page.goto('/')
  await dayButton(page, '15').click()
  await addTask(page, 'Buy milk')
  await page.getByRole('checkbox', { name: 'Buy milk' }).click()
  await expect(page.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked()
  // Spec: "changes its text to \"Buy milk\" with a strikethrough style."
  await expect(await itemText(page, 'Buy milk')).toContain('line-through')
  await expect(page.getByText('1/1', { exact: true })).toBeVisible()
})

test('[A5] adding "Read book" gives progress "1/2"', async ({ page }) => {
  await page.goto('/')
  await dayButton(page, '15').click()
  await addTask(page, 'Buy milk')
  await page.getByRole('checkbox', { name: 'Buy milk' }).click()
  await addTask(page, 'Read book')
  await expect(page.getByText('1/2', { exact: true })).toBeVisible()
})

test('[A6] moving "Read book" up puts it first', async ({ page }) => {
  await page.goto('/')
  await dayButton(page, '15').click()
  await addTask(page, 'Buy milk')
  await addTask(page, 'Read book')
  await page.getByRole('button', { name: 'Move up' }).click()
  const first = page.getByRole('listitem').first()
  await expect(first).toContainText('Read book')
})

test('[A7] deleting "Read book" leaves only "Buy milk" with progress "1/1"', async ({ page }) => {
  await page.goto('/')
  await dayButton(page, '15').click()
  await addTask(page, 'Buy milk')
  await addTask(page, 'Read book')
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Read book' })).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
  await expect(page.getByText('1/1', { exact: true })).toBeVisible()
})

test('[A8] clicking "16" shows "Tasks for 16" and "No tasks yet"', async ({ page }) => {
  await page.goto('/')
  await dayButton(page, '16').click()
  await expect(page.getByText('Tasks for 16')).toBeVisible()
  await expect(page.getByText('No tasks yet')).toBeVisible()
})

test('[A9] reload keeps "Buy milk" checked for the 15th with progress "1/1"', async ({ page }) => {
  await page.goto('/')
  await dayButton(page, '15').click()
  await addTask(page, 'Buy milk')
  await page.getByRole('checkbox', { name: 'Buy milk' }).click()
  await page.reload()
  await dayButton(page, '15').click()
  await expect(page.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked()
  await expect(page.getByText('1/1', { exact: true })).toBeVisible()
})
