import { expect, test, type Page } from '@playwright/test'

async function setHex(page: Page, hex: string) {
  await page.getByLabel('Hex').fill(hex)
}

test('[A1] typing a hex value updates the R, G and B fields', async ({ page }) => {
  await page.goto('/')
  await setHex(page, '#FF5733')
  await expect(page.getByLabel('R')).toHaveValue('255')
  await expect(page.getByLabel('G')).toHaveValue('87')
  await expect(page.getByLabel('B')).toHaveValue('51')
})

test('[A2] #FF5733 shows contrast ratios 3.02 on white and 10.45 on black', async ({ page }) => {
  await page.goto('/')
  await setHex(page, '#FF5733')
  await expect(page.getByLabel('Contrast on White')).toHaveValue('3.02')
  await expect(page.getByLabel('Contrast on Black')).toHaveValue('10.45')
})

test('[A3] typing R, G and B values updates the hex field', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('R').fill('128')
  await page.getByLabel('G').fill('64')
  await page.getByLabel('B').fill('32')
  await expect(page.getByLabel('Hex')).toHaveValue('#804020')
})

test('[A4] Generate Palette adds five swatches, the first matching the current color', async ({ page }) => {
  await page.goto('/')
  await setHex(page, '#FF5733')
  const before = await page.getByRole('button', { name: 'Remove' }).count()
  await page.getByRole('button', { name: 'Generate Palette' }).click()
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(before + 5)
  // A swatch is a Remove button next to the hex value it holds.
  await expect(
    page.getByRole('button', { name: 'Remove' }).first().locator('..').getByText('#FF5733'),
  ).toBeVisible()
})

test('[A5] Copy Hex shows "Copied!" for 2 seconds and copies the hex to the clipboard', async ({ page }) => {
  await page.goto('/')
  await setHex(page, '#FF5733')
  await page.getByRole('button', { name: 'Copy Hex' }).click()
  const copied = page.getByRole('button', { name: 'Copied!' })
  await expect(copied).toBeVisible()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('#FF5733')
  // The spec's "for 2 seconds" means the button reverts after 2 seconds.
  await copied.waitFor({ state: 'detached', timeout: 5000 })
  await expect(page.getByRole('button', { name: 'Copy Hex' })).toBeVisible()
})

test('[A6] typing H and S values updates the hex field', async ({ page }) => {
  await page.goto('/')
  await setHex(page, '#FF5733')
  await page.getByLabel('H').fill('50')
  await page.getByLabel('S').fill('100')
  await expect(page.getByLabel('Hex')).toHaveValue('#FF0000')
})

test('[A7] Remove on the second swatch removes it and one fewer swatch remains', async ({ page }) => {
  await page.goto('/')
  await setHex(page, '#FF5733')
  await page.getByRole('button', { name: 'Generate Palette' }).click()
  const before = await page.getByRole('button', { name: 'Remove' }).count()
  expect(before).toBe(5)
  await page.getByRole('button', { name: 'Remove' }).nth(1).click()
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(before - 1)
})

// A8: L=10 keeps H=25 and C=0.15, giving #0A0503.
test('[A8] typing L=10 in the OKLCH section darkens the color to #0A0503', async ({ page }) => {
  await page.goto('/')
  await setHex(page, '#FF5733')
  await page.getByLabel('L').fill('10')
  await expect(page.getByLabel('Hex')).toHaveValue('#0A0503')
})

test('[A9] the current color survives a reload', async ({ page }) => {
  await page.goto('/')
  await setHex(page, '#123456')
  await page.reload()
  await expect(page.getByLabel('Hex')).toHaveValue('#123456')
})
