import { expect, test, type Page } from '@playwright/test'

// Parses a question like "3 + 4 =" into [3, 4].
function parseQuestion(text: string): [number, number] {
  const m = text.match(/^(\d+)\s*\+\s*(\d+)\s*=/)
  if (!m) throw new Error(`question text does not look like an addition problem: ${text}`)
  return [Number(m[1]), Number(m[2])]
}

// The 5 generated question lines, in display order.
const questionLines = (page: Page) => page.locator('li, [role="listitem"]').filter({ hasText: /^\d+\s*\+\s*\d+\s*=/ })

// The 5 generated question texts, in display order.
async function questionTexts(page: Page): Promise<string[]> {
  const lines = questionLines(page)
  expect(await lines.count()).toBe(5)
  const texts: string[] = []
  for (let i = 0; i < 5; i++) texts.push((await lines.nth(i).innerText()).trim())
  for (const t of texts) expect(t).toMatch(/^\d+\s*\+\s*\d+\s*=$/)
  return texts
}

async function generateAdditionFive(page: Page) {
  await page.goto('/')
  await page.getByLabel('Operations').selectOption({ label: 'Addition' })
  await page.getByLabel('Count').fill('5')
  await page.getByRole('button', { name: 'Generate' }).click()
}

// Answers all 5 Study questions; each answer is the correct sum unless the
// corresponding entry in wrongs is true.
async function answerStudy(page: Page, wrongs: boolean[]) {
  await generateAdditionFive(page)
  await page.getByRole('tab', { name: 'Study' }).click()
  const texts = await questionTexts(page)
  for (let i = 0; i < 5; i++) {
    const [a, b] = parseQuestion(texts[i])
    await page.getByLabel('Answer').first().fill(String(a + b + (wrongs[i] ? 1 : 0)))
    await page.getByRole('button', { name: 'Check' }).click()
    await expect(
      page.getByText(wrongs[i] ? 'Incorrect' : 'Correct', { exact: true }).first(),
    ).toBeVisible()
  }
}

test('[A1] the page heading is Math Practice', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Math Practice' })).toBeVisible()
})

test('[A2] generating 5 Addition questions lists 5 problems of the form N + N =', async ({ page }) => {
  await generateAdditionFive(page)
  const texts = await questionTexts(page)
  expect(texts).toHaveLength(5)
  for (const t of texts) expect(t).toMatch(/^\d+\s*\+\s*\d+\s*=$/)
})

test('[A3] Print Sheet opens a print view containing the heading and all 5 questions', async ({ page }) => {
  await generateAdditionFive(page)
  const texts = await questionTexts(page)
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Print Sheet' }).click(),
  ])
  await popup.waitForLoadState('domcontentloaded')
  const body = await popup.locator('body').innerText()
  expect(body).toContain('Math Practice')
  for (const t of texts) expect(body).toContain(t)
})

test('[A4] answering the first question in Study shows Correct when the answer is the sum', async ({ page }) => {
  await generateAdditionFive(page)
  await page.getByRole('tab', { name: 'Study' }).click()
  const [first] = await questionTexts(page)
  const [a, b] = parseQuestion(first)
  await expect(page.getByLabel('Answer').first()).toBeVisible()
  await page.getByLabel('Answer').first().fill(String(a + b))
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText('Correct', { exact: true }).first()).toBeVisible()
})

test('[A4] answering the first question in Study shows Incorrect when the answer is not the sum', async ({ page }) => {
  await generateAdditionFive(page)
  await page.getByRole('tab', { name: 'Study' }).click()
  const [first] = await questionTexts(page)
  const [a, b] = parseQuestion(first)
  await page.getByLabel('Answer').first().fill(String(a + b + 1))
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText('Incorrect', { exact: true }).first()).toBeVisible()
})

test('[A5] after all 5 answers the Results tab shows a table with each question, answer and status', async ({ page }) => {
  await answerStudy(page, [false, false, false, false, false])
  await page.getByRole('tab', { name: 'Results' }).click()
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  const rows = table.getByRole('row')
  const dataRows = rows.filter({ has: page.getByRole('cell') })
  expect(await dataRows.count()).toBeGreaterThanOrEqual(5)
  const texts = await questionTexts(page)
  const sums = texts.map((t) => {
    const [a, b] = parseQuestion(t)
    return String(a + b)
  })
  for (let i = 0; i < 5; i++) {
    const row = dataRows.nth(i)
    await expect(row).toContainText(texts[i])
    await expect(row).toContainText(sums[i])
    await expect(row).toContainText('Correct')
  }
})

test('[A6] the Results summary line displays the score of the completed session', async ({ page }) => {
  await answerStudy(page, [false, false, false, true, true])
  await page.getByRole('tab', { name: 'Results' }).click()
  await expect(page.getByText('Score: 3/5')).toBeVisible()
})

test('[A7] completing a session adds a history entry; its Delete button removes it', async ({ page }) => {
  await answerStudy(page, [false, false, false, false, false])
  await page.getByRole('tab', { name: 'History' }).click()
  const entry = page.locator('li, tr, [role="listitem"], [role="row"]').filter({ hasText: '5/5' }).first()
  await expect(entry).toBeVisible()
  await entry.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('li, tr, [role="listitem"], [role="row"]').filter({ hasText: '5/5' })).toHaveCount(0)
})

test('[A8] Easy keeps operands at 10 or below; Hard makes them greater than 20', async ({ page }) => {
  await generateAdditionFive(page)
  const easy = (await questionTexts(page)).map((t) => parseQuestion(t))
  for (const [a, b] of easy) {
    expect(a).toBeLessThanOrEqual(10)
    expect(b).toBeLessThanOrEqual(10)
  }
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByLabel('Difficulty').selectOption({ label: 'Hard' })
  await page.getByRole('button', { name: 'Generate' }).click()
  const hard = (await questionTexts(page)).map((t) => parseQuestion(t))
  for (const [a, b] of hard) {
    expect(a).toBeGreaterThan(20)
    expect(b).toBeGreaterThan(20)
  }
})

test('[A9] reload keeps the history entry with its exact score and date', async ({ page }) => {
  await answerStudy(page, [false, false, false, false, false])
  await page.getByRole('tab', { name: 'History' }).click()
  const before = page.locator('li, tr, [role="listitem"], [role="row"]').filter({ hasText: '5/5' }).first()
  await expect(before).toBeVisible()
  const text = (await before.innerText()).trim()
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText(text)).toBeVisible()
})
