import { expect, test, type Page } from '@playwright/test'

const passage = 'The quick brown fox jumps over the lazy dog'
const T0 = new Date('2026-01-01T09:00:00')
const T_START = new Date('2026-01-01T09:01:00')
const timer = (page: Page) => page.getByRole('timer', { name: 'Time' })
const input = (page: Page) => page.getByLabel('Input')

async function start(page: Page) {
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await page.clock.pauseAt(T_START)
  await page.getByRole('button', { name: 'Start Test' }).click()
}

test('the passage is a labelled field that reports the full passage text', async ({ page }) => {
  await start(page)
  await expect(page.getByLabel('Passage')).toContainText(passage)
})

test('a partially typed passage reports the correct character count', async ({ page }) => {
  await start(page)
  await input(page).fill('The quick b')
  await expect(page.getByText('Correct: 11 / 43')).toBeVisible()
})

test('pausing then resuming keeps the running clock continuous', async ({ page }) => {
  await start(page)
  await page.clock.fastForward(2000)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.clock.fastForward(1000)
  await expect(timer(page)).toHaveText('00:03')
})
