import { expect, test } from '@playwright/test'

async function open(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

test('[A1] "x^2 + y^2 = r^2" shows "x² + y² = r²" in the preview', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox').fill('x^2 + y^2 = r^2')
  expect(await page.locator('body').innerText()).toContain('x² + y² = r²')
})

test('[A2] "Clear" removes all text from both input and preview', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox').fill('x^2 + y^2 = r^2')
  await page.getByRole('button', { name: 'Clear' }).click()
  expect(await page.getByRole('textbox').inputValue()).toBe('')
  expect(await page.locator('body').innerText()).not.toContain('x² + y² = r²')
})

test('[A3] "a \\cdot b" shows "a · b" in the preview', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox').fill('a \\cdot b')
  expect(await page.locator('body').innerText()).toContain('a · b')
})

test('[A4] "f(x) = \\frac{d}{dx}x^2" shows "f(x) = d/dx x²" in the preview', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox').fill('f(x) = \\frac{d}{dx}x^2')
  expect(await page.locator('body').innerText()).toContain('f(x) = d/dx x²')
})

test('[A5] "E = mc^2" shows "E = mc²" in the preview', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox').fill('E = mc^2')
  expect(await page.locator('body').innerText()).toContain('E = mc²')
})

test('[A6] "x \\in \\mathbb{R}" shows "x ∈ ℝ" in the preview', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox').fill('x \\in \\mathbb{R}')
  expect(await page.locator('body').innerText()).toContain('x ∈ ℝ')
})

test('[A7] "a_n + a_{n+1}" shows "aₙ + aₙ₊₁" in the preview', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox').fill('a_n + a_{n+1}')
  expect(await page.locator('body').innerText()).toContain('aₙ + aₙ₊₁')
})

test('[A8] "x \\to 0" shows "x → 0" in the preview', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox').fill('x \\to 0')
  expect(await page.locator('body').innerText()).toContain('x → 0')
})

test('[A9] reload keeps "x^2 + y^2 = r^2" in the input and "x² + y² = r²" in the preview', async ({ page }) => {
  await open(page)
  await page.getByRole('textbox').fill('x^2 + y^2 = r^2')
  await page.reload()
  await page.waitForLoadState('networkidle')
  expect(await page.getByRole('textbox').inputValue()).toBe('x^2 + y^2 = r^2')
  expect(await page.locator('body').innerText()).toContain('x² + y² = r²')
})
