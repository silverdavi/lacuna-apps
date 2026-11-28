import { expect, test } from '@playwright/test'

// The clock is fixed to 27 November 2026 (17 Kislev 5787) so the checks are repeatable.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-27T12:00:00') })
  await page.goto('/')
})

test('[A1] Today shows the Hebrew and Gregorian date and the next holidays', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Hebrew Calendar' })).toBeVisible()
  await expect(page.getByText('17 Kislev 5787', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Friday, 27 November 2026')).toBeVisible()
  await expect(page.getByRole('cell', { name: /Hanukkah, day 1/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: '8 days' })).toBeVisible()
})

test('[A2] Gregorian to Hebrew, with After sunset', async ({ page }) => {
  await page.getByRole('tab', { name: 'Convert' }).click()
  const out = page.getByRole('status', { name: 'Hebrew date result' })
  await expect(out).toContainText('17 Kislev 5787')
  await page.getByLabel('After sunset').check()
  await expect(out).toContainText('18 Kislev 5787')
})

test('[A3] Hebrew to Gregorian and an invalid day', async ({ page }) => {
  await page.getByRole('tab', { name: 'Convert' }).click()
  const out = page.getByRole('status', { name: 'Gregorian date result' })
  await page.getByLabel('Hebrew year').fill('5787')
  await page.getByRole('combobox', { name: 'Month' }).selectOption({ label: 'Tishrei' })
  await page.getByRole('spinbutton', { name: /^Day/ }).fill('1')
  await expect(out).toContainText('Saturday, 12 September 2026')
  await page.getByRole('combobox', { name: 'Month' }).selectOption({ label: 'Tevet' })
  await page.getByRole('spinbutton', { name: /^Day/ }).fill('30')
  await expect(out.getByRole('alert')).toContainText('Tevet 5787 has 29 days')
  await page.getByLabel('Hebrew year').fill('6001')
  await expect(out.getByRole('alert')).toContainText('outside the supported range')
})

test('[A4] Adar I and Adar II are listed only in leap years', async ({ page }) => {
  await page.getByRole('tab', { name: 'Convert' }).click()
  const month = page.getByRole('combobox', { name: 'Month' })
  await expect(month.locator('option', { hasText: 'Adar II' })).toHaveCount(1)
  await page.getByLabel('Hebrew year').fill('5786')
  await expect(month.locator('option', { hasText: 'Adar II' })).toHaveCount(0)
})

test('[A5] Calendar month shows Hanukkah and moves to the next month', async ({ page }) => {
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await expect(page.getByRole('grid', { name: 'Kislev 5787 calendar' })).toBeVisible()
  await expect(page.getByRole('gridcell', { name: /Hanukkah 1/ })).toBeVisible()
  await page.getByRole('button', { name: 'Next month' }).click()
  await expect(page.getByRole('grid', { name: 'Tevet 5787 calendar' })).toBeVisible()
  await page.locator('section').getByRole('button', { name: 'Today', exact: true }).click()
  await page.getByRole('button', { name: 'Gregorian month' }).click()
  await expect(page.getByRole('grid', { name: 'November 2026 calendar' })).toBeVisible()
})

test('[A6] Anniversaries list seeds, add and delete', async ({ page }) => {
  await page.getByRole('tab', { name: 'Anniversaries' }).click()
  await expect(page.getByText('Sample yahrzeit')).toBeVisible()
  await page.getByLabel('Label').fill('Test birthday')
  await page.getByRole('button', { name: 'Add anniversary' }).click()
  await expect(page.getByText('Test birthday')).toBeVisible()
  await page.getByRole('button', { name: 'Delete Test birthday' }).click()
  await expect(page.getByText('Test birthday')).toHaveCount(0)
})

test('[A7] Year facts for 5787', async ({ page }) => {
  await page.getByRole('tab', { name: 'Year' }).click()
  await expect(page.getByText('Rosh Hashana falls on Saturday, 12 September 2026')).toBeVisible()
  await expect(page.getByText('Leap', { exact: true })).toBeVisible()
})

test('[A8] Israel and Diaspora toggle, last tab and settings persist', async ({ page }) => {
  await page.getByRole('tab', { name: 'Year' }).click()
  await expect(page.getByRole('cell', { name: /^Simchat Torah/ })).toBeVisible()
  await page.getByRole('button', { name: 'Israel', exact: true }).click()
  await expect(page.getByRole('cell', { name: /^Simchat Torah/ })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('cell', { name: /Shemini Atzeret and Simchat Torah/ })).toBeVisible()
})
