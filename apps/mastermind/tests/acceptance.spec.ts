import { expect, test, type Page } from '@playwright/test'

function selectRow(page: Page, row: number, colors: string[]) {
  return Promise.all(colors.map((c, i) => page.getByLabel(`Peg ${i + 1} row ${row}`, { exact: true }).selectOption(c)))
}

test('[A1] initial screen shows heading, Seed field, buttons and Best score: 0', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Mastermind Game' })).toBeVisible()
  await expect(page.getByLabel('Seed')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Redo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy result' })).toBeVisible()
  await expect(page.getByText('Best score: 0')).toBeVisible()
})

test('[A2] New game with seed 1 shows four empty rows and Guesses: 0', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('1')
  await page.getByRole('button', { name: 'New game' }).click()
  for (let row = 1; row <= 4; row++) {
    for (let p = 1; p <= 4; p++) {
      const value = await page.getByLabel(`Peg ${p} row ${row}`, { exact: true }).inputValue()
      expect(value, `peg ${p} row ${row} is empty`).toBe('')
    }
  }
  await expect(page.getByText('Guesses: 0')).toBeVisible()
})

test('[A3] seed 1 row 1 all Red submits 1 exact, 0 partial and Guesses: 1', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('1')
  await page.getByRole('button', { name: 'New game' }).click()
  await selectRow(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await expect(page.getByText('1 exact, 0 partial')).toBeVisible()
  await expect(page.getByText('Guesses: 1')).toBeVisible()
})

test('[A4] seed 1 row 2 Red Blue Green Yellow wins in 2 guesses', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('1')
  await page.getByRole('button', { name: 'New game' }).click()
  await selectRow(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await selectRow(page, 2, ['Red', 'Blue', 'Green', 'Yellow'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await expect(page.getByText('4 exact, 0 partial')).toBeVisible()
  await expect(page.getByText('You win in 2 guesses')).toBeVisible()
})

test('[A5] Copy result after winning shows toast and copies the result to the clipboard', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Seed').fill('1')
  await page.getByRole('button', { name: 'New game' }).click()
  await selectRow(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await selectRow(page, 2, ['Red', 'Blue', 'Green', 'Yellow'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Result copied')).toBeVisible()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('Seed 1: Red, Blue, Green, Yellow - 2 guesses')
})

test('[A6] winning seed 1 then New game with seed 2 resets the board and shows Best score: 2', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('1')
  await page.getByRole('button', { name: 'New game' }).click()
  await selectRow(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await selectRow(page, 2, ['Red', 'Blue', 'Green', 'Yellow'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await page.getByLabel('Seed').fill('2')
  await page.getByRole('button', { name: 'New game' }).click()
  for (let row = 1; row <= 4; row++) {
    for (let p = 1; p <= 4; p++) {
      const value = await page.getByLabel(`Peg ${p} row ${row}`, { exact: true }).inputValue()
      expect(value, `peg ${p} row ${row} is empty`).toBe('')
    }
  }
  await expect(page.getByText('Guesses: 0')).toBeVisible()
  await expect(page.getByText('Best score: 2')).toBeVisible()
})

test('[A7] seed 1 row 1 Blue Red Yellow Green submits 0 exact, 4 partial', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('1')
  await page.getByRole('button', { name: 'New game' }).click()
  await selectRow(page, 1, ['Blue', 'Red', 'Yellow', 'Green'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await expect(page.getByText('0 exact, 4 partial')).toBeVisible()
  await expect(page.getByText('Guesses: 1')).toBeVisible()
})

test('[A8] Undo clears the guess and Redo restores it', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('1')
  await page.getByRole('button', { name: 'New game' }).click()
  await selectRow(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await page.getByRole('button', { name: 'Undo' }).click()
  for (let p = 1; p <= 4; p++) {
    const value = await page.getByLabel(`Peg ${p} row 1`, { exact: true }).inputValue()
    expect(value, `peg ${p} row 1 is empty`).toBe('')
  }
  await expect(page.getByText('Guesses: 0')).toBeVisible()
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByText('Guesses: 1')).toBeVisible()
})

test('[A9] reloading after winning with seed 1 keeps Best score: 2', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('1')
  await page.getByRole('button', { name: 'New game' }).click()
  await selectRow(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await selectRow(page, 2, ['Red', 'Blue', 'Green', 'Yellow'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await page.goto('/')
  await expect(page.getByText('Best score: 2')).toBeVisible()
})
