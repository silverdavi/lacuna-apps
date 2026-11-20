import { expect, test, type Page } from '@playwright/test'

// Reads the year heatmap from the DOM after a user action. The app must expose
// each day as a cell (A6: "a 53-column grid for the year 2023") and expose the
// ring as a progress element whose aria values give the fraction (A7: "visually
// half-filled" must be checkable by a person, not just by the text label).
async function heatmap(page: Page) {
  return page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('rect, [data-day], [data-date], [data-iso]'))
    if (!cells.length) throw new Error('no heatmap cells found')
    return cells.map((c) => {
      const el = c as SVGElement & HTMLElement
      const iso =
        el.dataset?.day ?? el.dataset?.date ?? el.dataset?.iso ?? el.getAttribute('data-iso') ?? ''
      const label =
        el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.getAttribute('tooltip') ?? ''
      const filled =
        el.getAttribute('aria-pressed') === 'true' ||
        el.getAttribute('aria-checked') === 'true' ||
        el.getAttribute('data-filled') === 'true' ||
        el.getAttribute('data-checked') === 'true' ||
        /filled|checked|active|on/i.test(el.getAttribute('data-state') ?? '')
      return { iso, label, filled }
    })
  })
}

async function ringValues(page: Page) {
  const progress = page.getByRole('progressbar').first()
  const max = await progress.getAttribute('aria-valuemax')
  const now = await progress.getAttribute('aria-valuenow')
  return { max: max ? Number(max) : 30, now: now ? Number(now) : 0 }
}

async function checkInToday(page: Page) {
  await page.getByRole('button', { name: 'Check in today' }).click()
}

async function addPast(page: Page, iso: string) {
  await page.getByRole('button', { name: 'Add past check-in' }).click()
  const date = page.getByLabel('Date').first()
  await date.fill(iso)
  await page.getByRole('button', { name: 'Save' }).click()
}

// The streak line must be findable by its exact text; the spec fixes the wording.
function streakLine(page: Page) {
  return page.getByText(/Current streak:/).first()
}

test('[A1] empty app shows heading, no check-ins text, zero streak and 0/30 ring', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Goal Tracker' })).toBeVisible()
  await expect(page.getByText('No check-ins yet')).toBeVisible()
  await expect(streakLine(page)).toHaveText('Current streak: 0 days')
  await expect(page.getByText('0/30', { exact: true })).toBeVisible()
  // Initial empty state; no user action precedes the read.
  const cells = await heatmap(page)
  expect(cells.length, 'heatmap renders 365 day cells in the empty app').toBe(365)
})

test('[A2] Check in today adds today, streak becomes 1 day and ring 1/30', async ({ page }) => {
  await page.goto('/')
  await checkInToday(page)
  await expect(streakLine(page)).toHaveText('Current streak: 1 day')
  await expect(page.getByText('1/30', { exact: true })).toBeVisible()
})

test('[A3] Add past check-in with Date 2023-10-15 and Save fills that cell', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add past check-in' }).click()
  // The spec: clicking the button "opens a date input".
  await expect(page.getByLabel('Date').first()).toBeVisible()
  await addPast(page, '2023-10-15')
  const cells = await heatmap(page)
  const hit = cells.find((c) => c.iso === '2023-10-15' || /october 15, 2023|2023-10-15/i.test(c.label))
  expect(hit, 'heatmap has a cell for October 15, 2023').toBeTruthy()
  expect(hit?.filled, 'the October 15, 2023 cell is filled').toBe(true)
})

test('[A4] three consecutive past days show current and longest streak of 3', async ({ page }) => {
  await page.goto('/')
  await addPast(page, '2023-10-15')
  await addPast(page, '2023-10-16')
  await addPast(page, '2023-10-17')
  await expect(streakLine(page)).toHaveText('Current streak: 3 days')
  await expect(page.getByText('Longest streak: 3 days')).toBeVisible()
})

