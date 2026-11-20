import { test } from '@playwright/test'

test('dump initial state + errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  await page.goto('/')
  await page.waitForTimeout(400)
  const dump = await page.evaluate(() => {
    const root = document.getElementById('root')!
    // list all elements with a role or heading tag
    const nodes: string[] = []
    root.querySelectorAll('*').forEach((el) => {
      const role = el.getAttribute('role')
      const tag = el.tagName.toLowerCase()
      const text = (el.textContent || '').trim().slice(0, 30)
      if (role || /^(h1|h2|h3)$/i.test(tag)) nodes.push(`<${tag}> role=${role ?? '-'} text="${text}"`)
    })
    return nodes
  })
  console.log('=== ROLES/HEADINGS ===')
  console.log(dump.join('\n'))
  console.log('=== ERRORS ===')
  console.log(errors.length ? errors.join('\n') : '(none)')
  // Try the exact A1 locators
  const heading = await page.getByRole('heading', { name: 'QR Code Scanner' }).count()
  const noResults = await page.getByText('No results yet').count()
  const tabScan = await page.getByRole('tab', { name: 'Scan' }).count()
  const tabEncode = await page.getByRole('tab', { name: 'Encode' }).count()
  console.log(`=== COUNTS heading=${heading} noResults=${noResults} tabScan=${tabScan} tabEncode=${tabEncode}`)
})
