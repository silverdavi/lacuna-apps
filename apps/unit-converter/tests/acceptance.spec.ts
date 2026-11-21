import { expect, test, type Page } from '@playwright/test'

const category = (page: Page) => page.getByLabel('Category')
const fromUnit = (page: Page) => page.getByLabel('From unit')
const toUnit = (page: Page) => page.getByLabel('To unit')
const fromValue = (page: Page) => page.getByLabel('From value')
const toValue = (page: Page) => page.getByLabel('To value')
const recentList = (page: Page) => page.getByRole('list', { name: 'Recent' })

test('[A1] typing 1 in From value shows 3.28084 in To value', async ({ page }) => {
  await page.goto('/')
  await fromValue(page).fill('1')
  await expect(toValue(page)).toHaveValue('3.28084')
})

test('[A2] typing 1 in To value shows 0.3048 in From value', async ({ page }) => {
  await page.goto('/')
  await toValue(page).fill('1')
  await expect(fromValue(page)).toHaveValue('0.3048')
})

test('[A3] Temperature: 100 Celsius is 212, -40 Celsius is -40 Fahrenheit', async ({ page }) => {
  await page.goto('/')
  await category(page).selectOption('Temperature')
  await fromValue(page).fill('100')
  await expect(toValue(page)).toHaveValue('212')
  await fromValue(page).fill('-40')
  await expect(toValue(page)).toHaveValue('-40')
})

test('[A4] switching to Mass resets units and values, then converts', async ({ page }) => {
  await page.goto('/')
  await fromValue(page).fill('1')
  await category(page).selectOption('Mass')
  await expect(fromUnit(page)).toHaveValue('Kilograms')
  await expect(toUnit(page)).toHaveValue('Pounds')
  await expect(fromValue(page)).toHaveValue('')
  await expect(toValue(page)).toHaveValue('')
  await fromValue(page).fill('1')
  await expect(toValue(page)).toHaveValue('2.20462')
})

test('[A5] Swap exchanges units and reconverts, keeping the From value', async ({ page }) => {
  await page.goto('/')
  await fromValue(page).fill('1')
  await page.getByRole('button', { name: 'Swap' }).click()
  await expect(fromUnit(page)).toHaveValue('Feet')
  await expect(toUnit(page)).toHaveValue('Meters')
  await expect(fromValue(page)).toHaveValue('1')
  await expect(toValue(page)).toHaveValue('0.3048')
})

test('[A6] non-numeric input shows an error and no NaN', async ({ page }) => {
  await page.goto('/')
  await fromValue(page).fill('abc')
  await expect(page.getByText('Enter a number.')).toBeVisible()
  await expect(toValue(page)).toHaveValue('')
  const rootText = await page.locator('#root').innerText()
  expect(rootText).not.toContain('NaN')
})

test('[A7] Save adds Recent entries, newest first', async ({ page }) => {
  await page.goto('/')
  await fromValue(page).fill('1')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: '1 Meters = 3.28084 Feet' })).toBeVisible()

  await fromValue(page).fill('2')
  await page.getByRole('button', { name: 'Save' }).click()
  const entries = recentList(page).getByRole('listitem')
  await expect(entries).toHaveCount(2)
  await expect(entries.nth(0)).toContainText('2 Meters = 6.56168 Feet')
  await expect(entries.nth(1)).toContainText('1 Meters = 3.28084 Feet')
})

test('[A8] Recent keeps only the 10 newest entries', async ({ page }) => {
  await page.goto('/')
  for (let i = 1; i <= 11; i++) {
    await fromValue(page).fill(String(i))
    await page.getByRole('button', { name: 'Save' }).click()
  }
  const entries = recentList(page).getByRole('listitem')
  await expect(entries).toHaveCount(10)
  const texts = []
  for (let i = 0; i < 10; i++) texts.push(await entries.nth(i).innerText())
  expect(texts[0]).toContain('11 Meters = 36.08924 Feet')
  expect(texts[9]).toContain('2 Meters = 6.56168 Feet')
  expect(texts.some((t) => t.trim() === '1 Meters = 3.28084 Feet')).toBe(false)
})

test('[A9] clicking a Recent entry restores the conversion', async ({ page }) => {
  await page.goto('/')
  await fromValue(page).fill('11')
  await page.getByRole('button', { name: 'Save' }).click()
  await fromValue(page).fill('7')
  await page.getByRole('button', { name: '11 Meters = 36.08924 Feet' }).click()
  await expect(fromValue(page)).toHaveValue('11')
  await expect(toValue(page)).toHaveValue('36.08924')
  await expect(category(page)).toHaveValue('Length')
  await expect(fromUnit(page)).toHaveValue('Meters')
  await expect(toUnit(page)).toHaveValue('Feet')
})

test('[A10] the Recent list survives a reload', async ({ page }) => {
  await page.goto('/')
  await fromValue(page).fill('1')
  await page.getByRole('button', { name: 'Save' }).click()
  await fromValue(page).fill('2')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()
  const entries = recentList(page).getByRole('listitem')
  await expect(entries).toHaveCount(2)
  await expect(entries.nth(0)).toContainText('2 Meters = 6.56168 Feet')
  await expect(entries.nth(1)).toContainText('1 Meters = 3.28084 Feet')
})
