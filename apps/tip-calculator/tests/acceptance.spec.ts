import { expect, test, type Page } from '@playwright/test'

// A3: the spec calls this a slider. Playwright resolves getByLabel to the
// control the label owns; .fill() sets the value on a native range input.
async function setSlider(page: Page, value: number) {
  const slider = page.getByLabel('Tip percentage', { exact: true })
  await slider.fill(String(value))
  await expect(slider).toHaveValue(String(value))
}

async function setBill(page: Page, bill: number, tax: number, tip: number, people: number) {
  await page.getByLabel('Bill amount', { exact: true }).fill(String(bill))
  await page.getByLabel('Tax amount', { exact: true }).fill(String(tax))
  await setSlider(page, tip)
  await page.getByLabel('Number of people', { exact: true }).fill(String(people))
}

test('[A1] page shows heading and Bill and Split tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tip Calculator' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Bill' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Split' })).toBeVisible()
})

test('[A2] bill 100 and tax 8 show Subtotal, Tax, and Total lines', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount', { exact: true }).fill('100')
  await page.getByLabel('Tax amount', { exact: true }).fill('8')
  await expect(page.getByText('Subtotal: $100.00')).toBeVisible()
  await expect(page.getByText('Tax: $8.00')).toBeVisible()
  await expect(page.getByText('Total: $108.00')).toBeVisible()
})

test('[A3] tip slider at 15 shows Tip and Total lines', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount', { exact: true }).fill('100')
  await page.getByLabel('Tax amount', { exact: true }).fill('8')
  await setSlider(page, 15)
  await expect(page.getByText('Tip: $15.00')).toBeVisible()
  await expect(page.getByText('Total: $123.00')).toBeVisible()
})

test('[A4] 4 people shows the Per person line', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount', { exact: true }).fill('100')
  await page.getByLabel('Tax amount', { exact: true }).fill('8')
  await setSlider(page, 15)
  await page.getByLabel('Number of people', { exact: true }).fill('4')
  await expect(page.getByText('Per person: $30.75')).toBeVisible()
})

test('[A5] Split tab with 4 people shows header row and person 1 row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount', { exact: true }).fill('100')
  await page.getByLabel('Tax amount', { exact: true }).fill('8')
  await setSlider(page, 15)
  await page.getByLabel('Number of people', { exact: true }).fill('4')
  await page.getByRole('tab', { name: 'Split' }).click()
  const header = page.getByRole('row', { name: 'Person' })
  await expect(header).toBeVisible()
  await expect(header.getByText('Paid')).toBeVisible()
  await expect(header.getByText('Owes')).toBeVisible()
  const row = page.getByRole('row', { name: '1' })
  await expect(row).toBeVisible()
  await expect(row.getByText('$0.00')).toBeVisible()
  await expect(row.getByText('$30.75')).toBeVisible()
})

test('[A6] uneven payments show the transfer line', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount', { exact: true }).fill('100')
  await page.getByLabel('Tax amount', { exact: true }).fill('8')
  await setSlider(page, 15)
  await page.getByLabel('Number of people', { exact: true }).fill('2')
  await page.getByRole('tab', { name: 'Split' }).click()
  await page.getByLabel('Person 1 paid', { exact: true }).fill('50')
  await page.getByLabel('Person 2 paid', { exact: true }).fill('73')
  await expect(page.getByText('Person 1 pays Person 2 $11.50')).toBeVisible()
})

test('[A7] Copy summary copies the summary text to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Bill amount', { exact: true }).fill('100')
  await page.getByLabel('Tax amount', { exact: true }).fill('8')
  await setSlider(page, 15)
  await page.getByLabel('Number of people', { exact: true }).fill('4')
  await page.getByRole('button', { name: 'Copy summary' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('Total: $123.00, Per person: $30.75')
})

test('[A8] selecting the 10% preset moves the slider to 10', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount', { exact: true }).fill('100')
  await page.getByLabel('Tax amount', { exact: true }).fill('8')
  await page.getByLabel('Tip preset', { exact: true }).selectOption('10%')
  const slider = page.getByLabel('Tip percentage', { exact: true })
  await expect(slider).toHaveValue('10')
  await expect(page.getByText('Tip: $10.00')).toBeVisible()
})

test('[A9] bill and split settings survive a reload', async ({ page }) => {
  await page.goto('/')
  await setBill(page, 100, 8, 15, 4)
  await expect(page.getByText('Total: $123.00')).toBeVisible()
  await expect(page.getByText('Per person: $30.75')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Total: $123.00')).toBeVisible()
  await expect(page.getByText('Per person: $30.75')).toBeVisible()
  const slider = page.getByLabel('Tip percentage', { exact: true })
  await expect(slider).toHaveValue('15')
  await expect(page.getByLabel('Number of people', { exact: true })).toHaveValue('4')
})
