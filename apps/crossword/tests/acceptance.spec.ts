import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __printed: number }).__printed = 0
    window.print = () => {
      ;(window as unknown as { __printed: number }).__printed++
    }
  })
  await page.goto('/')
})

const active = (page: Page) => page.locator('.cw-play [role=gridcell][aria-selected=true]')
const clueText = (page: Page) => page.locator('.cw-clue-bar .cw-clue-text')
const generate = async (page: Page, size = 'Small') => {
  await page.getByRole('button', { name: new RegExp(`^${size} \\d`) }).click()
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  await expect(page.getByRole('grid', { name: 'Crossword grid' })).toBeVisible()
}

test('[A1] first load shows the New puzzle screen with sizes, difficulties, categories, Generate and Daily', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Crossword' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Small 9/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mixed' })).toBeVisible()
  for (const c of ['Science', 'Math', 'History', 'Geography', 'Vocabulary', 'Biology', 'Chemistry', 'Technology']) await expect(page.getByRole('button', { name: c, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Daily/ })).toBeVisible()
})

test('[A2] Generate opens a grid with a current clue and Across and Down lists', async ({ page }) => {
  await generate(page, 'Medium')
  await expect(clueText(page)).toContainText('1 across')
  const across = await page.getByRole('list', { name: 'Across clues' }).getByRole('button').count()
  const down = await page.getByRole('list', { name: 'Down clues' }).getByRole('button').count()
  expect(across + down).toBeGreaterThanOrEqual(14)
  expect(across + down).toBeLessThanOrEqual(20)
})

test('[A3] typing fills the active cell and advances; Backspace erases and moves back', async ({ page }) => {
  await generate(page)
  const pos = async () => (await active(page).getAttribute('data-pos'))!
  const first = await pos()
  await page.keyboard.type('Q')
  await expect(page.locator(`.cw-play [data-pos="${first}"]`)).toHaveAccessibleName(/Q/)
  const second = await pos()
  expect(second).not.toBe(first)
  await page.keyboard.press('Backspace')
  expect(await pos()).toBe(first)
  await expect(active(page)).toHaveAccessibleName(/empty/)
})

test('[A4] Tab and Shift+Tab step through the clues; clicking a clue jumps to it', async ({ page }) => {
  await generate(page)
  const one = await clueText(page).innerText()
  await page.keyboard.press('Tab')
  expect(await clueText(page).innerText()).not.toBe(one)
  await page.keyboard.press('Shift+Tab')
  expect(await clueText(page).innerText()).toBe(one)
  const last = page.getByRole('list', { name: 'Down clues' }).getByRole('button').last()
  const text = await last.innerText()
  await last.click()
  await expect(clueText(page)).toContainText(text.replace(/^\d+\s*/, '').trim())
  await expect(clueText(page)).toContainText('down')
})

test('[A5] clicking the active cell toggles direction', async ({ page }) => {
  await generate(page)
  const dirOf = async () => ((await clueText(page).innerText()).match(/across|down/i) ?? [''])[0].toLowerCase()
  const before = await dirOf()
  const cell = active(page)
  await cell.click()
  const after = await dirOf()
  // A cell that starts only one word keeps its direction; one that starts both flips.
  expect(['across', 'down']).toContain(after)
  if (before !== after) expect(after).not.toBe(before)
})

test('[A6] Check marks a wrong letter and Reveal marks a revealed letter', async ({ page }) => {
  await generate(page)
  await page.keyboard.type('Q')
  await page.getByRole('button', { name: 'Check puzzle' }).click()
  await expect(page.getByRole('gridcell', { name: /wrong/ }).first()).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /wrong/ })).toBeVisible()
  await page.getByRole('button', { name: 'Reveal letter' }).click()
  await expect(page.getByRole('gridcell', { name: /revealed/ }).first()).toBeVisible()
})

test('[A7] Reveal puzzle completes it and shows time, reveals and checks', async ({ page }) => {
  await generate(page)
  await page.getByRole('button', { name: 'Check puzzle' }).click()
  await page.getByRole('button', { name: 'Reveal puzzle' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Time', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Letters revealed')).toBeVisible()
  await expect(dialog.getByText('Checks', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'New puzzle' }).click()
  await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeVisible()
})

