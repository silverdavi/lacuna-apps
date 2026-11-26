# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/debug.spec.ts >> [A5] completing the passage stops the clock and reports WPM and Accuracy
- Location: apps/typing-test/tests/debug.spec.ts:141:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | 
  3   | // The spec's passage. 43 characters, the pangram "The quick brown fox jumps
  4   | // over the lazy dog".
  5   | const PASSAGE = 'The quick brown fox jumps over the lazy dog'
  6   | const PASSAGE_LEN = PASSAGE.length
  7   | 
  8   | // A short, unambiguous slice of the passage, used only to confirm the live
  9   | // test rendered it (it never appears in the final-score state).
  10  | const SENTINEL = 'quick brown fox'
  11  | 
  12  | // The test is a running, live object: a wall clock, a passage, and typed text.
  13  | // Two things about it are not derivable from a person's actions alone, so the
  14  | // tests read them through evaluate after a user action, the way the snake,
  15  | // tetris and paint tests read their board:
  16  | //   1. the per-character coloring (a visual affordance, not an input), and
  17  | //   2. the clock's running value (the app keeps it; no button reads it back).
  18  | // WPM is a function of real elapsed time, so the tests assert on the
  19  | // deterministic parts: Accuracy (a pure function of characters) and the
  20  | // WPM display format, not an exact number.
  21  | 
  22  | // The live typed text as the page renders it.
  23  | function typedText(page: Page) {
  24  |   return page.evaluate(() => {
  25  |     const input = document.querySelector('textarea, input[type="text"]')
  26  |     return input ? (input as HTMLInputElement).value : ''
  27  |   })
  28  | }
  29  | 
  30  | // The passage exactly as rendered in the "Passage" field (the TextInput label
  31  | // is a <label> wrapping the field, so the field's text is its value).
  32  | function passage(page: Page) {
  33  |   return page.evaluate(() => {
  34  |     const field = [...document.querySelectorAll('label')].find((l) => (l.textContent ?? '').includes('Passage'))
  35  |     const box = field ? field.querySelector('textarea, input') : null
  36  |     return (box as HTMLTextAreaElement | HTMLInputElement | null)?.textContent ?? ''
  37  |   })
  38  | }
  39  | 
  40  | // The clock's displayed time, read from the visible "mm:ss" readout. The readout
  41  | // is a status line (a Kpi/MonoLabel div), not an input, so it is found by text.
  42  | function timerText(page: Page) {
  43  |   return page.evaluate(() => {
  44  |     const all = [...document.querySelectorAll('*')].filter(
  45  |       (el) => (el.textContent || '').trim().match(/^\d{1,2}:\d{2}$/) && el.children.length === 0,
  46  |     )
  47  |     return all.length ? (all[all.length - 1].textContent || '').trim() : ''
  48  |   })
  49  | }
  50  | 
  51  | // Seconds shown by the clock, from mm:ss.
  52  | async function timerSeconds(page: Page) {
  53  |   const t = await timerText(page)
  54  |   const [m, s] = t.split(':').map(Number)
  55  |   return m * 60 + s
  56  | }
  57  | 
  58  | // The per-character coloring of the passage. A tone is "green" when its green
  59  | // channel dominates red and blue, "red" when red dominates green and blue, and
  60  | // "grey" when the channels are close. Walks the rendered text nodes under the
  61  | // "Passage" field and reads each one's background.
  62  | function passageTones(page: Page) {
  63  |   return page.evaluate(() => {
  64  |     const field = [...document.querySelectorAll('label')].find((l) => (l.textContent ?? '').includes('Passage'))
  65  |     const root = field ?? document
  66  |     const walker = document.createTreeWalker(root, 1)
  67  |     let n: Node | null = walker.currentNode
  68  |     let green = 0, red = 0, grey = 0, total = 0
  69  |     while (n) {
  70  |       if (n.nodeType === 3 && (n.textContent ?? '').length) {
  71  |         const cs = getComputedStyle(n.parentElement!)
  72  |         const m = cs.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  73  |         const [r, g, b] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [255, 255, 255]
  74  |         if (g > r + 30 && g > b + 30) green++
  75  |         else if (r > g + 30 && r > b + 30) red++
  76  |         else grey++
  77  |         total++
  78  |       }
  79  |       n = walker.nextNode()
  80  |     }
  81  |     return { green, red, grey, total }
  82  |   })
  83  | }
  84  | 
  85  | async function startTest(page: Page) {
> 86  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  87  |   await page.getByRole('button', { name: 'Start Test' }).click()
  88  | }
  89  | 
  90  | // Focus the input the way a person does, so keyboard typing lands in it.
  91  | async function focusInput(page: Page) {
  92  |   const input = page.locator('textarea, input[type="text"]').first()
  93  |   await input.focus()
  94  | }
  95  | 
  96  | // Wait until the test has finished (the score block is up) without a fixed sleep.
  97  | async function waitForCompletion(page: Page) {
  98  |   await page.waitForFunction(
  99  |     () => (document.body.textContent ?? '').includes('WPM:') && (document.body.textContent ?? '').includes('Accuracy:'),
  100 |     { timeout: 30_000 },
  101 |   )
  102 | }
  103 | 
  104 | test('[A1] initial load shows the heading, Start Test, and No test in progress', async ({ page }) => {
  105 |   await page.goto('/')
  106 |   await expect(page.getByRole('heading', { name: 'Typing Test' })).toBeVisible()
  107 |   await expect(page.getByRole('button', { name: 'Start Test' })).toBeVisible()
  108 |   await expect(page.getByText('No test in progress')).toBeVisible()
  109 | })
  110 | 
  111 | test('[A2] Start Test shows the passage, the input, and a 00:00 timer', async ({ page }) => {
  112 |   await startTest(page)
  113 |   await expect(page.getByLabel('Passage')).toBeVisible()
  114 |   expect(await passage(page)).toContain(SENTINEL)
  115 |   await expect(page.getByLabel('Input')).toBeVisible()
  116 |   await expect(page.getByText('00:00')).toBeVisible()
  117 | })
  118 | 
  119 | test('[A3] typing The quick colors the first 9 chars green and the rest grey', async ({ page }) => {
  120 |   await startTest(page)
  121 |   await focusInput(page)
  122 |   await page.keyboard.type('The quick')
  123 |   const tones = await passageTones(page)
  124 |   expect(tones.green).toBe(9)
  125 |   expect(tones.red).toBe(0)
  126 |   expect(tones.grey).toBe(PASSAGE_LEN - 9)
  127 |   expect(tones.total).toBe(PASSAGE_LEN)
  128 | })
  129 | 
  130 | test('[A4] typing The quik colors the first 8 chars red and the rest grey', async ({ page }) => {
  131 |   await startTest(page)
  132 |   await focusInput(page)
  133 |   await page.keyboard.type('The quik')
  134 |   const tones = await passageTones(page)
  135 |   expect(tones.red).toBe(8)
  136 |   expect(tones.green).toBe(0)
  137 |   expect(tones.grey).toBe(PASSAGE_LEN - 8)
  138 |   expect(tones.total).toBe(PASSAGE_LEN)
  139 | })
  140 | 
  141 | test('[A5] completing the passage stops the clock and reports WPM and Accuracy', async ({ page }) => {
  142 |   await startTest(page)
  143 |   await focusInput(page)
  144 |   await page.keyboard.type(PASSAGE)
  145 |   await waitForCompletion(page)
  146 |   // The clock stopped on completion at a positive value.
  147 |   expect(await timerSeconds(page)).toBeGreaterThan(0)
  148 |   // A perfect run reports 100.0% accuracy and a WPM figure.
  149 |   await expect(page.getByText('Accuracy: 100.0%')).toBeVisible()
  150 |   await expect(page.getByText(/WPM: \d+\.\d/)).toBeVisible()
  151 | })
  152 | 
  153 | test('[A6] Restart after a finished run resets the clock, clears the input, and shows a passage', async ({ page }) => {
  154 |   await startTest(page)
  155 |   await focusInput(page)
  156 |   await page.keyboard.type(PASSAGE)
  157 |   await waitForCompletion(page)
  158 |   await expect(page.getByText(/WPM: \d+\.\d/)).toBeVisible()
  159 |   await page.getByRole('button', { name: 'Restart' }).click()
  160 |   // A fresh, live test: empty input, reset clock, a passage on screen.
  161 |   expect(await typedText(page)).toBe('')
  162 |   expect(await timerSeconds(page)).toBe(0)
  163 |   await expect(page.getByLabel('Input')).toBeVisible()
  164 |   await expect(page.getByText('00:00')).toBeVisible()
  165 |   expect(await passage(page)).toContain(SENTINEL)
  166 | })
  167 | 
  168 | test('[A7] a one-typo run reports the spec\'s Accuracy of 95.8%', async ({ page }) => {
  169 |   await startTest(page)
  170 |   await focusInput(page)
  171 |   // One typo: "quikc" for "quick". 43 chars typed, 1 wrong.
  172 |   await page.keyboard.type(PASSAGE.replace('quick', 'quikc'))
  173 |   await waitForCompletion(page)
  174 |   await expect(page.getByText('Accuracy: 95.8%')).toBeVisible()
  175 | })
  176 | 
  177 | test('[A8] Pause freezes the clock and Resume continues it', async ({ page }) => {
  178 |   await startTest(page)
  179 |   await focusInput(page)
  180 |   await page.getByRole('button', { name: 'Pause' }).click()
  181 |   const t = await timerText(page)
  182 |   console.log('DEBUG await timerText =', JSON.stringify(t), typeof t)
  183 |   const paused = await timerSeconds(page)
  184 |   const frozenA = await timerSeconds(page)
  185 |   const frozenB = await timerSeconds(page)
  186 |   expect(frozenA).toBe(paused)
```