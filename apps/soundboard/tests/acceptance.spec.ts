import { expect, test, type Page } from '@playwright/test'

// Records a clip with the given elapsed duration ("00:02" -> 2000 ms), leaving
// the app with the clip added to the list.
async function recordClip(page: Page, durationMs: number) {
  await page.getByRole('button', { name: 'Record clip' }).click()
  await page.waitForTimeout(durationMs)
  await page.getByRole('button', { name: 'Stop recording' }).click()
}

// Adds "Clip 1" (00:02) and "Clip 2" (00:03).
async function addTwoClips(page: Page) {
  await recordClip(page, 2000)
  await recordClip(page, 3000)
}

const clipItem = (page: Page, name: string) => page.getByRole('listitem', { name: new RegExp(name) })

test('[A1] page shows the "Soundboard" heading and "No clips yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Soundboard' })).toBeVisible()
  await expect(page.getByText('No clips yet')).toBeVisible()
})

test('[A2] recording for 2 seconds adds "Clip 1" with "00:02" and hides "No clips yet"', async ({ page }) => {
  await page.goto('/')
  await recordClip(page, 2000)
  await expect(page.getByText('No clips yet')).toHaveCount(0)
  const item = clipItem(page, 'Clip 1')
  await expect(item).toBeVisible()
  await expect(item).toContainText('Clip 1')
  await expect(item).toContainText('00:02')
})

test('[A3] a second recording adds "Clip 2" with "00:03" and the list has two items', async ({ page }) => {
  await page.goto('/')
  await addTwoClips(page)
  const second = clipItem(page, 'Clip 2')
  await expect(second).toBeVisible()
  await expect(second).toContainText('Clip 2')
  await expect(second).toContainText('00:03')
  await expect(clipItem(page, 'Clip 1')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(2)
})

test('[A4] clicking "Play Clip 1" sets the score to "Score: 1" and the best to "Best: 1"', async ({ page }) => {
  await page.goto('/')
  await recordClip(page, 2000)
  await clipItem(page, 'Clip 1').getByRole('button', { name: 'Play Clip 1' }).click()
  await expect(page.getByText('Score: 1')).toBeVisible()
  await expect(page.getByText('Best: 1')).toBeVisible()
})

test('[A5] pressing "1" (the first clip\'s shortcut) raises the score to "Score: 2" and "Best: 2"', async ({
  page,
}) => {
  await page.goto('/')
  await recordClip(page, 2000)
  await clipItem(page, 'Clip 1').getByRole('button', { name: 'Play Clip 1' }).click()
  await expect(page.getByText('Score: 1')).toBeVisible()
  await expect(page.getByText('Best: 1')).toBeVisible()
  await page.keyboard.press('1')
  await expect(page.getByText('Score: 2')).toBeVisible()
  await expect(page.getByText('Best: 2')).toBeVisible()
})

test('[A6] clicking "Delete Clip 1" removes it and the list contains only "Clip 2"', async ({ page }) => {
  await page.goto('/')
  await addTwoClips(page)
  await clipItem(page, 'Clip 1').getByRole('button', { name: 'Delete Clip 1' }).click()
  await expect(clipItem(page, 'Clip 1')).toHaveCount(0)
  await expect(clipItem(page, 'Clip 2')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(1)
})

test('[A7] clicking "Restart" resets the score to "Score: 0" while keeping "Best: 2"', async ({ page }) => {
  await page.goto('/')
  await recordClip(page, 2000)
  await clipItem(page, 'Clip 1').getByRole('button', { name: 'Play Clip 1' }).click()
  await page.keyboard.press('1')
  await expect(page.getByText('Score: 2')).toBeVisible()
  await expect(page.getByText('Best: 2')).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 2')).toBeVisible()
})

test('[A8] clicking "Export list" copies "Clip 1, Clip 2" to the clipboard', async ({ page, context }) => {
  await page.goto('/')
  await addTwoClips(page)
  // grant before the copy click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Export list' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard holds the exported list').toBe('Clip 1, Clip 2')
})

test('[A9] reload keeps the clip list and the best score at "Best: 2"', async ({ page }) => {
  await page.goto('/')
  await addTwoClips(page)
  await clipItem(page, 'Clip 1').getByRole('button', { name: 'Play Clip 1' }).click()
  await page.keyboard.press('1')
  await expect(page.getByText('Best: 2')).toBeVisible()
  await clipItem(page, 'Clip 1').getByRole('button', { name: 'Delete Clip 1' }).click()
  await page.reload()
  await expect(clipItem(page, 'Clip 1')).toHaveCount(0)
  await expect(clipItem(page, 'Clip 2')).toBeVisible()
  await expect(page.getByText('Best: 2')).toBeVisible()
})
