import { expect, test } from '@playwright/test'

async function fillFraction(
  page: import('@playwright/test').Page,
  op: string,
  n1: string,
  d1: string,
  n2: string,
  d2: string,
) {
  await page.getByLabel('Operator').selectOption({ label: op })
  await page.getByLabel('Numerator 1').fill(n1)
  await page.getByLabel('Denominator 1').fill(d1)
  await page.getByLabel('Numerator 2').fill(n2)
  await page.getByLabel('Denominator 2').fill(d2)
}

test('[A1] page heading is "Fraction Calculator"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Fraction Calculator' })).toBeVisible()
})

test('[A2] 1/2 + 1/3 shows 5/6 in Result', async ({ page }) => {
  await page.goto('/')
  await fillFraction(page, '+', '1', '2', '1', '3')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByLabel('Result')).toContainText('5/6')
})

test('[A3] after 1/2 + 1/3, Decimal shows 0.8333', async ({ page }) => {
  await page.goto('/')
  await fillFraction(page, '+', '1', '2', '1', '3')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByLabel('Decimal')).toContainText('0.8333')
})

test('[A4] 2/3 × 3/4 shows 1/2 in Result', async ({ page }) => {
  await page.goto('/')
  await fillFraction(page, '×', '2', '3', '3', '4')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByLabel('Result')).toContainText('1/2')
})

test('[A5] 1/2 ÷ 1/4 shows 2/1 in Result', async ({ page }) => {
  await page.goto('/')
  await fillFraction(page, '÷', '1', '2', '1', '4')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByLabel('Result')).toContainText('2/1')
})

test('[A6] Save adds history item containing "1/2 + 1/3 = 5/6"', async ({ page }) => {
  await page.goto('/')
  await fillFraction(page, '+', '1', '2', '1', '3')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: '1/2 + 1/3 = 5/6' })).toBeVisible()
})

test('[A7] Breakdown tab shows table row "Common denominator: 6"', async ({ page }) => {
  await page.goto('/')
  await fillFraction(page, '+', '1', '2', '1', '3')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await page.getByRole('tab', { name: 'Breakdown' }).click()
  await expect(
    page.getByRole('row').filter({ hasText: 'Common denominator: 6' }),
  ).toBeVisible()
})

test('[A8] Copy result shows toast "Result copied"', async ({ page }) => {
  await page.goto('/')
  await fillFraction(page, '+', '1', '2', '1', '3')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Result copied')).toBeVisible()
})

test('[A9] reload keeps history item "1/2 + 1/3 = 5/6"', async ({ page }) => {
  await page.goto('/')
  await fillFraction(page, '+', '1', '2', '1', '3')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: '1/2 + 1/3 = 5/6' })).toBeVisible()
})
