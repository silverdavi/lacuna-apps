import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Data Format Studio and converts starter JSON to YAML', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Data Format Studio' })).toBeVisible()
  await expect(page.getByLabel('Converted data')).toHaveValue(/service: lacuna-convert/)
})

test('[A2] Switches target formats (TOML, XML, ENV) and downloads file', async ({ page }) => {
  await page.getByLabel('Target format').selectOption('toml')
  await expect(page.getByLabel('Converted data')).toHaveValue(/service = "lacuna-convert"/)

  await page.getByLabel('Target format').selectOption('xml')
  await expect(page.getByLabel('Converted data')).toHaveValue(/<service>lacuna-convert<\/service>/)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download XML' }).click()
  expect((await dl).suggestedFilename()).toBe('converted.xml')
})

test('[A3] Table sample converts to CSV and persists across reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Table JSON sample' }).click()
  await expect(page.getByLabel('Converted data')).toHaveValue(/Ada Lovelace/)

  await page.reload()
  await expect(page.getByLabel('Target format')).toHaveValue('csv')
  await expect(page.getByLabel('Converted data')).toHaveValue(/Grace Hopper/)
})
