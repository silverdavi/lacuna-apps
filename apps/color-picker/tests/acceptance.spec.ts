import { test, expect } from '@playwright/test'

test('[A1] hex to rgb and hsl', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Hex').fill('#FF5733')
  await expect(page.getByLabel('R')).toHaveValue('255')
  await expect(page.getByLabel('G')).toHaveValue('87')
  await expect(page.getByLabel('B')).toHaveValue('51')
  await expect(page.getByLabel('H')).toHaveValue('11')
  await expect(page.getByLabel('S')).toHaveValue('100')
  await expect(page.getByLabel('L')).toHaveValue('60')
})

test('[A2] contrast ratios', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Hex').fill('#FF5733')
  await expect(page.getByText('Contrast on White: 3.15', { exact: true })).toBeVisible()
  await expect(page.getByText('Contrast on Black: 6.66', { exact: true })).toBeVisible()
})

test('[A3] rgb to hex', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('R').fill('128')
  await page.getByLabel('G').fill('64')
  await page.getByLabel('B').fill('32')
  await expect(page.getByLabel('Hex')).toHaveValue('#804020')
})

test('[A4] generate palette', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Hex').fill('#FF5733')
  await page.getByRole('button', { name: 'Generate Palette', exact: true }).click()
  const swatches = page.getByRole('list', { name: 'Palette' }).getByRole('listitem')
  await expect(swatches).toHaveCount(5)
  const expected = ['#FF5733', '#B1FF33', '#33FFAA', '#335FFF', '#FC33FF']
  for (let i = 0; i < expected.length; i++) {
    await expect(swatches.nth(i)).toHaveText(new RegExp(expected[i]))
  }
})

test('[A5] copy hex', async ({ page }) => {
  await page.goto('/')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByLabel('Hex').fill('#FF5733')
  await page.getByRole('button', { name: 'Copy Hex', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copied!', exact: true })).toBeVisible()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('#FF5733')
})

test('[A6] hsl to hex', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Hex').fill('#FF5733')
  await page.getByLabel('H').fill('200')
  await expect(page.getByLabel('Hex')).toHaveValue('#33BBFF')
})

test('[A7] remove swatch', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Hex').fill('#FF5733')
  await page.getByRole('button', { name: 'Generate Palette', exact: true }).click()
  const swatches = page.getByRole('list', { name: 'Palette' }).getByRole('listitem')
  await expect(swatches).toHaveCount(5)
  await page.getByRole('button', { name: 'Remove #B1FF33', exact: true }).click()
  await expect(swatches).toHaveCount(4)
  await expect(page.getByRole('listitem', { name: '#B1FF33', exact: true })).toHaveCount(0)
})

test('[A8] invalid hex', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Hex').fill('#zzz')
  await expect(page.getByText('Invalid hex', { exact: true })).toBeVisible()
  await expect(page.getByLabel('R')).toHaveValue('0')
})

test('[A9] reload persists color and palette', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Hex').fill('#123456')
  await page.getByRole('button', { name: 'Generate Palette', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('Hex')).toHaveValue('#123456')
  const first = page.getByRole('list', { name: 'Palette' }).getByRole('listitem').first()
  await expect(first).toHaveText(/#123456/)
})