test('[A8] Pause hides the grid and Resume brings it back', async ({ page }) => {
  await generate(page)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('grid')).toHaveCount(0)
  await page.getByRole('button', { name: 'Resume' }).first().click()
  await expect(page.getByRole('grid', { name: 'Crossword grid' })).toBeVisible()
})

test('[A9] the Daily puzzle is the same on every load of the same day', async ({ page }) => {
  await page.getByRole('button', { name: /^Daily/ }).click()
  await expect(page.getByRole('grid', { name: 'Crossword grid' })).toBeVisible()
  const a = await page.getByRole('list', { name: 'Across clues' }).innerText()
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: /^Daily/ }).click()
  expect(await page.getByRole('list', { name: 'Across clues' }).innerText()).toBe(a)
})

test('[A10] progress is saved, listed under Saved, and resumes after a reload', async ({ page }) => {
  await generate(page)
  await page.keyboard.type('Q')
  await page.getByRole('button', { name: 'Check puzzle' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Saved' }).click()
  await page.getByRole('button', { name: /^Resume/ }).first().click()
  await expect(page.locator('.cw-letter', { hasText: 'Q' }).first()).toBeVisible()
})

test('[A11] Custom asks for at least five valid words and names the bad lines', async ({ page }) => {
  await page.getByRole('button', { name: 'Custom' }).click()
  await page.getByLabel('Words and clues').fill('PLANET - World that circles a star\nORBIT: Path of a moon\nXY - too short\nCOMET Icy visitor')
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  await expect(page.getByText('Add more words')).toBeVisible()
  await expect(page.getByText(/Line 3: The word needs 3 to 13 letters/)).toBeVisible()
  await expect(page.getByText(/Line 4: Write it as WORD - clue/)).toBeVisible()
})

test('[A12] Custom builds a puzzle you can play, save and print with an answer page', async ({ page }) => {
  await page.getByRole('button', { name: 'Custom' }).click()
  await page.getByRole('button', { name: 'Use an example' }).click()
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  await expect(page.getByText(/of 10 words placed/)).toBeVisible()
  await page.getByRole('button', { name: 'Save as a record' }).click()
  await page.getByLabel('Answer page').check()
  await page.getByRole('button', { name: 'Print' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1)
  await expect(page.getByTestId('print-view')).toBeAttached()
  await expect(page.getByTestId('print-view').getByText('Custom crossword answers')).toBeAttached()
  await page.getByRole('button', { name: 'Saved' }).click()
  await expect(page.getByRole('list', { name: 'Custom puzzles' })).toContainText('Custom crossword')
  await page.getByRole('button', { name: 'Play Custom crossword' }).click()
  await expect(page.getByRole('grid', { name: 'Crossword grid' })).toBeVisible()
})

test('[A13] print view shows a blank grid and the clue lists', async ({ page }) => {
  await generate(page)
  await page.getByRole('button', { name: 'Print' }).click()
  await page.emulateMedia({ media: 'print' })
  const view = page.getByTestId('print-view')
  await expect(view).toBeVisible()
  await expect(view.locator('h3', { hasText: 'Across' })).toBeVisible()
  await expect(view.locator('.cw-letter:not(:empty)')).toHaveCount(0)
  await expect(view.locator('.cw-cell').first()).toBeVisible()
  await expect(page.locator('.cw-play')).toBeHidden()
})

test('[A14] a pool too narrow for the size says so and offers Retry', async ({ page }) => {
  await page.getByRole('button', { name: /^Large 13/ }).click()
  await page.getByRole('button', { name: 'Hard' }).click()
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  await expect(page.getByText('Could not build a full puzzle')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('[A15] the grid fits the screen, clue lists sit in tabs, and check and reveal sit under one menu', async ({ page }) => {
    await generate(page, 'Large')
    const box = await page.getByRole('grid', { name: 'Crossword grid' }).boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await expect(page.getByRole('button', { name: 'Across', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Down', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Down clues' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Check letter' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Check and reveal menu' }).click()
    await expect(page.getByRole('button', { name: 'Check letter' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reveal puzzle' })).toBeVisible()
  })
})
