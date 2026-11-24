import { expect, test } from '@playwright/test'

async function completeFocus(page: import('@playwright/test').Page) {
  const time = page.getByText('00:00', { exact: true })
  while ((await time.count()) === 0) {
    await page.clock.runFor(60_000)
  }
  await expect(time).toBeVisible()
}

test('[DEBUG] A9 localStorage state', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await completeFocus(page)
  console.log('Focus session completed')
  const localStorageState = await page.evaluate(() => localStorage.getItem('lacuna.pomodoro-timer.state'))
  console.log(`localStorage state: ${localStorageState}`)
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  const sessions = await page.getByRole('listitem').allInnerTexts()
  console.log(`Sessions after reload: ${JSON.stringify(sessions)}`)
  expect(sessions.length).toBeGreaterThan(0)
})
