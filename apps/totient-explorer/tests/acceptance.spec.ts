import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] first load analyzes 561', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Totient explorer' })).toBeVisible()
  await expect(page.getByText('3 x 11 x 17', { exact: true })).toBeVisible()
  await expect(page.getByText('320', { exact: true }).first()).toBeVisible()
})

test('[A2] example 85 is radimichael with k = 3', async ({ page }) => {
  await page.getByRole('button', { name: '85', exact: true }).click()
  await expect(page.getByText('phi(n) first divides (n-1)^k at k = 3.')).toBeVisible()
})

test('[A3] states for small, large and empty input', async ({ page }) => {
  const box = page.getByLabel('Whole number')
  await box.fill('1')
  await expect(page.getByText('n must be at least 2.', { exact: false })).toBeVisible()
  await box.fill('9'.repeat(25))
  await expect(page.getByText('too large', { exact: false })).toBeVisible()
  await box.fill('')
  await expect(page.getByText('Type a whole number', { exact: false })).toBeVisible()
})

test('[A4] 16 Carmichael numbers below 100,000', async ({ page }) => {
  await page.getByRole('button', { name: 'Carmichael', exact: true }).click()
  await expect(page.getByText('16 Carmichael numbers up to 100,000.')).toBeVisible()
})

test('[A5] settings survive reload', async ({ page }) => {
  await page.getByRole('button', { name: 'About', exact: true }).click()
  await page.reload()
  await expect(page.getByText('Open: no composite Lehmer number is known.')).toBeVisible()
})
