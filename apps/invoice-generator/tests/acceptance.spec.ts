import { expect, test } from '@playwright/test'

async function fillRow(
  page: import('@playwright/test').Page,
  values: Record<string, string>,
) {
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label).fill(value)
  }
}

async function addLineItem(
  page: import('@playwright/test').Page,
  values: Record<string, string>,
) {
  await page.getByRole('button', { name: 'Add line item' }).click()
  await fillRow(page, values)
}

test('[A1] heading and ready status', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Invoice Generator' })).toBeVisible()
  await expect(page.getByText('Ready')).toBeVisible()
})

test('[A2] document preview header reflects header fields', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Client name').fill('Acme Corp')
  await page.getByLabel('Invoice number').fill('INV-001')
  await page.getByLabel('Issue date').fill('2024-06-15')
  await expect(page.getByText('Acme Corp')).toBeVisible()
  await expect(page.getByText('INV-001')).toBeVisible()
  await expect(page.getByText('June 15, 2024')).toBeVisible()
})

test('[A3] first line item computes subtotal, tax, and document total', async ({ page }) => {
  await page.goto('/')
  await addLineItem(page, {
    Description: 'Consulting',
    Quantity: '10',
    'Unit price': '150',
    Discount: '0',
    'Tax rate': '8',
  })
  await expect(page.getByText('$1,500.00')).toBeVisible()
  await expect(page.getByText('$120.00')).toBeVisible()
  await expect(page.getByText('$1,620.00')).toBeVisible()
})

test('[A4] second line item with discount updates total', async ({ page }) => {
  await page.goto('/')
  await addLineItem(page, {
    Description: 'Consulting',
    Quantity: '10',
    'Unit price': '150',
    Discount: '0',
    'Tax rate': '8',
  })
  await addLineItem(page, {
    Description: 'Travel',
    Quantity: '2',
    'Unit price': '75',
    Discount: '10',
    'Tax rate': '8',
  })
  await expect(page.getByText('$135.00')).toBeVisible()
  await expect(page.getByText('$1,755.00')).toBeVisible()
})

test('[A5] delete removes a row and reverts total', async ({ page }) => {
  await page.goto('/')
  await addLineItem(page, {
    Description: 'Consulting',
    Quantity: '10',
    'Unit price': '150',
    Discount: '0',
    'Tax rate': '8',
  })
  await addLineItem(page, {
    Description: 'Travel',
    Quantity: '2',
    'Unit price': '75',
    Discount: '10',
    'Tax rate': '8',
  })
  await expect(page.getByText('$1,755.00')).toBeVisible()
  const travelRow = page.locator('tr', { has: page.getByText('Travel') })
  await travelRow.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Travel')).toHaveCount(0)
  await expect(page.getByText('$1,620.00')).toBeVisible()
})

test('[A6] export pdf opens print dialog with invoice layout', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Client name').fill('Acme Corp')
  await page.getByLabel('Invoice number').fill('INV-001')
  await addLineItem(page, {
    Description: 'Consulting',
    Quantity: '10',
    'Unit price': '150',
    Discount: '0',
    'Tax rate': '8',
  })
  await page.getByRole('button', { name: 'Export PDF' }).click()
  await expect(page.getByText('Acme Corp')).toBeVisible()
  await expect(page.getByText('INV-001')).toBeVisible()
  await expect(page.getByText('Consulting')).toBeVisible()
  await expect(page.getByText('$1,620.00')).toBeVisible()
})

test('[A7] copy to clipboard copies text and shows status', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Client name').fill('Acme Corp')
  await page.getByLabel('Invoice number').fill('INV-001')
  await addLineItem(page, {
    Description: 'Consulting',
    Quantity: '10',
    'Unit price': '150',
    Discount: '0',
    'Tax rate': '8',
  })
  await page.getByRole('button', { name: 'Copy to clipboard' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Acme Corp')
  expect(text).toContain('INV-001')
  expect(text).toContain('$1,620.00')
  await expect(page.getByText('Copied')).toBeVisible()
})

test('[A8] changing tax rate to zero zeroes tax and updates total', async ({ page }) => {
  await page.goto('/')
  await addLineItem(page, {
    Description: 'Consulting',
    Quantity: '10',
    'Unit price': '150',
    Discount: '0',
    'Tax rate': '8',
  })
  await page.getByLabel('Tax rate').fill('0')
  await expect(page.getByText('$0.00')).toBeVisible()
  await expect(page.getByText('$1,500.00')).toBeVisible()
})

test('[A9] reload persists the invoice', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Client name').fill('Acme Corp')
  await page.getByLabel('Invoice number').fill('INV-001')
  await page.getByLabel('Issue date').fill('2024-06-15')
  await addLineItem(page, {
    Description: 'Consulting',
    Quantity: '10',
    'Unit price': '150',
    Discount: '0',
    'Tax rate': '8',
  })
  await page.getByLabel('Tax rate').fill('0')
  await expect(page.getByText('$1,500.00')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Client name')).toHaveValue('Acme Corp')
  await expect(page.getByLabel('Invoice number')).toHaveValue('INV-001')
  await expect(page.getByLabel('Issue date')).toHaveValue('2024-06-15')
  await expect(page.getByText('Consulting')).toBeVisible()
  await expect(page.getByLabel('Quantity')).toHaveValue('10')
  await expect(page.getByLabel('Unit price')).toHaveValue('150')
  await expect(page.getByText('$1,500.00')).toBeVisible()
})
