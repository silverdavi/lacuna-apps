import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders PDF Converter and builds downloadable PDF', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'PDF Converter' })).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  expect((await dl).suggestedFilename()).toBe('architecture-brief.pdf')
})

test('[A2] Inspects built PDF and extracts text to Markdown', async ({ page }) => {
  await page.getByLabel('Document title').fill('Release Notes')
  await page.getByRole('button', { name: 'Inspect built PDF' }).click()
  await expect(page.getByLabel('Extracted text')).toHaveValue(/Release Notes/)

  const mdDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Markdown' }).click()
  expect((await mdDl).suggestedFilename()).toBe('Release Notes.md')

  await page.reload()
  await expect(page.getByLabel('Document title')).toHaveValue('Release Notes')
})
