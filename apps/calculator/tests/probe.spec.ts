import { test } from '@playwright/test'

test('probe explicit role on select', async ({ page }) => {
  await page.goto('/')
  // Set role BEFORE any interaction
  await page.evaluate(() => {
    const sel = document.querySelector('select')
    if (sel) sel.setAttribute('role', 'select')
  })
  // Force a fresh a11y tree query
  await page.waitForTimeout(100)
  const c1 = await page.getByRole('select').count()
  console.log('select count:', c1)
  const c2 = await page.getByRole('select', { name: 'Angle mode' }).count()
  console.log('select named:', c2)
  // Also check what role Playwright actually sees
  const sel = page.locator('select')
  const info = await sel.evaluate((el) => ({
    role: el.getAttribute('role'),
    tagName: el.tagName,
  }))
  console.log('element info:', JSON.stringify(info))
})
