import { expect, test, type Page } from '@playwright/test'

const DURATION = /^\d+:\d{2}\.\d{2}$/

const timeDisplay = (page: Page) => page.getByRole('timer')

// No explicit "Signature" section exists in the spec; the duration pattern is
// taken from A3, which A4/A7/A8 also use.

test('[A1] shows the heading and an idle time display', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Stopwatch App' })).toBeVisible()
  const t = timeDisplay(page)
  await expect(t).toHaveText('0:00.00')
})

test('[A2] start counts up past 1:50.00 after two seconds', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('button', { name: 'Start' })
  await start.click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  const t = timeDisplay(page)
  const value = await t.innerText()
  expect(value, 'timer is running').not.toBe('0:00.00')
  await page.waitForTimeout(2000)
  const later = (await t.innerText()).replace(',', '')
  const toSeconds = (v: string) => {
    const [m, rest] = v.split(/:/)
    return Number(m) * 60 + Number(rest)
  }
  expect(toSeconds(later)).toBeGreaterThan(110)
})

test('[A3] lap while running records Lap 1 with a duration', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Lap' }).click()
  const item = page.getByRole('listitem', { name: /Lap 1/ })
  await expect(item).toBeVisible()
  const m = (await item.innerText()).match(DURATION)
  expect(m, 'lap duration matches m:ss.cc').toBeTruthy()
})

test('[A4] second lap adds Lap 2; two items total', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Lap' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Lap' }).click()
  await expect(page.getByRole('listitem', { name: /Lap 1/ })).toBeVisible()
  const second = page.getByRole('listitem', { name: /Lap 2/ })
  await expect(second).toBeVisible()
  const m = (await second.innerText()).match(DURATION)
  expect(m, 'Lap 2 has a duration').toBeTruthy()
  await expect(page.getByRole('listitem')).toHaveCount(2)
})

test('[A5] stop freezes the time display', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  const t = timeDisplay(page)
  const v1 = await t.innerText()
  await page.waitForTimeout(2000)
  const v2 = await t.innerText()
  expect(v2).toBe(v1)
})

test('[A6] reset clears the display and the lap list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Lap' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(timeDisplay(page)).toHaveText('0:00.00')
  await expect(page.getByText('No laps yet')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A7] laps survive a reload with their durations', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Lap' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Lap' }).click()
  const d1 = (await page.getByRole('listitem', { name: /Lap 1/ }).innerText()).match(DURATION)![0]
  const d2 = (await page.getByRole('listitem', { name: /Lap 2/ }).innerText()).match(DURATION)![0]
  await page.reload()
  await expect(page.getByRole('listitem', { name: new RegExp(`Lap 1\\b.*${escapeRegex(d1)}`, 's') })).toBeVisible()
  await expect(page.getByRole('listitem', { name: new RegExp(`Lap 2\\b.*${escapeRegex(d2)}`, 's') })).toBeVisible()
})

test('[A8] copy laps puts the lap list on the clipboard', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Lap' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Lap' }).click()
  await page.getByRole('button', { name: 'Copy laps' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('Lap 1')
  expect(clip).toContain('Lap 2')
  const d1 = (await page.getByRole('listitem', { name: /Lap 1/ }).innerText()).match(DURATION)![0]
  const d2 = (await page.getByRole('listitem', { name: /Lap 2/ }).innerText()).match(DURATION)![0]
  expect(clip).toContain(d1)
  expect(clip).toContain(d2)
})

test('[A9] a single lap survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Lap' }).click()
  const d1 = (await page.getByRole('listitem', { name: /Lap 1/ }).innerText()).match(DURATION)![0]
  await page.reload()
  const item = page.getByRole('listitem', { name: new RegExp(`Lap 1\\b.*${escapeRegex(d1)}`, 's') })
  await expect(item).toBeVisible()
  expect((await item.innerText()).match(DURATION)![0]).toBe(d1)
})

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
