import { expect, test, type Page } from '@playwright/test'

// Fresh browser profile per test, so every test starts from an empty app.
test.use({ storageState: { cookies: [], origins: [] } })

async function focusGrid(page: Page) {
  await page.getByRole('cell', { name: 'Step 1' }).click()
  await page.getByRole('cell', { name: 'Step 1' }).click()
}

test('[A1] initial load shows heading, 16-cell grid, Tempo: 120, and Play', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Drum Machine' })).toBeVisible()
  await expect(page.getByRole('cell')).toHaveCount(16)
  await expect(page.getByText('Tempo: 120')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})

test('[A2] clicking Step 1 fills it and shows Pattern: 1', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('cell', { name: 'Step 1' }).click()
  await expect(page.getByText('Pattern: 1')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Step 1' })).toHaveAttribute('aria-pressed', 'true')
})

test('[A3] clicking Step 5 fills it and shows Pattern: 1, 5', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('cell', { name: 'Step 1' }).click()
  await page.getByRole('cell', { name: 'Step 5' }).click()
  await expect(page.getByText('Pattern: 1, 5')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Step 5' })).toHaveAttribute('aria-pressed', 'true')
})

test('[A4] clicking Step 1 again clears it and shows Pattern: 5', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('cell', { name: 'Step 1' }).click()
  await page.getByRole('cell', { name: 'Step 5' }).click()
  await page.getByRole('cell', { name: 'Step 1' }).click()
  await expect(page.getByText('Pattern: 5')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Step 1' })).toHaveAttribute('aria-pressed', 'false')
})

test('[A5] typing 140 in Tempo and pressing Enter shows Tempo: 140', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Tempo').fill('140')
  await page.getByLabel('Tempo').press('Enter')
  await expect(page.getByText('Tempo: 140')).toBeVisible()
})

// Spec's "after 2 seconds" is a minimum; the audio loop is untestable, so the
// assertion is that Stop is actionable and returns the button to Play.
test('[A6] Play starts the loop as Stop, Stop returns it to Play', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('cell', { name: 'Step 1' }).click()
  await page.getByRole('cell', { name: 'Step 5' }).click()
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeEnabled()
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeEnabled()
})

test('[A7] pressing key 1 with grid focus activates Step 1 and shows Pattern: 1', async ({ page }) => {
  await page.goto('/')
  await focusGrid(page)
  await page.keyboard.press('1')
  await expect(page.getByText('Pattern: 1')).toBeVisible()
})

test('[A8] pressing key 5 with grid focus activates Step 5 and shows Pattern: 1, 5', async ({ page }) => {
  await page.goto('/')
  await focusGrid(page)
  await page.keyboard.press('1')
  await page.keyboard.press('5')
  await expect(page.getByText('Pattern: 1, 5')).toBeVisible()
})

test('[A9] reload keeps the pattern and tempo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('cell', { name: 'Step 1' }).click()
  await page.getByRole('cell', { name: 'Step 5' }).click()
  await page.getByLabel('Tempo').fill('140')
  await page.getByLabel('Tempo').press('Enter')
  await page.reload()
  await expect(page.getByText('Tempo: 140')).toBeVisible()
  await expect(page.getByText('Pattern: 1, 5')).toBeVisible()
})
