import { expect, test, type Page } from '@playwright/test'

async function generate(page: Page) {
  await page.getByRole('button', { name: 'Generate' }).click()
}

async function setChecked(page: Page, label: string, checked: boolean) {
  const box = page.getByLabel(label)
  if ((await box.isChecked()) !== checked) await box.click()
}

test('[A1] page shows heading, Length 16 and four checked character sets', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Password Generator' })).toBeVisible()
  await expect(page.getByLabel('Length')).toHaveValue('16')
  await expect(page.getByLabel('Lowercase')).toBeChecked()
  await expect(page.getByLabel('Uppercase')).toBeChecked()
  await expect(page.getByLabel('Digits')).toBeChecked()
  await expect(page.getByLabel('Symbols')).toBeChecked()
})

test('[A2] Generate puts a 16-character password in the Password field', async ({ page }) => {
  await page.goto('/')
  await generate(page)
  const field = page.getByLabel('Password')
  await expect(field).toBeReadOnly()
  await expect(field).toHaveValue(/.{16}/)
  expect((await field.inputValue()).length).toBe(16)
})

test('[A3] only Digits checked gives an 8-digit password', async ({ page }) => {
  await page.goto('/')
  await setChecked(page, 'Lowercase', false)
  await setChecked(page, 'Uppercase', false)
  await setChecked(page, 'Symbols', false)
  await page.getByLabel('Length').fill('8')
  await generate(page)
  await expect(page.getByLabel('Password')).toHaveValue(/^[0-9]{8}$/)
})

test('[A4] only letters checked gives 40 characters with at least one of each case', async ({ page }) => {
  await page.goto('/')
  await setChecked(page, 'Digits', false)
  await setChecked(page, 'Symbols', false)
  await page.getByLabel('Length').fill('40')
  await generate(page)
  const value = await page.getByLabel('Password').inputValue()
  expect(value).toMatch(/^[A-Za-z]{40}$/)
  expect(value).toMatch(/[a-z]/)
  expect(value).toMatch(/[A-Z]/)
})

test('[A5] no character set checked shows the message and an empty Password field', async ({ page }) => {
  await page.goto('/')
  await setChecked(page, 'Lowercase', false)
  await setChecked(page, 'Uppercase', false)
  await setChecked(page, 'Digits', false)
  await setChecked(page, 'Symbols', false)
  await generate(page)
  await expect(page.getByText('Choose at least one character set')).toBeVisible()
  await expect(page.getByLabel('Password')).toHaveValue('')
})

test('[A6] Length outside 4 to 64 shows the message and an empty Password field', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Length').fill('3')
  await generate(page)
  await expect(page.getByText('Length must be between 4 and 64')).toBeVisible()
  await expect(page.getByLabel('Password')).toHaveValue('')
  await page.getByLabel('Length').fill('65')
  await generate(page)
  await expect(page.getByText('Length must be between 4 and 64')).toBeVisible()
  await expect(page.getByLabel('Password')).toHaveValue('')
})

test('[A7] two Generates with Length 32 give different passwords', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Length').fill('32')
  await generate(page)
  const first = await page.getByLabel('Password').inputValue()
  await generate(page)
  const second = await page.getByLabel('Password').inputValue()
  expect(first).not.toBe(second)
})

test('[A8] digits only at Length 4 is Weak, all sets at Length 20 is Strong', async ({ page }) => {
  await page.goto('/')
  await setChecked(page, 'Lowercase', false)
  await setChecked(page, 'Uppercase', false)
  await setChecked(page, 'Symbols', false)
  await page.getByLabel('Length').fill('4')
  await generate(page)
  await expect(page.getByText('Strength: Weak')).toBeVisible()
  await setChecked(page, 'Lowercase', true)
  await setChecked(page, 'Uppercase', true)
  await setChecked(page, 'Symbols', true)
  await page.getByLabel('Length').fill('20')
  await generate(page)
  await expect(page.getByText('Strength: Strong')).toBeVisible()
})

test('[A9] Length 24 with Symbols unchecked survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Length').fill('24')
  await setChecked(page, 'Symbols', false)
  await page.reload()
  await expect(page.getByLabel('Length')).toHaveValue('24')
  await expect(page.getByLabel('Symbols')).not.toBeChecked()
  await expect(page.getByLabel('Lowercase')).toBeChecked()
  await expect(page.getByLabel('Uppercase')).toBeChecked()
  await expect(page.getByLabel('Digits')).toBeChecked()
})
