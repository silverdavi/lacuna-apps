import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Sprite Sheet Packer and packs sample tiles into PNG + JSON atlas', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Sprite Sheet Packer' })).toBeVisible()
  await page.getByRole('button', { name: 'Load sample tiles' }).first().click()
  await page.getByRole('button', { name: 'Pack sprite sheet' }).click()

  await expect(page.getByAltText('Packed sprite sheet')).toBeVisible()
  await expect(page.getByLabel('Atlas metadata')).toHaveValue(/"shield":/)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  expect((await dl).suggestedFilename()).toBe('spritesheet.png')
})
