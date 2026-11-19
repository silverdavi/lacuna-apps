import { test, expect } from '@playwright/test'

test('[DEBUG] dump all aria labels', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)

  const labels = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-row][data-col]'))
    return nodes.map((n) => ({
      dataRow: n.getAttribute('data-row'),
      dataCol: n.getAttribute('data-col'),
      ariaLabel: n.getAttribute('aria-label'),
    }))
  })

  const unique = [...new Set(labels.map((l) => l.ariaLabel))]
  console.log('Unique aria-labels:', JSON.stringify(unique.slice(0, 10), null, 2))
  console.log('Total cells:', labels.length)

  const row1col1 = labels.filter((l) => l.ariaLabel === 'hidden, row 1, column 1')
  console.log('row1col1 count:', row1col1.length)
  if (row1col1.length > 0) {
    console.log('row1col1 details:', JSON.stringify(row1col1[0], null, 2))
  }

  expect(true).toBe(true)
})
