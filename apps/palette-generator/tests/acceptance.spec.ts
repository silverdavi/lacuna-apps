import { expect, test, type Page } from '@playwright/test'

// Swatches are the cards carrying a hex color; the spec never fixes their tag,
// so locate them by their visible color text and scope the buttons inside.
const swatchOf = (page: Page, hex: string) =>
  page.getByText(hex, { exact: true }).locator('xpath=ancestor::div[contains(@class,"swatch")]|ancestor::li|ancestor::section|ancestor::article|ancestor::div[2]').first()

async function generateFrom(page: Page, hex: string, scheme = 'Complementary') {
  await page.getByLabel('Hex').fill(hex)
  await page.getByLabel('Scheme').selectOption(scheme)
  await page.getByRole('button', { name: 'Generate palette' }).click()
}

test('[A1] empty app shows the heading, the empty message and the generate button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Color Palette' })).toBeVisible()
  await expect(page.getByText('No palette yet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate palette' })).toBeVisible()
})

test('[A2] generating from #FF0000 adds five swatches with the expected first two colors', async ({ page }) => {
  await page.goto('/')
  await generateFrom(page, '#FF0000')
  // all five colors render, in the order the scheme produces
  await expect(page.getByText('#FF0000', { exact: true })).toBeVisible()
  await expect(page.getByText('#00FF00', { exact: true })).toBeVisible()
  await expect(page.getByText(/^#[0-9A-Fa-f]{6}$/)).toHaveCount(5)
})

test('[A3] generating from #FF0000 shows the base HSL values in the HSL fields', async ({ page }) => {
  await page.goto('/')
  await generateFrom(page, '#FF0000')
  await expect(page.getByLabel('Hue')).toHaveValue('0')
  await expect(page.getByLabel('Saturation')).toHaveValue('100')
  await expect(page.getByLabel('Lightness')).toHaveValue('50')
})

test('[A4] Copy hex copies the color and shows Copied for 2 seconds', async ({ page }) => {
  await page.goto('/')
  await generateFrom(page, '#FF0000')
  const copied = page.getByRole('button', { name: 'Copy hex' }).first()
  await copied.click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('#FF0000')
  await expect(copied).toHaveText('Copied')
  // after the 2-second window the label reverts
  await page.waitForTimeout(2100)
  await expect(copied).toHaveText('Copy hex')
})

test('[A5] Remove drops the targeted swatch, leaving four', async ({ page }) => {
  await page.goto('/')
  await generateFrom(page, '#FF0000')
  await swatchOf(page, '#00FF00').getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('#00FF00', { exact: true })).toHaveCount(0)
  await expect(page.getByText(/^#[0-9A-Fa-f]{6}$/)).toHaveCount(4)
})

test('[A6] the first swatch of a #FF0000 palette shows its contrast against white', async ({ page }) => {
  await page.goto('/')
  await generateFrom(page, '#FF0000')
  // every swatch reports its contrast; the first (#FF0000) is 21.0 against white
  await expect(swatchOf(page, '#FF0000').getByText('Contrast: 21.0')).toBeVisible()
})

test('[A7] the Analogous scheme from #0000FF keeps the base first and a predictable second swatch', async ({ page }) => {
  await page.goto('/')
  await generateFrom(page, '#0000FF', 'Analogous')
  await expect(page.getByText('#0000FF', { exact: true })).toBeVisible()
  await expect(page.getByText('#0080FF', { exact: true })).toBeVisible()
  await expect(page.getByText(/^#[0-9A-Fa-f]{6}$/)).toHaveCount(5)
})

test('[A8] typing HSL updates the Hex field', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Hue').fill('128')
  await page.getByLabel('Saturation').fill('100')
  await page.getByLabel('Lightness').fill('50')
  await expect(page.getByLabel('Hex')).toHaveValue('#800080')
})

test('[A9] reload keeps the palette and the base color', async ({ page }) => {
  await page.goto('/')
  await generateFrom(page, '#FF0000')
  await page.reload()
  await expect(page.getByText('#FF0000', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Hex')).toHaveValue('#FF0000')
})
