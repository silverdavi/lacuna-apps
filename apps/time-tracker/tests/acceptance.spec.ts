import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

function row(page: Page, task: string) {
  return page.locator('tr').filter({ hasText: task })
}

// Reads the live timer display: a body element (outside any table) whose text is
// exactly an HH:MM:SS string. Reading only, no page mutation.
async function timerDisplay(page: Page): Promise<string> {
  return page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const t = (el.textContent ?? '').trim()
      if (/^\d{2}:\d{2}:\d{2}$/.test(t) && !el.closest('table')) return t
    }
    return ''
  })
}

// The "Total" cell of the history table: the data cell in the column headed
// "Total" (the header's row-position tells us the column index). Scoped to the
// table so the live timer display (which also shows an HH:MM:SS string) is not
// mistaken for the Total.
function totalCell(page: Page) {
  return page.locator('table').locator('tr').filter({ has: page.getByRole('columnheader', { name: 'Total' }) }).locator('td').last()
}

// The Playwright clock has no `tick`; `runFor` advances the fake clock and fires
// every due timer/animation-frame callback, so a timer updated on a repeating
// interval is driven all the way to `elapsedMs` (a one-shot `fastForward` would
// only fire the interval once).
async function advance(page: Page, elapsedMs: number) {
  await page.clock.install({ time: new Date('2024-01-01T00:00:00Z') })
  await page.clock.runFor(elapsedMs)
  // A short real wait lets any pending requestAnimationFrame commit its frame.
  await page.waitForTimeout(150)
}

// Fills the task, starts the timer, lets `elapsedMs` of fake time pass, and stops.
async function logSession(page: Page, task: string, elapsedMs: number) {
  await page.getByLabel('Task Name').fill(task)
  await page.getByRole('button', { name: 'Start Timer' }).click()
  await advance(page, elapsedMs)
  await page.getByRole('button', { name: 'Stop Timer' }).click()
}

test('[A1] page displays the heading "Time Tracker" and a button labelled "Start Timer"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Time Tracker' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Timer' })).toBeVisible()
})

test('[A2] clicking "Start Timer" changes the label to "Stop Timer" and counts up from "00:00:00"', async ({ page }) => {
  await page.goto('/')
  // Spec: the timer counts up from "00:00:00", so a display exists at start.
  await expect(page.getByText('00:00:00', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start Timer' }).click()
  await expect(page.getByRole('button', { name: 'Stop Timer' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Timer' })).toHaveCount(0)
  // Counts up: after a moment of (mocked) time the display must have advanced.
  await advance(page, 1500)
  expect(await timerDisplay(page), 'the timer counts up from 00:00:00').toBe('00:00:01')
})

test('[A3] stopping after 60 seconds adds a row "Default Task" with duration "00:01:00"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Timer' }).click()
  await advance(page, 60_000)
  await page.getByRole('button', { name: 'Stop Timer' }).click()
  await expect(row(page, 'Default Task')).toHaveCount(1)
  await expect(row(page, 'Default Task')).toContainText('00:01:00')
})

test('[A4] typing "Deep Work" in "Task Name" then start/stop after 30s adds "Deep Work" "00:00:30"', async ({ page }) => {
  await page.goto('/')
  await logSession(page, 'Deep Work', 30_000)
  await expect(row(page, 'Deep Work')).toContainText('00:00:30')
})

test('[A5] the table has a "Total" column that shows the sum of all durations', async ({ page }) => {
  await page.goto('/')
  await logSession(page, 'Deep Work', 30_000)
  await expect(page.getByRole('columnheader', { name: 'Total' })).toBeVisible()
  // Spec's example: one session of 00:01:00 totals 00:01:00; by the same rule
  // this single 00:00:30 session totals 00:00:30.
  await expect(totalCell(page)).toContainText('00:00:30')
})

test('[A6] clicking "Delete" on the "Deep Work" row removes it and Total becomes "00:00:00"', async ({ page }) => {
  await page.goto('/')
  await logSession(page, 'Deep Work', 30_000)
  await row(page, 'Deep Work').getByRole('button', { name: 'Delete' }).click()
  await expect(row(page, 'Deep Work')).toHaveCount(0)
  // No rows remain, so the Total sums to zero.
  await expect(totalCell(page)).toContainText('00:00:00')
})

test('[A7] clicking "Export CSV" downloads a file with header "Task,Duration" and row "Deep Work,00:00:30"', async ({ page }) => {
  await page.goto('/')
  await logSession(page, 'Deep Work', 30_000)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const lines = readFileSync((await download.path())!, 'utf8').split('\n')
  expect(lines[0]).toBe('Task,Duration')
  expect(lines[1]).toBe('Deep Work,00:00:30')
})

test('[A8] the "History" tab is visible and the "Timer" tab is active by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('tab', { name: 'History' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Timer', selected: true })).toBeVisible()
})

test('[A9] reload keeps the session "Deep Work" "00:00:30" in the table', async ({ page }) => {
  await page.goto('/')
  await logSession(page, 'Deep Work', 30_000)
  await expect(row(page, 'Deep Work')).toContainText('00:00:30')
  await page.reload()
  await expect(row(page, 'Deep Work')).toContainText('00:00:30')
})
