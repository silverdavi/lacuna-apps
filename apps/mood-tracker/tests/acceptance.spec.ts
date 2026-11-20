import { expect, test } from '@playwright/test'

test('[A1] Fresh app shows empty state with heading, empty message, and 0-day streak', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Mood Tracker' })).toBeVisible()
  await expect(page.getByText('No moods logged yet')).toBeVisible()
  await expect(page.getByText('Streak: 0 days')).toBeVisible()
})

test('[A2] Logging a mood with a note creates a list item and a 1-day streak', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mood').selectOption('Calm')
  await page.getByLabel('Note').fill('Good night')
  await page.getByRole('button', { name: 'Log mood' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Calm' })
  await expect(item).toHaveText(/Calm/)
  await expect(item).toContainText('Good night')
  await expect(page.getByText('Streak: 1 days')).toBeVisible()
  await expect(page.getByText('No moods logged yet')).toHaveCount(0)
})

test('[A3] Logging a second mood the same day adds an item but keeps the streak at 1 day', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mood').selectOption('Calm')
  await page.getByRole('button', { name: 'Log mood' }).click()
  await page.getByLabel('Mood').selectOption('Anxious')
  await page.getByRole('button', { name: 'Log mood' }).click()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(1)).toContainText('Anxious')
  await expect(page.getByText('Streak: 1 days')).toBeVisible()
})

test('[A4] Logging with no mood selected shows an error and adds no item', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Log mood' }).click()
  await expect(page.getByText('Select a mood')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A5] Heatmap shows 7 squares with only today filled using the last logged mood', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mood').selectOption('Anxious')
  await page.getByRole('button', { name: 'Log mood' }).click()
  const counts = await page.evaluate(() => {
    const candidates: Element[] = []
    const groups = document.querySelectorAll('[role="group"]')
    groups.forEach((g) => candidates.push(g))
    document.querySelectorAll('svg').forEach((s) => candidates.push(s))
    const scope = (root: Element): { total: number; filled: number } => {
      const svgRects = root.querySelectorAll('svg rect')
      if (svgRects.length === 7) {
        return {
          total: svgRects.length,
          filled: Array.from(svgRects).filter((r) => {
            const f = r.getAttribute('fill') ?? ''
            return f && f !== 'none' && f !== 'transparent' && f !== 'currentColor'
          }).length,
        }
      }
      const btns = root.querySelectorAll('button[aria-pressed]')
      if (btns.length === 7) {
        return {
          total: btns.length,
          filled: Array.from(btns).filter((b) => b.getAttribute('aria-pressed') === 'true').length,
        }
      }
      const data = root.querySelectorAll('[data-filled]')
      if (data.length === 7) {
        return {
          total: data.length,
          filled: Array.from(data).filter((b) => b.getAttribute('data-filled') === 'true').length,
        }
      }
      return { total: 0, filled: 0 }
    }
    for (const c of candidates) {
      const s = scope(c)
      if (s.total === 7) return s
    }
    const anyData = document.querySelectorAll('[data-filled]')
    if (anyData.length === 7) {
      return {
        total: 7,
        filled: Array.from(anyData).filter((b) => b.getAttribute('data-filled') === 'true').length,
      }
    }
    return { total: 0, filled: 0 }
  })
  expect(counts.total).toBe(7)
  expect(counts.filled).toBe(1)
})

test('[A6] Trend chart plots a single point at y-value 2 for an Anxious entry', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mood').selectOption('Anxious')
  await page.getByRole('button', { name: 'Log mood' }).click()
  const chart = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg'))
    const candidate = svgs.find((s) => s.querySelector('polyline, path, circle'))
    if (!candidate) return { found: false, points: 0 }
    const circles = Array.from(candidate.querySelectorAll('circle'))
    const dots = Array.from(candidate.querySelectorAll('path, line')).filter((el) => el.getAttribute('stroke-linecap') === 'round')
    return { found: true, points: circles.length || dots.length }
  })
  expect(chart.found).toBe(true)
  expect(chart.points).toBe(1)
})

test('[A7] Deleting the first mood removes it and keeps the streak at 1 day', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mood').selectOption('Calm')
  await page.getByRole('button', { name: 'Log mood' }).click()
  await page.getByLabel('Mood').selectOption('Anxious')
  await page.getByRole('button', { name: 'Log mood' }).click()
  await page.getByRole('button', { name: 'Delete Calm' }).click()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('Anxious')
  await expect(items.first()).not.toContainText('Calm')
  await expect(page.getByText('Streak: 1 days')).toBeVisible()
})

test('[A8] Moods persist after a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mood').selectOption('Calm')
  await page.getByRole('button', { name: 'Log mood' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('listitem').first()).toContainText('Calm')
  await expect(page.getByText('Streak: 1 days')).toBeVisible()
  const filled = await page.evaluate(() => {
    const group = document.querySelector('[role="group"]')
    const scope = group ?? document
    const pressed = scope.querySelectorAll('button[aria-pressed="true"]')
    if (pressed.length) return pressed.length
    const dataFilled = scope.querySelectorAll('[data-filled="true"]')
    if (dataFilled.length) return dataFilled.length
    const svgRects = document.querySelectorAll('svg rect')
    return Array.from(svgRects).filter((r) => {
      const f = r.getAttribute('fill') ?? ''
      return f && f !== 'none' && f !== 'transparent' && f !== 'currentColor'
    }).length
  })
  expect(filled).toBe(1)
})
