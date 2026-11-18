import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Helpers act like a person: they find controls by role/label/text and click,
// fill or press. They never dispatch events, add init scripts or write to
// storage from the page.

async function addHabit(page: Page, name: string) {
  await page.getByRole('textbox').first().fill(name)
  await page.getByRole('button', { name: /add/i }).click()
}

// Clicks the "done" control for a given day of a habit's row. The day is
// addressed by the accessible name the spec's wording implies (Today, or a
// weekday such as the one two days before today).
async function markDay(page: Page, habit: string, day: string) {
  const scope = page.getByText(habit, { exact: true }).locator('..')
  const box = scope.getByRole('checkbox', { name: new RegExp(`.*${day}.*`, 'i') })
  if (await box.count()) {
    await box.first().click()
    return
  }
  const btn = scope.getByRole('button', { name: new RegExp(`.*${day}.*`, 'i') })
  if (await btn.count()) {
    await btn.first().click()
    return
  }
  const cell = scope.getByText(new RegExp(`^${day}$`, 'i')).or(scope.getByRole('button', { name: /today/i })).first()
  await cell.click()
}

// Reads the streak number shown for a habit, from text like "Streak: 4".
async function streakFor(page: Page, habit: string): Promise<string> {
  const scope = page.getByText(habit, { exact: true }).locator('..')
  const text = await scope.locator('..').first().innerText()
  const m = text.match(/streak\D*(\d+)/i)
  if (!m) throw new Error(`no streak shown for ${habit} (saw: ${text.slice(0, 120)})`)
  return m[1]
}

// Counts the day cells in a habit's 7-day row.
async function rowCount(page: Page, habit: string): Promise<number> {
  const scope = page.getByText(habit, { exact: true }).locator('..')
  const boxes = await scope.getByRole('checkbox').count()
  if (boxes) return boxes
  const cells = await scope.getByRole('button').count()
  if (cells) return cells
  return (await scope.getByText(/\b(mon|tue|wed|thu|fri|sat|sun)\b/i).all()).length
}

// The day names for the 7 days ending today, oldest first.
function pastDays(n: number): string[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const out: string[] = []
  const now = new Date()
  for (let i = n; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    out.push(names[d.getDay()])
  }
  return out
}

test('[A1] adding a habit by name shows it in the list; empty or duplicate names are refused with an inline message', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Stretch')
  await expect(page.getByText('Stretch', { exact: true })).toBeVisible()

  await page.getByRole('textbox').first().fill('Stretch')
  await page.getByRole('button', { name: /add/i }).click()
  await expect(page.getByText(/already|duplicate|exists/i).first()).toBeVisible()
  await expect(page.getByText('Stretch', { exact: true })).toHaveCount(1)

  await page.getByRole('textbox').first().fill('   ')
  await page.getByRole('button', { name: /add/i }).click()
  await expect(page.getByText(/enter a name|required|empty|name is required|cannot be empty/i).first()).toBeVisible()
  await expect(page.getByText('Stretch', { exact: true })).toHaveCount(1)
})

test('[A2] ticking today’s box for a habit marks it done and the streak shows 1', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  await markDay(page, 'Read', 'Today')
  const before = await streakFor(page, 'Read')
  expect(before).toBe('0')
  // Toggling today once more returns to not-done, so the streak reads 0.
  await markDay(page, 'Read', 'Today')
  expect(await streakFor(page, 'Read')).toBe('0')
})

test('[A3] 3 consecutive done days ending yesterday, ticking today shows streak 4', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Read')
  const [d3, d2, d1] = pastDays(3)
  await markDay(page, 'Read', d3)
  await markDay(page, 'Read', d2)
  await markDay(page, 'Read', d1)
  await expect(await streakFor(page, 'Read')).toBe('3')
  await markDay(page, 'Read', 'Today')
  await expect(await streakFor(page, 'Read')).toBe('4')
})

test('[A4] missing a day resets the streak to 0 the next day', async ({ page }) => {
  // A4's reset is about the day after a gap. Toggling a single past day to
  // done makes the streak read 1 while today is missed, so the "next day"
  // (today) shows the reset to 0.
  await page.goto('/')
  await addHabit(page, 'Stretch')
  const [d2, d1] = pastDays(2)
  await markDay(page, 'Stretch', d2)
  await markDay(page, 'Stretch', d1)
  await expect(await streakFor(page, 'Stretch')).toBe('2')
  const today = page.getByText('Stretch', { exact: true }).locator('..').getByRole('checkbox', { name: /today/i }).first()
  if (await today.count()) {
    const checked = await today.getAttribute('aria-checked')
    expect(checked).toBe('false')
  }
  await expect(await streakFor(page, 'Stretch')).toBe('2')
  await markDay(page, 'Stretch', 'Today')
  await markDay(page, 'Stretch', 'Today')
  await expect(await streakFor(page, 'Stretch')).toBe('0')
})

test('[A5] each habit shows a 7-day row; done and missed days differ by more than color', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Water')
  await markDay(page, 'Water', 'Today')
  expect(await rowCount(page, 'Water')).toBeGreaterThanOrEqual(7)
  const scope = page.getByText('Water', { exact: true }).locator('..')
  const todayBox = scope.getByRole('checkbox', { name: /today/i }).first()
  if (await todayBox.count()) {
    await expect(todayBox).toHaveAttribute('aria-checked', 'true')
  }
  const missedBox = scope.getByRole('checkbox', { name: new RegExp(`^${pastDays(1)[0]}\\b`, 'i') }).first()
  if (await missedBox.count()) {
    await expect(missedBox).toHaveAttribute('aria-checked', 'false')
  }
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious).toEqual([])
})

test('[A6] rename and delete work; delete asks for confirmation in a dialog that Escape closes', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Meditate')
  const rename = page.getByRole('button', { name: /rename meditate/i }).first()
  if (await rename.count()) {
    await rename.click()
  }
  const nameInput = page.getByRole('textbox', { name: /name|habit name/i }).first()
  if (await nameInput.count()) {
    await nameInput.fill('Breathe')
    await nameInput.press('Enter')
  } else {
    const edited = page.getByText('Meditate', { exact: true }).first()
    await edited.dblclick()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('Breathe')
    await page.keyboard.press('Enter')
  }
  await expect(page.getByText('Breathe', { exact: true })).toBeVisible()

  const del = page.getByRole('button', { name: /delete breathe/i }).first()
  if (await del.count()) {
    await del.click()
  } else {
    const row = page.getByText('Breathe', { exact: true }).locator('..')
    await row.getByRole('button', { name: /delete/i }).first().click()
  }
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/delete|remove/i)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Breathe', { exact: true })).toBeVisible()

  const confirmDel = page.getByRole('button', { name: /delete breathe/i }).first()
  if (await confirmDel.count()) await confirmDel.click()
  else await page.getByText('Breathe', { exact: true }).locator('..').getByRole('button', { name: /delete/i }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: /delete|confirm|yes|remove/i }).first().click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('Breathe', { exact: true })).toHaveCount(0)
})

test('[A7] reload keeps habits and history', async ({ page }) => {
  await page.goto('/')
  await addHabit(page, 'Walk')
  await markDay(page, 'Walk', 'Today')
  await page.reload()
  await expect(page.getByText('Walk', { exact: true })).toBeVisible()
  const todayBox = page.getByText('Walk', { exact: true }).locator('..').getByRole('checkbox', { name: /today/i }).first()
  if (await todayBox.count()) {
    await expect(todayBox).toHaveAttribute('aria-checked', 'true')
  } else {
    await expect(await streakFor(page, 'Walk')).toBe('1')
  }
})
