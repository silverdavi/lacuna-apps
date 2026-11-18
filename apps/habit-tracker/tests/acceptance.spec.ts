import { expect, test, type Page } from '@playwright/test'

async function addHabit(page: Page, name: string) {
  await page.getByLabel('Habit name').fill(name)
  await page.getByRole('button', { name: 'Add habit' }).click()
}

async function tick(page: Page, name: string, day: string) {
  await page.getByRole('checkbox', { name: `${name}, ${day}` }).click()
}

test('[A1] adding Read shows a list item with Streak: 0 and seven unticked checkboxes', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  const item = page.getByRole('listitem').filter({ hasText: 'Read' })
  await expect(item).toContainText('Streak: 0')
  for (const day of ['6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', '1 day ago', 'Today']) {
    await expect(page.getByRole('checkbox', { name: `Read, ${day}` })).not.toBeChecked()
  }
})

test('[A2] empty or blank name shows "Enter a habit name." and the list stays empty', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Habit name').fill('')
  await page.getByRole('button', { name: 'Add habit' }).click()
  await expect(page.getByText('Enter a habit name.')).toBeVisible()
  await page.getByLabel('Habit name').fill('   ')
  await page.getByRole('button', { name: 'Add habit' }).click()
  await expect(page.getByText('Enter a habit name.')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A3] adding an existing name shows "That habit already exists." and the list stays at one item', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await addHabit(page, 'Read')
  await expect(page.getByText('That habit already exists.')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(1)
})

test('[A4] ticking "Read, Today" toggles the tick and the streak between 0 and 1', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await tick(page, 'Read', 'Today')
  const today = page.getByRole('checkbox', { name: 'Read, Today' })
  await expect(today).toBeChecked()
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toContainText('Streak: 1')
  await today.click()
  await expect(today).not.toBeChecked()
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toContainText('Streak: 0')
})

test('[A5] ticking 3, 2 and 1 days ago gives Streak: 3, adding Today gives Streak: 4', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await tick(page, 'Read', '3 days ago')
  await tick(page, 'Read', '2 days ago')
  await tick(page, 'Read', '1 day ago')
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toContainText('Streak: 3')
  await tick(page, 'Read', 'Today')
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toContainText('Streak: 4')
})

test('[A6] a gap between the ticked days and today gives Streak: 0', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await tick(page, 'Read', '3 days ago')
  await tick(page, 'Read', '2 days ago')
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toContainText('Streak: 0')
})

test('[A7] renaming Read to Read daily moves the name and keeps the Today tick', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await tick(page, 'Read', 'Today')
  await page.getByRole('button', { name: 'Rename Read' }).click()
  const box = page.getByLabel('New name for Read')
  await expect(box).toHaveValue('Read')
  await box.fill('Read daily')
  await box.press('Enter')
  const item = page.getByRole('listitem').filter({ hasText: 'Read daily' })
  await expect(item).toBeVisible()
  // "Read" occurs as a substring of "Read daily"; the spec's "no list item with the exact name Read"
  // means no checkbox remains named "Read, <day>".
  await expect(page.getByRole('checkbox', { name: 'Read, Today' })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: 'Read daily, Today' })).toBeChecked()
})

test('[A8] Escape closes the delete dialog without deleting', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await page.getByRole('button', { name: 'Delete Read' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Delete Read?')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toBeVisible()
})

test('[A9] Confirm delete removes the habit', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await page.getByRole('button', { name: 'Delete Read' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm delete' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A10] habits and ticks survive a reload', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await tick(page, 'Read', 'Today')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Read, Today' })).toBeChecked()
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toContainText('Streak: 1')
})
