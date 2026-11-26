import { expect, test, type Page } from '@playwright/test'

async function fillPair(page: Page, foreground: string, background: string) {
  await page.getByLabel('Foreground hex').fill(foreground)
  await page.getByLabel('Background hex').fill(background)
}

async function savePair(page: Page, foreground: string, background: string) {
  await fillPair(page, foreground, background)
  await page.getByRole('button', { name: 'Save pair' }).click()
}

test('[A1] page shows heading and empty saved pairs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Color Contrast Checker' })).toBeVisible()
  await expect(page.getByText('No pairs saved yet')).toBeVisible()
})

test('[A2] #FFFFFF on #000000 shows 21.00 at AAA', async ({ page }) => {
  await page.goto('/')
  await fillPair(page, '#FFFFFF', '#000000')
  await expect(page.getByLabel('Contrast ratio')).toHaveValue('21.00')
  await expect(page.getByLabel('WCAG level')).toHaveText('AAA')
})

test('[A3] #777777 on #FFFFFF shows 4.48 at AA', async ({ page }) => {
  await page.goto('/')
  await fillPair(page, '#777777', '#FFFFFF')
  await expect(page.getByLabel('Contrast ratio')).toHaveValue('4.48')
  await expect(page.getByLabel('WCAG level')).toHaveText('AA')
})

test('[A4] #AAAAAA on #FFFFFF shows 2.32 and fails', async ({ page }) => {
  await page.goto('/')
  await fillPair(page, '#AAAAAA', '#FFFFFF')
  await expect(page.getByLabel('Contrast ratio')).toHaveValue('2.32')
  await expect(page.getByLabel('WCAG level')).toHaveText('Fail')
})

test('[A5] saving a pair adds it to the saved pairs', async ({ page }) => {
  await page.goto('/')
  await savePair(page, '#FFFFFF', '#000000')
  const item = page.getByRole('listitem').filter({ hasText: '#FFFFFF on #000000' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('21.00')
  await expect(page.getByText('No pairs saved yet')).toHaveCount(0)
})

test('[A6] deleting a saved pair removes it', async ({ page }) => {
  await page.goto('/')
  await savePair(page, '#FFFFFF', '#000000')
  await page.getByRole('button', { name: 'Delete #FFFFFF on #000000' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: '#FFFFFF on #000000' })).toHaveCount(0)
  await expect(page.getByText('No pairs saved yet')).toBeVisible()
})

test('[A7] copying the result shows the toast', async ({ page }) => {
  await page.goto('/')
  await fillPair(page, '#FFFFFF', '#000000')
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Copied: #FFFFFF on #000000 — 21.00 (AAA)')).toBeVisible()
})

// A8: "first swatch label" is read as the first swatch in the palette list.
test('[A8] palette tab shows the generated palette', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Palette' }).click()
  await expect(page.getByRole('heading', { name: 'Generated Palette' })).toBeVisible()
  const swatch = page.getByRole('listitem').first()
  await expect(swatch).toContainText('#FFFFFF')
})

test('[A9] saved pair survives reload', async ({ page }) => {
  await page.goto('/')
  await savePair(page, '#FFFFFF', '#000000')
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: '#FFFFFF on #000000' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('21.00')
})
