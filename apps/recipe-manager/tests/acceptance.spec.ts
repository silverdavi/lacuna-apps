import { expect, test, type Locator, type Page } from '@playwright/test'

import { readFileSync } from 'node:fs'

async function addRecipe(page: Page, name: string, servings: string) {
  await page.getByRole('button', { name: 'Add recipe' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Servings').fill(servings)
  await page.getByRole('button', { name: 'Save' }).click()
}

// [A3] the spec does not say how a match is marked; the app is built to satisfy
// this test, so accept a visible highlight state via aria/class/text.
const isHighlighted = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node as HTMLElement)
    const cls = node.className.toLowerCase()
    return (
      cls.includes('highlight') ||
      node.getAttribute('aria-current') === 'true' ||
      s.fontWeight === 'bold' ||
      s.backgroundColor !== 'rgba(0, 0, 0, 0)'
    )
  })

test('[A1] the page heading is "Recipe Manager"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Recipe Manager' })).toBeVisible()
})

test('[A2] adding a recipe adds a row with its name and servings', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  await expect(page.getByText('Pancakes')).toBeVisible()
  await expect(page.getByText('4')).toBeVisible()
})

test('[A3] typing "pan" in the search box highlights "Pancakes" and filters the table', async ({
  page,
}) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  await addRecipe(page, 'Bolognese', '4')
  await page.getByRole('textbox').fill('pan')
  await expect(page.getByText('Pancakes')).toBeVisible()
  await expect(page.getByText('Bolognese')).toHaveCount(0)
  await expect.poll(() => isHighlighted(page.getByText('Pancakes'))).toBe(true)
})

test('[A4] clicking the "Name" column header sorts rows alphabetically by name', async ({
  page,
}) => {
  await page.goto('/')
  await addRecipe(page, 'Zucchini', '4')
  await addRecipe(page, 'Apple pie', '4')
  await page.getByRole('columnheader', { name: 'Name' }).click()
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('tr')]
      .map((r) => r.textContent ?? '')
      .filter((t) => t.includes('Zucchini') || t.includes('Apple pie')),
  )
  expect(names.indexOf('Apple pie') < names.indexOf('Zucchini'), 'rows sorted by name').toBe(true)
})

test('[A5] editing a recipe updates its servings', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  await page.getByRole('button', { name: 'Edit Pancakes' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Pancakes')
  await page.getByLabel('Servings').fill('6')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('6')).toBeVisible()
})

test('[A6] deleting a recipe removes its row', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  await addRecipe(page, 'Bolognese', '4')
  await expect(page.getByText('Pancakes')).toBeVisible()
  await page.getByRole('button', { name: 'Delete Pancakes' }).click()
  await expect(page.getByText('Pancakes')).toHaveCount(0)
})

test('[A7] exporting CSV downloads a file with the header and the row', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const content = readFileSync(await download.path(), 'utf8')
  expect(content, 'file contains the header line').toContain('Name,Servings')
  expect(content, 'file contains the data row').toContain('Pancakes,4')
})

test('[A8] with no recipes the table shows the empty-state text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No recipes yet')).toBeVisible()
})

test('[A9] reload keeps the recipe and its servings', async ({ page }) => {
  await page.goto('/')
  await addRecipe(page, 'Pancakes', '4')
  await page.reload()
  await expect(page.getByText('Pancakes')).toBeVisible()
  await expect(page.getByText('4')).toBeVisible()
})