test('[A5] a gap on Oct 18-19 breaks the streak: current 2, longest 3', async ({ page }) => {
  await page.goto('/')
  for (const d of ['2023-10-15', '2023-10-16', '2023-10-17', '2023-10-20', '2023-10-21']) {
    await addPast(page, d)
  }
  await expect(streakLine(page)).toHaveText('Current streak: 2 days')
  await expect(page.getByText('Longest streak: 3 days')).toBeVisible()
})

test('[A6] heatmap is a 53-column grid for 2023; Jan 1 and Dec 31 unfilled when empty', async ({ page }) => {
  await page.goto('/')
  // Read after a user action (A6's own condition: "when no check-ins exist for those dates").
  await checkInToday(page)
  const cells = await heatmap(page)
  // 365 day cells in a 53-column grid (52*7=364, +1 for the leading partial week)
  expect(cells.length, 'heatmap has 365 day cells').toBe(365)
  const jan = cells.find((c) => c.iso === '2023-01-01' || /january 1, 2023/i.test(c.label))
  const dec = cells.find((c) => c.iso === '2023-12-31' || /december 31, 2023/i.test(c.label))
  expect(jan, 'heatmap has a cell for January 1, 2023').toBeTruthy()
  expect(dec, 'heatmap has a cell for December 31, 2023').toBeTruthy()
  expect(jan?.filled, 'January 1, 2023 is unfilled').toBe(false)
  expect(dec?.filled, 'December 31, 2023 is unfilled').toBe(false)
})

test('[A7] 15 check-ins show ring label 15/30 and a half-filled ring', async ({ page }) => {
  await page.goto('/')
  await checkInToday(page)
  const past = [
    '2023-10-15', '2023-10-16', '2023-10-17', '2023-10-18', '2023-10-19',
    '2023-10-20', '2023-10-21', '2023-10-22', '2023-10-23', '2023-10-24',
    '2023-10-25', '2023-10-26', '2023-10-27', '2023-10-28', '2023-10-29',
  ]
  for (const d of past) await addPast(page, d)
  await expect(page.getByText('15/30', { exact: true })).toBeVisible()
  // 15 of 30 check-ins this month: the ring is visually half-filled.
  const { max, now } = await ringValues(page)
  expect(max).toBe(30)
  expect(now).toBe(15)
  expect(now / max).toBeCloseTo(0.5, 5)
})

test('[A8] Delete check-in on the Oct 15 item removes it and updates the streak', async ({ page }) => {
  await page.goto('/')
  // Build a current streak that includes Oct 15 so deleting it changes the streak.
  await addPast(page, '2023-10-14')
  await addPast(page, '2023-10-15')
  await addPast(page, '2023-10-16')
  await addPast(page, '2023-10-17')
  await expect(streakLine(page)).toHaveText('Current streak: 4 days')
  const item = page.getByRole('listitem').filter({ hasText: '2023-10-15' })
  await item.getByRole('button', { name: 'Delete check-in' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: '2023-10-15' })).toHaveCount(0)
  // Oct 15 was inside the run 14-17; deleting it breaks the run in two.
  await expect(streakLine(page)).toHaveText('Current streak: 2 days')
})

test('[A9] the Oct 15 check-in survives a reload', async ({ page }) => {
  await page.goto('/')
  await addPast(page, '2023-10-15')
  await page.reload()
  const cells = await heatmap(page)
  const hit = cells.find((c) => c.iso === '2023-10-15' || /october 15, 2023/i.test(c.label))
  expect(hit, 'heatmap still has a cell for October 15, 2023').toBeTruthy()
  expect(hit?.filled, 'the October 15, 2023 cell is still filled').toBe(true)
  // A9's own condition: "if it is the only check-in" -> the streak is 1 day.
  // The current streak is 0 for an isolated past date, so the reading that
  // agrees with A2/A4 (streak counts the checked-in day) is what A9 asserts.
  await expect(streakLine(page)).toHaveText('Current streak: 1 day')
})
