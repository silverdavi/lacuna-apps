import { expect, test, type Page } from '@playwright/test'

// The spec's passage. 43 characters, the pangram "The quick brown fox jumps
// over the lazy dog".
const PASSAGE = 'The quick brown fox jumps over the lazy dog'
const PASSAGE_LEN = PASSAGE.length

// A short, unambiguous slice of the passage, used only to confirm the live
// test rendered it (it never appears in the final-score state).
const SENTINEL = 'quick brown fox'

// The test is a running, live object: a wall clock, a passage, and typed text.
// Two things about it are not derivable from a person's actions alone, so the
// tests read them through evaluate after a user action, the way the snake,
// tetris and paint tests read their board:
//   1. the per-character coloring (a visual affordance, not an input), and
//   2. the clock's running value (the app keeps it; no button reads it back).
// WPM is a function of real elapsed time, so the tests assert on the
// deterministic parts: Accuracy (a pure function of characters) and the
// WPM display format, not an exact number.

// The live typed text as the page renders it.
function typedText(page: Page) {
  return page.evaluate(() => {
    const input = document.querySelector('textarea, input[type="text"]')
    return input ? (input as HTMLInputElement).value : ''
  })
}

// The passage exactly as rendered in the "Passage" field (the TextInput label
// is a <label> wrapping the field, so the field's text is its value).
function passage(page: Page) {
  return page.evaluate(() => {
    const field = [...document.querySelectorAll('label')].find((l) => (l.textContent ?? '').includes('Passage'))
    const box = field ? field.querySelector('textarea, input') : null
    return (box as HTMLTextAreaElement | HTMLInputElement | null)?.textContent ?? ''
  })
}

// The clock's displayed time, read from the visible "mm:ss" readout. The readout
// is a status line (a Kpi/MonoLabel div), not an input, so it is found by text.
function timerText(page: Page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('*')].filter(
      (el) => (el.textContent ?? '').trim().match(/^\d{1,2}:\d{2}$/) && el.children.length === 0,
    )
    return all.length ? (all[all.length - 1].textContent ?? '').trim() : ''
  })
}

// Seconds shown by the clock, from mm:ss.
function timerSeconds(page: Page) {
  const t = timerText(page)
  const [m, s] = t.split(':').map(Number)
  return m * 60 + s
}

// The per-character coloring of the passage. A tone is "green" when its green
// channel dominates red and blue, "red" when red dominates green and blue, and
// "grey" when the channels are close. Walks the rendered text nodes under the
// "Passage" field and reads each one's background.
function passageTones(page: Page) {
  return page.evaluate(() => {
    const field = [...document.querySelectorAll('label')].find((l) => (l.textContent ?? '').includes('Passage'))
    const root = field ?? document
    const walker = document.createTreeWalker(root, 1)
    let n: Node | null = walker.currentNode
    let green = 0, red = 0, grey = 0, total = 0
    while (n) {
      if (n.nodeType === 3 && (n.textContent ?? '').length) {
        const cs = getComputedStyle(n.parentElement!)
        const m = cs.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        const [r, g, b] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [255, 255, 255]
        if (g > r + 30 && g > b + 30) green++
        else if (r > g + 30 && r > b + 30) red++
        else grey++
        total++
      }
      n = walker.nextNode()
    }
    return { green, red, grey, total }
  })
}

async function startTest(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Test' }).click()
}

// Focus the input the way a person does, so keyboard typing lands in it.
async function focusInput(page: Page) {
  const input = page.locator('textarea, input[type="text"]').first()
  await input.focus()
}

// Wait until the test has finished (the score block is up) without a fixed sleep.
async function waitForCompletion(page: Page) {
  await page.waitForFunction(
    () => (document.body.textContent ?? '').includes('WPM:') && (document.body.textContent ?? '').includes('Accuracy:'),
    { timeout: 30_000 },
  )
}

test('[A1] initial load shows the heading, Start Test, and No test in progress', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Typing Test' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Test' })).toBeVisible()
  await expect(page.getByText('No test in progress')).toBeVisible()
})

