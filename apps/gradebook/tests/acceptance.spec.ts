import { expect, test } from '@playwright/test'

// A2–A3: "pressing Tab" moves focus to the Average column, so the average cell
// must be focusable and is read via document.activeElement (reading is allowed).
// A7: the spec's CSV copy is verified against clipboard.readText(), which is a
// read, not a user action.

test('[A1] empty grid with heading and column headers', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Gradebook Manager' })).toBeVisible()
  for (const header of ['Student', 'Math', 'Science', 'English', 'Average']) {
    await expect(page.getByRole('columnheader', { name: header })).toBeVisible()
  }
})

test('[A2] Alice average shows 91.67 after Tab', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Student').first().fill('Alice')
  await page.getByLabel('Math').first().fill('95')
  await page.getByLabel('Science').first().fill('88')
  await page.getByLabel('English').first().fill('92')
  await page.getByLabel('English').first().press('Tab')
  const active = await page.evaluate(() => document.activeElement?.textContent?.trim())
  expect(active).toBe('91.67')
})

test('[A3] Bob average shows 75.00 after Tab', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Student').first().fill('Bob')
  await page.getByLabel('Math').first().fill('70')
  await page.getByLabel('Science').first().fill('75')
  await page.getByLabel('English').first().fill('80')
  await page.getByLabel('English').first().press('Tab')
  const active = await page.evaluate(() => document.activeElement?.textContent?.trim())
  expect(active).toBe('75.00')
})

test('[A4] Add Student button adds an empty row', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Student' }).click()
  await expect(page.getByRole('button', { name: 'Add Student' })).toBeVisible()
  const rows = page.getByRole('row').filter({ has: page.getByLabel('Student') })
  await expect(rows).toHaveCount(1)
  await expect(page.getByLabel('Student').first()).toHaveValue('')
  await expect(page.getByLabel('Math').first()).toHaveValue('')
  await expect(page.getByLabel('Science').first()).toHaveValue('')
  await expect(page.getByLabel('English').first()).toHaveValue('')
})

test('[A5] Delete Student removes the selected row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Student').first().fill('Alice')
  await page.getByLabel('Math').first().fill('95')
  await page.getByLabel('Science').first().fill('88')
  await page.getByLabel('English').first().fill('92')

  const bobRow = page.getByRole('row', { name: /Bob/ })
  await bobRow.locator('input').first().fill('Bob')
  await bobRow.locator('input').nth(1).fill('70')
  await bobRow.locator('input').nth(2).fill('75')
  await bobRow.locator('input').nth(3).fill('80')

  const aliceRow = page.getByRole('row', { name: /Alice/ })
  await aliceRow.locator('input').first().press('Tab')
  await aliceRow.click()
  await page.getByRole('button', { name: 'Delete Student' }).click()

  await expect(page.getByText('Alice')).toHaveCount(0)
  await expect(bobRow.getByRole('cell').last()).toHaveText('75.00')
})

test('[A6] Statistics tab shows class statistics', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Student').first().fill('Alice')
  await page.getByLabel('Math').first().fill('95')
  await page.getByLabel('Science').first().fill('88')
  await page.getByLabel('English').first().fill('92')

  const bobRow = page.getByRole('row', { name: /Bob/ })
  await bobRow.locator('input').first().fill('Bob')
  await bobRow.locator('input').nth(1).fill('70')
  await bobRow.locator('input').nth(2).fill('75')
  await bobRow.locator('input').nth(3).fill('80')

  await page.getByRole('tab', { name: 'Statistics' }).click()
  await expect(page.getByText('Class Average: 83.34')).toBeVisible()
  await expect(page.getByText('Highest: 95')).toBeVisible()
  await expect(page.getByText('Lowest: 70')).toBeVisible()
  await expect(page.getByText('Median: 83.00')).toBeVisible()
})

test('[A7] Export CSV copies the grid as CSV', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Student').first().fill('Bob')
  await page.getByLabel('Math').first().fill('70')
  await page.getByLabel('Science').first().fill('75')
  await page.getByLabel('English').first().fill('80')

  await page.getByRole('tab', { name: 'Statistics' }).click()
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Student,Math,Science,English,Average')
  expect(text).toContain('Bob,70,75,80,75.00')
})

test('[A8] 105 in Math updates Bob to 78.33 and Statistics highest', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Student').first().fill('Bob')
  await page.getByLabel('Math').first().fill('70')
  await page.getByLabel('Science').first().fill('75')
  await page.getByLabel('English').first().fill('80')

  await page.getByLabel('Math').first().fill('105')
  await page.getByLabel('Math').first().press('Tab')
  const active = await page.evaluate(() => document.activeElement?.textContent?.trim())
  expect(active).toBe('78.33')

  await page.getByRole('tab', { name: 'Statistics' }).click()
  await expect(page.getByText('Highest: 105')).toBeVisible()
})

test('[A9] gradebook data survives reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Student').first().fill('Bob')
  await page.getByLabel('Math').first().fill('70')
  await page.getByLabel('Science').first().fill('75')
  await page.getByLabel('English').first().fill('80')

  await page.reload()
  await expect(page.getByLabel('Student').first()).toHaveValue('Bob')
  await expect(page.getByLabel('Math').first()).toHaveValue('70')
  await expect(page.getByLabel('Science').first()).toHaveValue('75')
  await expect(page.getByLabel('English').first()).toHaveValue('80')
  await expect(page.getByRole('row', { name: /Bob/ }).getByRole('cell').last()).toHaveText('78.33')
})
