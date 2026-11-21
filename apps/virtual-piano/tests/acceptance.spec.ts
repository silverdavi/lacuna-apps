import { expect, test, type Page } from '@playwright/test'

async function clickNote(page: Page, note: string) {
  await page.getByRole('button', { name: note }).click()
}

test('[A1] initial state shows heading and empty note list', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Virtual Piano' })).toBeVisible()
  await expect(page.getByText('No notes recorded yet')).toBeVisible()
})

test('[A2] clicking C4 adds a list item and updates the summary', async ({ page }) => {
  await page.goto('/')
  await clickNote(page, 'C4')
  await expect(page.getByRole('listitem').filter({ hasText: 'C4' })).toBeVisible()
  await expect(page.getByText('No notes recorded yet')).toHaveCount(0)
  await expect(page.getByText('Notes: 1')).toBeVisible()
})

test('[A3] clicking C4, E4, G4 adds three items in order', async ({ page }) => {
  await page.goto('/')
  await clickNote(page, 'C4')
  await clickNote(page, 'E4')
  await clickNote(page, 'G4')
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toContainText('C4')
  await expect(items.nth(1)).toContainText('E4')
  await expect(items.nth(2)).toContainText('G4')
  await expect(page.getByText('Notes: 3')).toBeVisible()
})

test('[A4] pressing keyboard key A adds A4 to the list', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('a')
  await expect(page.getByRole('listitem').filter({ hasText: 'A4' })).toBeVisible()
  await expect(page.getByText('Notes: 1')).toBeVisible()
})

test('[A5] clearing notes removes all items and shows the empty message', async ({ page }) => {
  await page.goto('/')
  await clickNote(page, 'C4')
  await clickNote(page, 'E4')
  await clickNote(page, 'G4')
  await page.getByRole('button', { name: 'Clear notes' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No notes recorded yet')).toBeVisible()
  await expect(page.getByText('Notes: 0')).toBeVisible()
})

test('[A6] toggling metronome on shows BPM and toggling off hides it', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Metronome' })
  await toggle.click()
  await expect(toggle).toHaveText('Metronome: On')
  await expect(page.getByText('BPM: 120')).toBeVisible()
  await toggle.click()
  await expect(toggle).toHaveText('Metronome')
  await expect(page.getByText('BPM: 120')).toHaveCount(0)
})

test('[A7] BPM controls adjust the tempo with metronome on', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Metronome' }).click()
  await page.getByRole('button', { name: 'BPM +' }).click()
  await expect(page.getByText('BPM: 124')).toBeVisible()
  await page.getByRole('button', { name: 'BPM \u2212' }).click()
  await expect(page.getByText('BPM: 120')).toBeVisible()
})

test('[A8] history tab shows a table with played notes; play tab returns to keyboard', async ({ page }) => {
  await page.goto('/')
  await clickNote(page, 'C4')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('columnheader', { name: 'Note' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'C4' })).toBeVisible()
  await page.getByRole('tab', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'C4' })).toBeVisible()
})

test('[A9] note list survives a reload', async ({ page }) => {
  await page.goto('/')
  await clickNote(page, 'C4')
  await clickNote(page, 'E4')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'C4' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'E4' })).toBeVisible()
  await expect(page.getByText('Notes: 2')).toBeVisible()
})
