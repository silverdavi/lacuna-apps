import { expect, test, type Page } from '@playwright/test'

async function calculate(page: Page) {
  await page.getByRole('button', { name: 'Calculate' }).click()
}

test('[A1] default values show the result summary with payment, total interest and loan amount', async ({ page }) => {
  await page.goto('/')
  await calculate(page)
  await expect(page.getByText('Monthly payment: $1,896.20')).toBeVisible()
  await expect(page.getByText('Total interest: $382,632.00')).toBeVisible()
  await expect(page.getByText('Loan amount: $240,000.00')).toBeVisible()
})

test('[A2] loan amount 500000 updates the summary to the new payment and loan amount', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Loan amount').fill('500000')
  await calculate(page)
  await expect(page.getByText('Monthly payment: $3,160.33')).toBeVisible()
  await expect(page.getByText('Loan amount: $440,000.00')).toBeVisible()
})

test('[A3] down payment 100000 lowers the loan amount and the monthly payment', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Down payment').fill('100000')
  await calculate(page)
  await expect(page.getByText('Loan amount: $200,000.00')).toBeVisible()
  await expect(page.getByText('Monthly payment: $1,580.17')).toBeVisible()
})

test('[A4] term 15 years raises the monthly payment and lowers the total interest', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Term').fill('15')
  await calculate(page)
  await expect(page.getByText('Monthly payment: $2,590.35')).toBeVisible()
  await expect(page.getByText('Total interest: $166,463.00')).toBeVisible()
})

test('[A5] the breakdown table shows the Year 1 principal and interest paid', async ({ page }) => {
  await page.goto('/')
  await calculate(page)
  const year1 = page.getByRole('row').filter({ hasText: 'Year 1' })
  await expect(year1).toContainText('Principal paid: $12,368.00')
  await expect(year1).toContainText('Interest paid: $15,192.00')
})

test('[A6] the breakdown table shows the final Year 30 row with a zero remaining balance', async ({ page }) => {
  await page.goto('/')
  await calculate(page)
  const year30 = page.getByRole('row').filter({ hasText: 'Year 30' })
  await expect(year30).toContainText('Remaining balance: $0.00')
})

test('[A7] loan amount 0 shows an error message and hides the result summary', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Loan amount').fill('0')
  await calculate(page)
  await expect(page.getByText('Loan amount must be greater than 0')).toBeVisible()
  await expect(page.getByText('Monthly payment: $1,896.20')).toHaveCount(0)
  await expect(page.getByText('Total interest: $382,632.00')).toHaveCount(0)
  await expect(page.getByText('Loan amount: $240,000.00')).toHaveCount(0)
})

test('[A8] the chart renders 30 annual interest points, the first labelled Year 1 with value 15192', async ({ page }) => {
  await page.goto('/')
  await calculate(page)
  const info = await page.evaluate(() => {
    const leaf = (el: Element): el is HTMLElement => el.children.length === 0
    const text = (el: Element) => (el.textContent ?? '').trim()
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(leaf)
    const yearTicks = nodes.filter((el) => /^Year \d{1,2}$/.test(text(el)))
    const chart = document.querySelector('canvas, svg')
    const value = /15[,.]?192/.test(text(document.body))
    return { ticks: yearTicks.length, hasChart: !!chart, value }
  })
  expect(info.hasChart, 'a chart is rendered').toBe(true)
  expect(info.ticks, 'one chart tick per year of the 30-year term').toBe(30)
  expect(info.value, 'the Year 1 point carries the value 15192').toBe(true)
})

test('[A9] calculated results survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Loan amount').fill('500000')
  await page.getByLabel('Down payment').fill('100000')
  await page.getByLabel('Term').fill('20')
  await calculate(page)
  await page.reload()
  await expect(page.getByText('Monthly payment: $3,683.78')).toBeVisible()
  await expect(page.getByText('Loan amount: $400,000.00')).toBeVisible()
})
