import { expect, test } from '@playwright/test'

test('[A1] shows the heading and tab labels', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Meal Planner' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Week View' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Shopping List' })).toBeVisible()
})

async function addMeal(page: Parameters<Parameters<typeof test>['0']>[0]['page'], name: string, day: string, ingredients: string) {
  await page.getByRole('button', { name: 'Add Meal' }).click()
  await page.getByLabel('Meal Name').fill(name)
  await page.getByLabel('Day').selectOption(day)
  await page.getByLabel('Ingredients').fill(ingredients)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A2] adding a meal adds a row to the week view', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Pasta', 'Monday', 'Spaghetti, Tomato sauce')
  const row = page.getByText('Pasta')
  await expect(row).toBeVisible()
  await expect(row.locator('..')).toContainText('Monday')
})

test('[A3] shopping list shows the meal ingredients', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Pasta', 'Monday', 'Spaghetti, Tomato sauce')
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Spaghetti' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Tomato sauce' })).toBeVisible()
})

test('[A4] shared ingredient appears once with quantity 2', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Pasta', 'Monday', 'Spaghetti, Tomato sauce')
  await addMeal(page, 'Salad', 'Tuesday', 'Lettuce, Tomato sauce')
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Tomato sauce' })
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('2')
})

test('[A5] deleting a meal updates the shopping list', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Pasta', 'Monday', 'Spaghetti, Tomato sauce')
  await addMeal(page, 'Salad', 'Tuesday', 'Lettuce, Tomato sauce')
  await page.getByRole('button', { name: 'Delete Pasta' }).click()
  await expect(page.getByText('Pasta')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  await expect(page.getByText('Spaghetti')).toHaveCount(0)
  const tomato = page.getByRole('listitem').filter({ hasText: 'Tomato sauce' })
  await expect(tomato).toHaveCount(1)
  await expect(tomato).toContainText('1')
})

test('[A6] copying the list copies the consolidated text', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Pasta', 'Monday', 'Spaghetti, Tomato sauce')
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  await page.getByRole('button', { name: 'Copy List' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('Spaghetti: 1\nTomato sauce: 1')
})

test('[A7] exporting downloads a meal-plan.ics containing the meal', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Pasta', 'Monday', 'Spaghetti, Tomato sauce')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export ICS' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('meal-plan.ics')
  const path = await download.path()
  const content = await require('fs/promises').readFile(path, 'utf8')
  expect(content).toContain('SUMMARY:Pasta')
})

test('[A8] shows empty states with no meals', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No meals planned')).toBeVisible()
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  await expect(page.getByText('No items to buy')).toBeVisible()
})

test('[A9] reloading keeps the planned meal', async ({ page }) => {
  await page.goto('/')
  await addMeal(page, 'Pasta', 'Monday', 'Spaghetti, Tomato sauce')
  await page.reload()
  await expect(page.getByText('Pasta')).toBeVisible()
  await expect(page.getByText('Monday')).toBeVisible()
})
