// Feature tests for the mortgage calculator beyond the locked acceptance checks.
import { expect, test } from '@playwright/test'

test('summary reflects a zero-interest loan exactly', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Home price').fill('300000')
  await page.getByLabel('Down payment').fill('69600')
  await page.getByLabel('Interest rate').fill('0')
  await page.getByLabel('Term').fill('10')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('$1,920.00').first()).toBeVisible() // 230400 / 120
  await expect(page.getByText('Total interest')).toBeVisible()
  await expect(page.getByText('$0.00').first()).toBeVisible()
})

test('a saved scenario can be deleted and the list empties', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Save scenario' }).click()
  await expect(page.getByLabel('Saved scenarios').getByText('$1,516.96').first()).toBeVisible()
  await page.getByRole('button', { name: /Delete/ }).click()
  await expect(page.getByText('No saved scenarios yet')).toBeVisible()
})

test('term longer than 50 is rejected with an error', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Term').fill('55')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Term must be a whole number of years between 1 and 50')).toBeVisible()
  await expect(page.getByText('Loan amount')).toBeHidden()
})

test('year-by-year card lists the payoff table', async ({ page }) => {
  await page.goto('/')
  const table = page.getByLabel('Year-by-year payoff')
  await expect(table).toBeVisible()
  await expect(table.getByText('1').first()).toBeVisible()
  await expect(table.getByText('$0.00').last()).toBeVisible()
})
