import { expect, test, type Page } from '@playwright/test'

const shortPassage = 'The quick brown fox'
const T0 = new Date('2026-01-01T09:00:00')
const T_START = new Date('2026-01-01T09:01:00')
const input = (page: Page) => page.getByLabel('Input')

async function start(page: Page, passageLength?: 'short' | 'long' | 'standard') {
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await page.clock.pauseAt(T_START)
  if (passageLength && passageLength !== 'standard') {
    await page.getByLabel('Length').selectOption(passageLength)
  }
  await page.getByRole('button', { name: 'Start Test' }).click()
}

test('selecting the short passage scores 4 words per minute divisor', async ({ page }) => {
  await start(page, 'short')
  await expect(page.getByText(shortPassage)).toBeVisible()
  await input(page).fill(shortPassage.slice(0, -1))
  await page.clock.fastForward(45000)
  await input(page).press('x')
  await expect(page.getByText('WPM: 5.3')).toBeVisible()
  await expect(page.getByText('Accuracy: 100.0%')).toBeVisible()
})

test('selecting the long passage types against the longer text', async ({ page }) => {
  await start(page, 'long')
  await input(page).fill('The quick brown fox ju')
  await expect(page.getByText('Correct: 22 / 68')).toBeVisible()
})

test('a finished attempt is listed and can be removed', async ({ page }) => {
  await start(page)
  await input(page).fill('The quick brown fox jumps over the lazy do')
  await page.clock.fastForward(45000)
  await input(page).press('g')
  await expect(page.getByText('WPM: 12.0')).toBeVisible()
  const row = page.getByRole('listitem').first()
  await expect(row.getByText('WPM 12.0')).toBeVisible()
  await row.getByRole('button', { name: 'Remove attempt 12.0' }).click()
  await expect(page.getByText('No attempts yet')).toBeVisible()
})
