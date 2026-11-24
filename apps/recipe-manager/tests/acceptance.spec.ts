import { expect, test, type Download, type Page } from '@playwright/test'

const addRecipe = async (page: Page, name: string, servings: string) => {
  await page.getByRole('button', { name: 'Add recipe' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Servings').fill(servings)
  await page.getByRole('button', { name: 'Save' }).click()
}

const recipeRow = (page: Page, name: string) =>
  page.getByRole('row', { name: new RegExp(`^${name}`) })

const rowNames = async (page: Page): Promise<string[]> => {
  const rows = page.getByRole('row')
  const names: string[] = []
  for (const r of await rows.all()) {
    const cells = await r.getByRole('cell').all()
    if (cells.length) names.push((await cells[0].innerText()).trim())
  }
  return names
}

test('[A1] the page heading is "Recipe Manager"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Recipe Manager' })).toBeVisible()
})

test('[A2] "Add recipe" opens a form and saving "Pancakes" / 4 adds a row with "Pancakes" and "4"', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  const row = recipeRow(page, 'Pancakes')
  await expect(row).toBeVisible()
  await expect(row).toContainText('Pancakes')
  await expect(row).toContainText('4')
  await expect(page.getByText('No recipes yet')).toHaveCount(0)
})

test('[A3] typing "pan" in the search box shows "Pancakes" highlighted and only the Pancakes row', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  await addRecipe(page, 'Soup', '2')
  await page.getByLabel(/search/i).fill('pan')
  const row = recipeRow(page, 'Pancakes')
  await expect(row).toBeVisible()
  await expect(page.getByLabel(/search/i).locator('mark')).toContainText('pan')
  const names = await rowNames(page)
  expect(names).toContain('Pancakes')
  expect(names).not.toContain('Soup')
})

test('[A4] clicking the "Name" column header sorts the rows alphabetically by name', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Zucchini', '2')
  await addRecipe(page, 'Apple', '3')
  await addRecipe(page, 'Mango', '1')
  await page.getByRole('columnheader', { name: 'Name' }).click()
  const names = await rowNames(page)
  const z = names.findIndex((n) => n === 'Zucchini')
  const a = names.findIndex((n) => n === 'Apple')
  const m = names.findIndex((n) => n === 'Mango')
  expect(a).toBeGreaterThanOrEqual(0)
  expect(m).toBeGreaterThanOrEqual(0)
  expect(z).toBeGreaterThanOrEqual(0)
  expect(a).toBeLessThan(m)
  expect(m).toBeLessThan(z)
})

test('[A5] "Edit Pancakes" opens the form pre-filled and saving Servings 6 updates the row to "6"', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  await page.getByRole('button', { name: 'Edit Pancakes' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Pancakes')
  await expect(page.getByLabel('Servings')).toHaveValue('4')
  await page.getByLabel('Servings').fill('6')
  await page.getByRole('button', { name: 'Save' }).click()
  const row = recipeRow(page, 'Pancakes')
  await expect(row).toContainText('6')
  await expect(row).not.toContainText('4')
})

test('[A6] "Delete Pancakes" removes the row from the table', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  await page.getByRole('button', { name: 'Delete Pancakes' }).click()
  await expect(page.getByRole('row', { name: /Pancakes/ })).toHaveCount(0)
})

test('[A7] "Export CSV" downloads a file with the header "Name,Servings" and the row "Pancakes,4"', async ({
  page,
}) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  const [download]: [Download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = await download.path()
  const fs = await import('node:fs/promises')
  const csv = await fs.readFile(path, 'utf8')
  const lines = csv
    .split(/\r?\n/)
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)
  expect(lines[0]).toContain('Name,Servings')
  expect(lines.some((l: string) => l === 'Pancakes,4')).toBe(true)
})

test('[A8] with no recipes the table shows the text "No recipes yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No recipes yet')).toBeVisible()
})

test('[A9] reloading keeps the recipe "Pancakes" with servings "4" visible in the table', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  await page.reload()
  const row = recipeRow(page, 'Pancakes')
  await expect(row).toBeVisible()
  await expect(row).toContainText('4')
})