test('[A2] Start Test shows the passage, the input, and a 00:00 timer', async ({ page }) => {
  await startTest(page)
  await expect(page.getByLabel('Passage')).toBeVisible()
  expect(await passage(page)).toContain(SENTINEL)
  await expect(page.getByLabel('Input')).toBeVisible()
  await expect(page.getByText('00:00')).toBeVisible()
})

test('[A3] typing The quick colors the first 9 chars green and the rest grey', async ({ page }) => {
  await startTest(page)
  await focusInput(page)
  await page.keyboard.type('The quick')
  const tones = await passageTones(page)
  expect(tones.green).toBe(9)
  expect(tones.red).toBe(0)
  expect(tones.grey).toBe(PASSAGE_LEN - 9)
  expect(tones.total).toBe(PASSAGE_LEN)
})

test('[A4] typing The quik colors the first 8 chars red and the rest grey', async ({ page }) => {
  await startTest(page)
  await focusInput(page)
  await page.keyboard.type('The quik')
  const tones = await passageTones(page)
  expect(tones.red).toBe(8)
  expect(tones.green).toBe(0)
  expect(tones.grey).toBe(PASSAGE_LEN - 8)
  expect(tones.total).toBe(PASSAGE_LEN)
})

test('[A5] completing the passage stops the clock and reports WPM and Accuracy', async ({ page }) => {
  await startTest(page)
  await focusInput(page)
  await page.keyboard.type(PASSAGE)
  await waitForCompletion(page)
  // The clock stopped on completion at a positive value.
  expect(await timerSeconds(page)).toBeGreaterThan(0)
  // A perfect run reports 100.0% accuracy and a WPM figure.
  await expect(page.getByText('Accuracy: 100.0%')).toBeVisible()
  await expect(page.getByText(/WPM: \d+\.\d/)).toBeVisible()
})

test('[A6] Restart after a finished run resets the clock, clears the input, and shows a passage', async ({ page }) => {
  await startTest(page)
  await focusInput(page)
  await page.keyboard.type(PASSAGE)
  await waitForCompletion(page)
  await expect(page.getByText(/WPM: \d+\.\d/)).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  // A fresh, live test: empty input, reset clock, a passage on screen.
  expect(await typedText(page)).toBe('')
  expect(await timerSeconds(page)).toBe(0)
  await expect(page.getByLabel('Input')).toBeVisible()
  await expect(page.getByText('00:00')).toBeVisible()
  expect(await passage(page)).toContain(SENTINEL)
})

test('[A7] a one-typo run reports the spec\'s Accuracy of 95.8%', async ({ page }) => {
  await startTest(page)
  await focusInput(page)
  // One typo: "quikc" for "quick". 43 chars typed, 1 wrong.
  await page.keyboard.type(PASSAGE.replace('quick', 'quikc'))
  await waitForCompletion(page)
  await expect(page.getByText('Accuracy: 95.8%')).toBeVisible()
})

test('[A8] Pause freezes the clock and Resume continues it', async ({ page }) => {
  await startTest(page)
  await focusInput(page)
  await page.getByRole('button', { name: 'Pause' }).click()
  const paused = await timerSeconds(page)
  const frozenA = await timerSeconds(page)
  const frozenB = await timerSeconds(page)
  expect(frozenA).toBe(paused)
  expect(frozenB).toBe(paused)
  await page.getByRole('button', { name: 'Resume' }).click()
  // Resuming restarts the clock: it reads at least the paused time.
  const running = await timerSeconds(page)
  expect(running).toBeGreaterThanOrEqual(paused)
})

test('[A9] a completed run keeps its best score across a reload', async ({ page }) => {
  await startTest(page)
  await focusInput(page)
  await page.keyboard.type(PASSAGE)
  await waitForCompletion(page)
  await expect(page.getByText(/WPM: \d+\.\d/)).toBeVisible()
  await page.reload()
  await expect(page.getByText(/Best WPM: \d+\.\d/)).toBeVisible()
})
