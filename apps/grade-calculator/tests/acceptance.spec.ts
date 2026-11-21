import { expect, test, type Page } from '@playwright/test'

// A8: the spec says the total row carries the text "Total" and "100%" "in the
// weight column". The weighted-grade column also holds "89.20%" for this
// fixture, so "100%" is the discriminator. No other spec check contradicts it,
// so the literal reading (total row shows 100%) is the one tested here.
function midtermRow(page: Page) {
  return page.getByRole('row', { name: /Midterm/ })
}

function finalRow(page: Page) {
  return page.getByRole('row', { name: /Final Exam/ })
}

function quizRow(page: Page) {
  return page.getByRole('row', { name: /Quiz/ })
}

async function add(page: Page, name: string, score: string, weight: string) {
  await page.getByLabel('Component Name').fill(name)
  await page.getByLabel('Score').fill(score)
  await page.getByLabel('Weight').fill(weight)
  await page.getByRole('button', { name: 'Add component' }).click()
}

test('[A1] empty app shows heading, No components yet, and Weighted Grade: 0.00%', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Grade Calculator' })).toBeVisible()
  await expect(page.getByText('No components yet')).toBeVisible()
  await expect(page.getByText('Weighted Grade: 0.00%')).toBeVisible()
})

test('[A2] adding Midterm 85 @ 40% adds the row and the summary reads 34.00%', async ({ page }) => {
  await page.goto('/')
  await add(page, 'Midterm', '85', '40')
  const row = midtermRow(page)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Midterm')
  await expect(row).toContainText('85.00')
  await expect(row).toContainText('40%')
  await expect(row).toContainText('34.00')
  await expect(page.getByText('No components yet')).toHaveCount(0)
  await expect(page.getByText('Weighted Grade: 34.00%')).toBeVisible()
})

test('[A3] adding Final Exam 92 @ 60% adds the row and the summary reads 89.20%', async ({ page }) => {
  await page.goto('/')
  await add(page, 'Midterm', '85', '40')
  await add(page, 'Final Exam', '92', '60')
  const row = finalRow(page)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Final Exam')
  await expect(row).toContainText('92.00')
  await expect(row).toContainText('60%')
  await expect(row).toContainText('55.20')
  await expect(page.getByText('Weighted Grade: 89.20%')).toBeVisible()
})

test('[A4] invalid inputs are rejected with the message and no row is added', async ({ page }) => {
  await page.goto('/')
  const invalid: Array<[string, string, string]> = [
    ['', '85', '40'],
    ['Midterm', '', '40'],
    ['Midterm', '-5', '40'],
    ['Midterm', '101', '40'],
  ]
  for (const [name, score, weight] of invalid) {
    await page.getByLabel('Component Name').fill(name)
    await page.getByLabel('Score').fill(score)
    await page.getByLabel('Weight').fill(weight)
    await page.getByRole('button', { name: 'Add component' }).click()
    await expect(page.getByText('Enter a name and a score between 0 and 100')).toBeVisible()
  }
  await expect(page.getByRole('table')).toHaveCount(0)
  await expect(page.getByText('No components yet')).toBeVisible()
  await expect(page.getByText('Weighted Grade: 0.00%')).toBeVisible()
})

test('[A5] every row has a Delete <name> button; deleting Final Exam leaves 34.00%', async ({ page }) => {
  await page.goto('/')
  await add(page, 'Midterm', '85', '40')
  await add(page, 'Final Exam', '92', '60')
  await expect(page.getByRole('button', { name: 'Delete Midterm' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete Final Exam' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Final Exam' }).click()
  await expect(finalRow(page)).toHaveCount(0)
  await expect(page.getByText('Weighted Grade: 34.00%')).toBeVisible()
})

test('[A6] weights that do not sum to 100 still compute, with the warning shown', async ({ page }) => {
  await page.goto('/')
  await add(page, 'Quiz', '100', '10')
  const row = quizRow(page)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Quiz')
  await expect(row).toContainText('100.00')
  await expect(row).toContainText('10%')
  await expect(page.getByText('Weighted Grade: 10.00%')).toBeVisible()
  await expect(page.getByText('Weights sum to 10%')).toBeVisible()
})

test('[A7] a non-numeric score shows "Score must be a number" on blur and adds no row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Component Name').fill('Quiz')
  await page.getByLabel('Score').fill('abc')
  await page.getByLabel('Score').press('Tab')
  await expect(page.getByText('Score must be a number')).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
  await expect(page.getByText('No components yet')).toBeVisible()
  await expect(page.getByText('Weighted Grade: 0.00%')).toBeVisible()
})

test('[A8] the breakdown table has a total row with "Total" and "100%" in the weight column', async ({ page }) => {
  await page.goto('/')
  await add(page, 'Midterm', '85', '40')
  await add(page, 'Final Exam', '92', '60')
  const total = page.getByRole('row', { name: /Total/ })
  await expect(total).toBeVisible()
  await expect(total).toContainText('Total')
  await expect(total).toContainText('100%')
})

test('[A9] the component list survives a reload', async ({ page }) => {
  await page.goto('/')
  await add(page, 'Midterm', '85', '40')
  await page.reload()
  const row = midtermRow(page)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Midterm')
  await expect(row).toContainText('85.00')
  await expect(row).toContainText('40%')
  await expect(page.getByText('Weighted Grade: 34.00%')).toBeVisible()
})
