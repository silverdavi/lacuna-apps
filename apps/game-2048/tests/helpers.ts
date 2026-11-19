import type { Page } from '@playwright/test'

// Clears persisted game state so each test starts from a clean board, then
// reloads the app to apply the reset. A single key press is issued so the
// helper also performs a user action on the page.
export async function freshBoard(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.goto('/')
  await page.keyboard.press('ArrowUp')
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.goto('/')
}
