// Acceptance tests for the tip-split app, derived from the spec's checks A1-A9.
// Expected values are copied verbatim from the spec.
import { expect, test, type Page } from '@playwright/test'

async function setTipSplit(page: Page, bill: string, tipPercent: string, people: string) {
  await page.getByLabel('Bill').fill(bill)
  await page.getByLabel('Tip Percent').selectOption(tipPercent)
  await page.getByLabel('People').fill(people)
}

test('[A1] typing 50 in the Bill field shows 50.00 in the Total field', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill').fill('50')
  await expect(page.getByLabel('Total')).toHaveValue('50.00')
})

test('[A2] selecting 15% in the Tip Percent dropdown shows 7.50 in the Tip field', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill').fill('50')
  await page.getByLabel('Tip Percent').selectOption('15')
  await expect(page.getByLabel('Tip')).toHaveValue('7.50')
})

test('[A3] entering 3 in the People field shows 18.75 in the Each Pays field', async ({ page }) => {
  await page.goto('/')
  await setTipSplit(page, '50', '15', '3')
  await expect(page.getByLabel('Each Pays')).toHaveValue('18.75')
})

test('[A4] entering 0 in the Bill field shows 0.00 in the Total field', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill').fill('0')
  await expect(page.getByLabel('Total')).toHaveValue('0.00')
})

test('[A5] 100 bill, 10% tip, 2 people shows 55.00 in Each Pays', async ({ page }) => {
  await page.goto('/')
  await setTipSplit(page, '100', '10', '2')
  await expect(page.getByLabel('Each Pays')).toHaveValue('55.00')
})

test('[A6] 20 bill, 0% tip, 4 people shows 5.00 in Each Pays', async ({ page }) => {
  await page.goto('/')
  await setTipSplit(page, '20', '0', '4')
  await expect(page.getByLabel('Each Pays')).toHaveValue('5.00')
})

test('[A7] 100 bill, 20% tip, 5 people shows 24.00 in Each Pays', async ({ page }) => {
  await page.goto('/')
  await setTipSplit(page, '100', '20', '5')
  await expect(page.getByLabel('Each Pays')).toHaveValue('24.00')
})

test('[A8] 75 bill, 10% tip, 3 people shows 27.50 in Each Pays', async ({ page }) => {
  await page.goto('/')
  await setTipSplit(page, '75', '10', '3')
  await expect(page.getByLabel('Each Pays')).toHaveValue('27.50')
})

test('[A9] a reload keeps the values entered in Bill, Tip Percent, and People', async ({ page }) => {
  await page.goto('/')
  await setTipSplit(page, '50', '15', '3')
  await page.reload()
  await expect(page.getByLabel('Bill')).toHaveValue('50')
  await expect(page.getByLabel('Tip Percent')).toHaveValue('15')
  await expect(page.getByLabel('People')).toHaveValue('3')
})
