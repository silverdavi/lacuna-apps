import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders vCard & ICS Converter and converts vCard to CSV', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'vCard & ICS Converter' })).toBeVisible()
  await expect(page.getByLabel('Converted interchange')).toHaveValue(/Ada Lovelace/)
  await expect(page.getByLabel('Converted interchange')).toHaveValue(/Grace Hopper/)
})

test('[A2] Switches to GeoJSON -> GPX, downloads .gpx, and persists mode across reload', async ({ page }) => {
  await page.getByLabel('Source type').selectOption('geo')
  await expect(page.getByLabel('Converted interchange')).toHaveValue(/<wpt lat="37\.7749"/)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download .gpx' }).click()
  expect((await dl).suggestedFilename()).toBe('converted.gpx')

  await page.reload()
  await expect(page.getByLabel('Source type')).toHaveValue('geo')
})
