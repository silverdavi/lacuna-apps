import { expect, test, type Page } from '@playwright/test'

async function startRound(page: Page) {
  await page.getByRole('button', { name: 'Start round' }).click()
  await expect(page.getByText('Hold the phone to your forehead')).toBeVisible()
  await expect(page.getByTestId('card-name')).toBeVisible({ timeout: 6000 })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] first load shows the heading, twelve category pills with counts, and an enabled Start', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Forehead Cards' })).toBeVisible()
  const pills = page.getByRole('group', { name: 'Categories' }).getByRole('button')
  await expect(pills).toHaveCount(12)
  await expect(page.getByRole('button', { name: /^Music \d+$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start round' })).toBeEnabled()
})

test('[A2] with no categories Start is disabled and says why', async ({ page }) => {
  await page.getByRole('button', { name: 'None' }).click()
  await expect(page.getByRole('button', { name: 'Start round' })).toBeDisabled()
  await expect(page.getByText('Pick at least one category to start.')).toBeVisible()
})

test('[A3] a round counts down 3-2-1, then shows a card, timer and category', async ({ page }) => {
  await page.getByRole('button', { name: '30 s' }).click()
  await page.getByRole('button', { name: 'Start round' }).click()
  await expect(page.getByTestId('countdown')).toHaveText('3')
  await expect(page.getByTestId('card-name')).toBeVisible({ timeout: 6000 })
  await expect(page.getByTestId('timer')).toHaveText(/^(30|29)$/)
})

test('[A4] arrow keys mark Correct and Pass, and the summary lists both', async ({ page }) => {
  await startRound(page)
  const first = (await page.getByTestId('card-name').innerText()).trim()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('card-name')).not.toHaveText(first)
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'End round' }).click()
  await expect(page.getByText('Round over', { exact: true })).toBeVisible()
  await expect(page.getByText('Correct', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: first }).first()).toContainText('Correct')
})

test('[A5] tapping a card in the summary toggles Correct and Passed', async ({ page }) => {
  await startRound(page)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'End round' }).click()
  const row = page.getByRole('list', { name: 'Cards this round' }).getByRole('listitem').first()
  await expect(row).toContainText('Correct')
  await row.getByRole('button').click()
  await expect(row).toContainText('Passed')
})

test('[A6] tapping the right half of the play screen marks Correct', async ({ page }) => {
  await startRound(page)
  const first = (await page.getByTestId('card-name').innerText()).trim()
  const box = (await page.locator('.fc-stage').boundingBox())!
  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.5)
  await expect(page.getByTestId('card-name')).not.toHaveText(first)
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'End round' }).click()
  await expect(page.getByRole('list', { name: 'Cards this round' }).getByRole('listitem').first()).toContainText('Correct')
})

test('[A7] team mode offers the next team and keeps a scoreboard', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Team mode' }).check()
  await page.getByLabel('Team 1 name').fill('Reds')
  await startRound(page)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'End round' }).click()
  await expect(page.getByRole('button', { name: /Next team: Team 2/ })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Team scoreboard' })).toContainText('Reds')
})

test('[A8] a custom deck can be created, deleted and restored with Undo', async ({ page }) => {
  await page.getByRole('button', { name: 'Decks', exact: true }).click()
  await page.getByRole('button', { name: 'New deck' }).first().click()
  await page.getByLabel('Deck name', { exact: true }).fill('Pets')
  await page.getByLabel('Entries, one per line').fill('Goldfish\nHamster\n\nGoldfish\nParrot')
  await page.getByRole('button', { name: 'Save deck' }).click()
  await expect(page.getByRole('list', { name: 'Custom decks' })).toContainText('3 entries')
  await page.getByRole('button', { name: 'Delete Pets' }).click()
  await expect(page.getByText('Deleted Pets.')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('list', { name: 'Custom decks' })).toContainText('Pets')
})

test('[A9] settings survive a reload', async ({ page }) => {
  await page.getByRole('button', { name: '90 s' }).click()
  await page.getByRole('button', { name: /^Foods/ }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: '90 s' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /^Foods/ })).toHaveAttribute('aria-pressed', 'false')
})

test('[A10] the print tab lays out 18 cards on the first sheet', async ({ page }) => {
  await page.getByRole('button', { name: 'Print', exact: true }).first().click()
  const sheet = page.getByRole('region', { name: 'Sheet 1', exact: true })
  await expect(sheet.locator('.fc-pcard')).toHaveCount(18)
  await expect(page.getByRole('button', { name: 'Print', exact: true }).last()).toBeEnabled()
})
