// Acceptance tests for calorie-counter.
// The app is built against these tests; they must not be edited afterwards.
import { expect, test, type Page } from '@playwright/test'

const addMeal = async (page: Page, name: string, category: string, calories: string) => {
  await page.getByLabel('Meal name').fill(name)
  await page.getByLabel('Category').selectOption(category)
  await page.getByLabel('Calories').fill(calories)
  await page.getByRole('button', { name: 'Add meal' }).click()
}

// The table row containing the given meal name.
const row = (page: Page, name: string) =>
  page.getByRole('table').getByRole('row').filter({ hasText: name })

// Data rows in display order (index 0 is the topmost row).
const dataRows = async (page: Page) => {
  const rows = await page.getByRole('table').getByRole('row').all()
  const texts = await Promise.all(rows.map((r) => r.innerText()))
  return texts.filter((t) => t.includes('Oatmeal') || t.includes('Salad'))
}

test('[A1] empty state shows heading and "No meals logged yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Calorie Counter' })).toBeVisible()
  await expect(page.getByText('No meals logged yet')).toBeVisible()
})

test('[A2] adding a meal appends a row and shows the total', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Oatmeal', 'Breakfast', '300')
  await expect(row(page, 'Oatmeal')).toContainText('Breakfast')
  await expect(row(page, 'Oatmeal')).toContainText('300')
  await expect(page.getByText('Total: 300 kcal')).toBeVisible()
})

test('[A3] two meals update total and mean', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Oatmeal', 'Breakfast', '300')
  await addMeal(page, 'Salad', 'Lunch', '450')
  await expect(row(page, 'Oatmeal')).toBeVisible()
  await expect(row(page, 'Salad')).toBeVisible()
  await expect(page.getByText('Total: 750 kcal')).toBeVisible()
  await expect(page.getByText('Mean: 375 kcal')).toBeVisible()
})

test('[A4] clicking Calories sorts descending then ascending', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Oatmeal', 'Breakfast', '300')
  await addMeal(page, 'Salad', 'Lunch', '450')

  await page.getByRole('columnheader', { name: 'Calories' }).click()
  expect(await dataRows(page), 'descending puts Salad above Oatmeal').toEqual([
    expect.stringContaining('Salad'),
    expect.stringContaining('Oatmeal'),
  ])

  await page.getByRole('columnheader', { name: 'Calories' }).click()
  expect(await dataRows(page), 'ascending puts Oatmeal above Salad').toEqual([
    expect.stringContaining('Oatmeal'),
    expect.stringContaining('Salad'),
  ])
})

test('[A5] category filter hides non-matching rows and updates the summary', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Oatmeal', 'Breakfast', '300')
  await addMeal(page, 'Salad', 'Lunch', '450')
  await page.getByLabel('Filter by category').selectOption('Breakfast')
  await expect(row(page, 'Salad')).toHaveCount(0)
  await expect(row(page, 'Oatmeal')).toBeVisible()
  await expect(page.getByText('Total: 300 kcal')).toBeVisible()
})

test('[A6] deleting a meal updates the table and summary', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Oatmeal', 'Breakfast', '300')
  await addMeal(page, 'Salad', 'Lunch', '450')
  await page.getByRole('button', { name: 'Delete Oatmeal' }).click()
  await expect(row(page, 'Oatmeal')).toHaveCount(0)
  await expect(row(page, 'Salad')).toBeVisible()
  await expect(page.getByText('Total: 450 kcal')).toBeVisible()
  await expect(page.getByText('Mean: 450 kcal')).toBeVisible()
})

test('[A7] export CSV copies a CSV string to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addMeal(page, 'Oatmeal', 'Breakfast', '300')
  await addMeal(page, 'Salad', 'Lunch', '450')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  // Reading the clipboard through evaluate is allowed after a user action.
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('Name,Category,Calories')
  expect(clip).toContain('Salad,Lunch,450')
})

test('[A8] zero calories are rejected with an error message', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Oatmeal', 'Breakfast', '0')
  await expect(page.getByText('Calories must be greater than 0')).toBeVisible()
  await expect(row(page, 'Oatmeal')).toHaveCount(0)
})

test('[A9] meals persist across reload', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Oatmeal', 'Breakfast', '300')
  await addMeal(page, 'Salad', 'Lunch', '450')
  await page.reload()
  await expect(row(page, 'Oatmeal')).toBeVisible()
  await expect(row(page, 'Salad')).toBeVisible()
  await expect(page.getByText('Total: 750 kcal')).toBeVisible()
})
