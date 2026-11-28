import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('[A1] first load shows the heading and the seeded sample script', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Teleprompter' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Scripts' }).getByText('Welcome script', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Welcome script')
})

test('[A2] new script, then the empty script says there is nothing to read', async ({ page }) => {
  await page.getByRole('button', { name: 'New script' }).click()
  await page.getByRole('button', { name: 'Rehearse' }).click()
  await expect(page.getByText('Nothing to read yet')).toBeVisible()
  await page.getByRole('button', { name: 'Back to editor' }).first().click()
  await expect(page.getByRole('button', { name: 'Rehearse' })).toBeVisible()
})

test('[A3] delete can be undone', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete Welcome script' }).click()
  await expect(page.getByText('No scripts yet').first()).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Welcome script')
})

test('[A4] duplicate adds a copy', async ({ page }) => {
  await page.getByRole('button', { name: 'Duplicate Welcome script' }).click()
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Welcome script copy')
})

test('[A5] step mode: keys move line by line and the end card restarts', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Script' }).fill('One two.\n\nThree four.')
  await page.getByRole('button', { name: 'Rehearse' }).click()
  await page.getByRole('button', { name: 'Step', exact: true }).click()
  const current = page.locator('.tp-item.cur')
  await expect(current).toContainText('One two.')
  await page.keyboard.press('ArrowRight')
  await expect(current).toContainText('Three four.')
  await page.keyboard.press('ArrowLeft')
  await expect(current).toContainText('One two.')
  await page.keyboard.press('ArrowRight')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('End', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(current).toContainText('One two.')
})

test('[A6] clean mode hides the controls and H brings them back', async ({ page }) => {
  await page.getByRole('button', { name: 'Rehearse' }).click()
  await expect(page.getByRole('group', { name: 'Prompter controls' })).toBeVisible()
  await page.keyboard.press('h')
  await expect(page.getByRole('group', { name: 'Prompter controls' })).toBeHidden()
  await page.keyboard.press('h')
  await expect(page.getByRole('group', { name: 'Prompter controls' })).toBeVisible()
})

test('[A7] mirror flips the stage and Escape returns to the editor', async ({ page }) => {
  await page.getByRole('button', { name: 'Rehearse' }).click()
  await page.getByLabel('Mirror').check()
  await expect(page.locator('.tp-stage')).toHaveCSS('transform', 'matrix(-1, 0, 0, 1, 0, 0)')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Rehearse' })).toBeVisible()
})

test('[A8] the keys dialog lists the keyboard map', async ({ page }) => {
  await page.getByRole('button', { name: 'Rehearse' }).click()
  await page.getByRole('button', { name: 'Keys' }).click()
  await expect(page.getByRole('dialog', { name: 'Keys' })).toContainText('Fullscreen')
})

test('[A9] playing counts down 3-2-1 then reads', async ({ page }) => {
  await page.getByRole('button', { name: 'Rehearse' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('.tp-count')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 6000 })
})

test('[A10] speed and mode are remembered for the script', async ({ page }) => {
  await page.getByRole('button', { name: 'Rehearse' }).click()
  await page.getByRole('button', { name: 'Step', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Rehearse' }).click()
  await expect(page.locator('.tp.step')).toHaveCount(1)
})
