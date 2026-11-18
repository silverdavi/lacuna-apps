// Acceptance tests for unit-convert, one per check A1..A8 in the spec.
import { expect, test } from '@playwright/test'

const length = { from: 'Meters', to: 'Feet' }

function sourceUnit(page: import('@playwright/test').Page, name: string) {
  return page.getByLabel(new RegExp(`^${name}$`, 'i'))
}

test('[A1] Length: typing 1 in Meters shows 3.28084 in Feet', async ({ page }) => {
  await page.goto('/')
  await sourceUnit(page, length.from).fill('1')
  await expect(sourceUnit(page, length.to)).toHaveValue('3.28084')
})

test('[A2] typing in the second field updates the first (two-way)', async ({ page }) => {
  await page.goto('/')
  await sourceUnit(page, length.to).fill('3.28084')
  await expect(sourceUnit(page, length.from)).toHaveValue('1')
})

test('[A3] Temperature: 100 Celsius shows 212 Fahrenheit; -40 Celsius shows -40 Fahrenheit', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /temperature/i }).click()
  await page.getByLabel(/celsius/i).fill('100')
  await expect(page.getByLabel(/fahrenheit/i)).toHaveValue('212')
  await page.getByLabel(/celsius/i).fill('-40')
  await expect(page.getByLabel(/fahrenheit/i)).toHaveValue('-40')
})

test("[A4] switching category resets units to that category's defaults and clears the fields", async ({
  page,
}) => {
  await page.goto('/')
  // Establish a value in the default (length) category first.
  await sourceUnit(page, length.from).fill('5')
  await expect(sourceUnit(page, length.to)).not.toHaveValue('')
  await page.getByRole('button', { name: /mass/i }).click()
  // Mass defaults (Kilograms and Pounds) are now the only unit labels shown,
  // and neither field carries the old length value.
  const fields = page.getByRole('textbox').or(page.getByRole('spinbutton'))
  expect(await fields.count()).toBeGreaterThan(0)
  for (const field of await fields.all()) {
    await expect(field).toHaveValue('')
  }
  // The fields are now labelled with Mass defaults, not length units.
  await expect(sourceUnit(page, 'Kilograms')).toHaveValue('')
  await expect(sourceUnit(page, 'Pounds')).toHaveValue('')
  await expect(sourceUnit(page, 'Meters')).toHaveCount(0)
  await expect(sourceUnit(page, 'Feet')).toHaveCount(0)
})

test('[A5] the swap button exchanges the two units and keeps the value', async ({ page }) => {
  await page.goto('/')
  await sourceUnit(page, length.from).fill('5')
  const converted = (await sourceUnit(page, length.to).inputValue()) ?? ''
  expect(converted).not.toBe('')
  await page.getByRole('button', { name: /swap/i }).click()
  // One field is now labelled Feet and one Meters (exchanged). The entered
  // value of 5 follows its unit (now Feet), and the other field keeps the
  // value it held, so the same quantity is expressed in the swapped pair.
  await expect(sourceUnit(page, length.to)).toHaveValue('5')
  await expect(sourceUnit(page, length.from)).toHaveValue(converted)
})

test('[A6] non-numeric input shows an inline message and no NaN anywhere', async ({ page }) => {
  await page.goto('/')
  await sourceUnit(page, length.from).fill('abc')
  await expect(page.getByText(/NaN/i)).toHaveCount(0)
  const message = page.getByRole('alert').or(page.getByText(/(enter|input|type) (a |a valid |a valid numeric )?(number|value)/i)).or(page.getByText(/(invalid|not a) (number|value)/i))
  await expect(message.first()).toBeVisible()
})

test('[A7] conversions land in Recent (newest first, at most 10) and clicking one restores it', async ({
  page,
}) => {
  await page.goto('/')
  const items = () => page.getByRole('list').getByRole('listitem')
  for (let i = 1; i <= 11; i++) {
    await sourceUnit(page, length.from).fill(String(i))
    await expect(sourceUnit(page, length.to)).not.toHaveValue('')
    await page.keyboard.press('Enter')
    expect(await items().count(), `recent list after conversion ${i}`).toBe(Math.min(i, 10))
    await expect(items().first()).toContainText(String(i))
  }
  // Click a recorded conversion to restore it. The list is newest-first, so
  // with 1..10 held the second item is the 9 conversion.
  await items().nth(1).click()
  await expect(sourceUnit(page, length.from)).toHaveValue('9')
  await expect(sourceUnit(page, length.to)).not.toHaveValue('')
})

test('[A8] reload keeps the Recent list', async ({ page }) => {
  await page.goto('/')
  await sourceUnit(page, length.from).fill('7')
  await expect(sourceUnit(page, length.to)).not.toHaveValue('')
  await page.keyboard.press('Enter')
  const items = page.getByRole('list').getByRole('listitem')
  expect(await items.count()).toBe(1)
  await expect(items.first()).toContainText('7')
  await page.reload()
  await expect(items.first()).toContainText('7')
})
