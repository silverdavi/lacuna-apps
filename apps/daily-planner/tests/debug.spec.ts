import { expect, test } from '@playwright/test'

test('verify: button with child never matches exact', async ({ page }) => {
  await page.goto('/')

  await page.evaluate(() => {
    const container = document.createElement('div')
    container.id = 'debug-container'
    container.innerHTML = `
      <button id="plain">Team Sync</button>
      <button id="with-hidden-span">Team Sync<span style="display:none">14:00</span></button>
      <button id="with-visible-span">Team Sync<span>14:00</span></button>
      <button id="with-br">Team Sync<br>14:00</button>
    `
    document.body.appendChild(container)
  })

  const exact = page.getByText('Team Sync', { exact: true })
  const count = await exact.count()
  console.log('exact "Team Sync" count:', count)
  for (let i = 0; i < count; i++) {
    const id = await exact.nth(i).evaluate(el => (el as HTMLElement).id || 'no-id')
    console.log(`  match: ${id}`)
  }

  // Also test: does a non-button element with text "Team Sync" match?
  const spanExact = page.locator('span').filter({ hasText: /^Team Sync$/ })
  console.log('\nspans with exact "Team Sync":', await spanExact.count())

  expect(true).toBe(true)
})
