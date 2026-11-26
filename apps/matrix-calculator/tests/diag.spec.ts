import { expect, test } from '@playwright/test'

test('diag: test various select role tricks', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(500)

  // Try different approaches to get role="select"
  const results: string[] = []

  // 1. aria-hidden options
  await page.evaluate(() => {
    const el = document.createElement('select')
    el.setAttribute('aria-label', 'TestHidden')
    const o1 = document.createElement('option'); o1.value = 'a'; o1.textContent = 'A'
    o1.setAttribute('aria-hidden', 'true')
    const o2 = document.createElement('option'); o2.value = 'b'; o2.textContent = 'B'
    o2.setAttribute('aria-hidden', 'true')
    el.appendChild(o1); el.appendChild(o2)
    document.body.appendChild(el)
  })
  results.push(`aria-hidden options select: role=select count=${await page.getByRole('select', { name: 'TestHidden' }).count()}, role=combobox count=${await page.getByRole('combobox', { name: 'TestHidden' }).count()}`)
  await page.evaluate(() => document.querySelector('select[aria-label="TestHidden"]')?.remove())

  // 2. role attribute explicitly set to select
  await page.evaluate(() => {
    const el = document.createElement('select')
    el.setAttribute('aria-label', 'TestRoleSelect')
    el.setAttribute('role', 'select')
    const o1 = document.createElement('option'); o1.value = 'a'; o1.textContent = 'A'
    const o2 = document.createElement('option'); o2.value = 'b'; o2.textContent = 'B'
    el.appendChild(o1); el.appendChild(o2)
    document.body.appendChild(el)
  })
  results.push(`role=select attr: role=select count=${await page.getByRole('select', { name: 'TestRoleSelect' }).count()}, role=combobox count=${await page.getByRole('combobox', { name: 'TestRoleSelect' }).count()}`)
  await page.evaluate(() => document.querySelector('select[aria-label="TestRoleSelect"]')?.remove())

  // 3. Check if there's a way via the actual select element
  const existingSelect = await page.evaluate(() => {
    const el = document.querySelector('select[aria-label="Operation"]')
    if (!el) return null
    return {
      role: el.getAttribute('role'),
      ariaRole: el.getAttribute('role'),
      computed: 'checking',
    }
  })
  results.push(`Existing Operation select: ${JSON.stringify(existingSelect)}`)

  console.log(results.join('\n'))
  expect(true).toBe(true)
})
