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

test('[A1] on load shows heading, Start Test button and no-test text', async ({ page }) => {
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Typing Test' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Test' })).toBeVisible()
  await expect(page.getByText('No test in progress')).toBeVisible()
})

test('[A2] starting a test shows passage, empty input and timer at 00:00', async ({ page }) => {
  await start(page)
  await expect(page.getByText(passage)).toBeVisible()
  await expect(input(page)).toHaveValue('')
  await expect(timer(page)).toHaveText('00:00')
})

test('[A3] typing correct text shows Correct: 9 / 43', async ({ page }) => {
  await start(page)
  await input(page).fill('The quick')
  await expect(page.getByText('Correct: 9 / 43')).toBeVisible()
})

test('[A4] typing text with a misspelling shows Correct: 7 / 43', async ({ page }) => {
  await start(page)
  await input(page).fill('The quik')
  await expect(page.getByText('Correct: 7 / 43')).toBeVisible()
})

test('[A5] finishing the test shows WPM, accuracy and a stopped timer', async ({ page }) => {
  await start(page)
  await input(page).fill(passage.slice(0, -1))
  await page.clock.fastForward(45000)
  await input(page).press('g')
  await expect(page.getByText('WPM: 12.0')).toBeVisible()
  await expect(page.getByText('Accuracy: 100.0%')).toBeVisible()
  await expect(timer(page)).toHaveText('00:45')
  await page.clock.fastForward(5000)
  await expect(timer(page)).toHaveText('00:45')
})

test('[A6] restarting clears input, resets the timer and hides results', async ({ page }) => {
  await start(page)
  await input(page).fill(passage.slice(0, -1))
  await page.clock.fastForward(45000)
  await input(page).press('g')
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(input(page)).toHaveValue('')
  await expect(timer(page)).toHaveText('00:00')
  await expect(page.getByText(passage)).toBeVisible()
  await expect(page.getByText('WPM: 12.0')).toHaveCount(0)
})

test('[A7] finishing with one wrong character shows Accuracy: 95.3% and WPM: 12.0', async ({ page }) => {
  await start(page)
  await input(page).fill('The quikc brown fox jumps over the lazy do')
  await page.clock.fastForward(45000)
  await input(page).press('g')
  await expect(page.getByText('Accuracy: 95.3%')).toBeVisible()
  await expect(page.getByText('WPM: 12.0')).toBeVisible()
})

test('[A8] pause stops the clock and resume continues it', async ({ page }) => {
  await start(page)
  await page.clock.fastForward(3000)
  await expect(timer(page)).toHaveText('00:03')
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.clock.fastForward(5000)
  await expect(timer(page)).toHaveText('00:03')
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.clock.fastForward(2000)
  await expect(timer(page)).toHaveText('00:05')
})

test('[A9] the best WPM survives a reload', async ({ page }) => {
  await start(page)
  await input(page).fill(passage.slice(0, -1))
  await page.clock.fastForward(45000)
  await input(page).press('g')
  await expect(page.getByText('WPM: 12.0')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Best WPM: 12.0')).toBeVisible()
})
