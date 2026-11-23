import { expect, test, type Page } from '@playwright/test'

async function addHolding(page: Page, symbol: string, shares: string, price: string) {
  await page.getByLabel('Symbol').fill(symbol)
  await page.getByLabel('Shares').fill(shares)
  await page.getByLabel('Purchase Price').fill(price)
  await page.getByRole('button', { name: 'Add holding' }).click()
}

function row(page: Page, symbol: string) {
  return page.locator('tr').filter({ hasText: symbol })
}

async function logPrice(page: Page, symbol: string, price: string) {
  await page.getByLabel('Holding').selectOption(symbol)
  await page.getByLabel('Current Price').fill(price)
  await page.getByRole('button', { name: 'Log price' }).click()
}

test('[A1] empty app shows heading, no-holdings text and zero summaries', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Stock Portfolio' })).toBeVisible()
  await expect(page.getByText('No holdings yet')).toBeVisible()
  await expect(page.getByText('Total Cost: $0.00')).toBeVisible()
  await expect(page.getByText('Total Value: $0.00')).toBeVisible()
  await expect(page.getByText('Gain/Loss: $0.00')).toBeVisible()
})

test('[A2] adding a holding shows a row and updates the cost total', async ({ page }) => {
  await page.goto('/')
  await addHolding(page, 'AAPL', '10', '150.25')
  await expect(page.getByText('No holdings yet')).toHaveCount(0)
  const r = row(page, 'AAPL')
  await expect(r).toContainText('AAPL')
  await expect(r).toContainText('10')
  await expect(r).toContainText('$1,502.50')
  await expect(page.getByText('Total Cost: $1,502.50')).toBeVisible()
})

test('[A3] adding a second holding sums the cost total', async ({ page }) => {
  await page.goto('/')
  await addHolding(page, 'AAPL', '10', '150.25')
  await addHolding(page, 'MSFT', '5', '300.00')
  const r = row(page, 'MSFT')
  await expect(r).toContainText('MSFT')
  await expect(r).toContainText('$1,500.00')
  await expect(page.getByText('Total Cost: $3,002.50')).toBeVisible()
})

test('[A4] empty symbol, or empty, zero or negative shares, adds no row and shows the error', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Symbol').fill('')
  await page.getByLabel('Shares').fill('10')
  await page.getByLabel('Purchase Price').fill('150.25')
  await page.getByRole('button', { name: 'Add holding' }).click()
  await expect(page.getByText('Enter a symbol and a share count greater than 0')).toBeVisible()

  await page.getByLabel('Symbol').fill('AAPL')
  await page.getByLabel('Shares').fill('')
  await page.getByRole('button', { name: 'Add holding' }).click()
  await expect(page.getByText('Enter a symbol and a share count greater than 0')).toBeVisible()

  await page.getByLabel('Shares').fill('0')
  await page.getByRole('button', { name: 'Add holding' }).click()
  await expect(page.getByText('Enter a symbol and a share count greater than 0')).toBeVisible()

  await page.getByLabel('Shares').fill('-5')
  await page.getByRole('button', { name: 'Add holding' }).click()
  await expect(page.getByText('Enter a symbol and a share count greater than 0')).toBeVisible()

  await expect(page.locator('tr').filter({ has: page.getByRole('button', { name: /Delete / }) })).toHaveCount(0)
  await expect(page.getByText('No holdings yet')).toBeVisible()
  await expect(page.getByText('Total Cost: $0.00')).toBeVisible()
})

test('[A5] each row has a delete button and deleting updates the cost total', async ({ page }) => {
  await page.goto('/')
  await addHolding(page, 'AAPL', '10', '150.25')
  await addHolding(page, 'MSFT', '5', '300.00')
  await expect(page.getByRole('button', { name: 'Delete AAPL' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete MSFT' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete MSFT' }).click()
  await expect(row(page, 'MSFT')).toHaveCount(0)
  await expect(page.getByText('Total Cost: $1,502.50')).toBeVisible()
})

test('[A6] logging a price updates the row value and gain/loss and the summary', async ({ page }) => {
  await page.goto('/')
  await addHolding(page, 'AAPL', '10', '150.25')
  await logPrice(page, 'AAPL', '160.00')
  const r = row(page, 'AAPL')
  await expect(r).toContainText('Value: $1,600.00')
  await expect(r).toContainText('Gain/Loss: +$97.50')
  await expect(page.getByText('Total Value: $1,600.00')).toBeVisible()
  await expect(page.getByText('Gain/Loss: +$97.50')).toBeVisible()
})

test('[A7] the History tab shows a line chart with a tooltip on the last point and a snapshot count', async ({ page }) => {
  await page.goto('/')
  await addHolding(page, 'AAPL', '10', '150.25')
  await logPrice(page, 'AAPL', '160.00')
  await page.getByRole('tab', { name: 'History' }).click()
  // the line chart renders into an svg
  const svg = page.locator('svg')
  await expect(svg).toBeVisible()
  const points = svg.locator('circle')
  expect(await points.count(), 'chart renders at least one data point').toBeGreaterThan(0)
  // the last data point is the last one in the series; hover it to reveal the tooltip
  const box = await points.last().boundingBox()
  expect(box, 'the last point has a position to hover').toBeTruthy()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByText('AAPL: $160.00')).toBeVisible()
  await expect(page.getByText('2 snapshots')).toBeVisible()
})

test('[A8] Export CSV copies the table to the clipboard and shows the confirmation', async ({ page, context }) => {
  // grant before the export click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addHolding(page, 'AAPL', '10', '150.25')
  await logPrice(page, 'AAPL', '160.00')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard holds the exported CSV').toBe('Symbol,Shares,Cost,Value,Gain/Loss\nAAPL,10,1502.50,1600.00,97.50')
})

test('[A9] a holding and its logged price snapshot survive a reload', async ({ page }) => {
  await page.goto('/')
  await addHolding(page, 'AAPL', '10', '150.25')
  await logPrice(page, 'AAPL', '160.00')
  await page.reload()
  const r = row(page, 'AAPL')
  await expect(r).toContainText('10')
  await expect(page.getByText('Total Cost: $1,502.50')).toBeVisible()
  await expect(page.getByText('Total Value: $1,600.00')).toBeVisible()
})
