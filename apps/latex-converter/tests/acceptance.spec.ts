import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders LaTeX Converter and converts BibTeX to CSL-JSON and RIS', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'LaTeX Converter' })).toBeVisible()
  await expect(page.getByLabel('Converted LaTeX')).toHaveValue(/"id": "shannon1948"/)

  await page.getByLabel('Target format').selectOption('ris')
  await expect(page.getByLabel('Converted LaTeX')).toHaveValue(/TI  - The TeXbook/)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download .ris' }).click()
  expect((await dl).suggestedFilename()).toBe('converted.ris')
})

test('[A2] Switches to LaTeX Math mode and converts to Unicode and SVG', async ({ page }) => {
  await page.getByLabel('Converter mode').selectOption('math')
  await expect(page.getByLabel('Converted LaTeX')).toHaveValue(/∫/)
  await expect(page.getByLabel('Converted LaTeX')).toHaveValue(/∞/)
})
