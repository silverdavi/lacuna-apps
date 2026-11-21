import { expect, test, type Page } from '@playwright/test'

// Reads the text a labelled field displays, e.g. "82.41 Hz" for "Detected frequency".
async function fieldValue(page: Page, label: string) {
  return (await page.getByLabel(label, { exact: true }).first().innerText()).trim()
}

function inRange(value: number, lo: number, hi: number) {
  expect(value, `value ${value} to be between ${lo} and ${hi}`).toBeGreaterThanOrEqual(lo)
  expect(value, `value ${value} to be between ${lo} and ${hi}`).toBeLessThanOrEqual(hi)
}

// Plays the reference tone for the selected string. The status text states the
// note's target frequency, which anchors the "detected" value in tests A4-A9.
async function playReference(page: Page) {
  await page.getByRole('button', { name: 'Play reference' }).click()
  await page.waitForTimeout(2500)
}

// Records a short sample, stops it, and returns the value shown in
// "Detected frequency".
async function recordSample(page: Page) {
  const record = page.getByRole('button', { name: 'Record sample' })
  await record.click()
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible()
  await page.waitForTimeout(2200)
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible()
  await page.getByRole('button', { name: 'Stop recording' }).click()
  const raw = await fieldValue(page, 'Detected frequency')
  const detected = Number(raw.replace(/[^\d.-]/g, ''))
  expect(Number.isFinite(detected), `"Detected frequency" parsed as a number, saw ${raw}`).toBe(true)
  return detected
}

// Records a sample and returns the string shown in "Detected frequency" so the
// log assertion can use the same value the app displayed.
async function recordSampleText(page: Page) {
  const record = page.getByRole('button', { name: 'Record sample' })
  await record.click()
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible()
  await page.waitForTimeout(2200)
  await page.getByRole('button', { name: 'Stop recording' }).click()
  return fieldValue(page, 'Detected frequency')
}

test('[A1] page heading is "Guitar Tuner"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Guitar Tuner' })).toBeVisible()
})

test('[A2] selecting E2 and playing the reference updates the status text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('String', { exact: true }).selectOption('E2')
  await page.getByRole('button', { name: 'Play reference' }).click()
  await expect(page.getByText('Playing E2 at 82.41 Hz')).toBeVisible()
})

test('[A3] recording flips the button to "Stop recording" and shows the elapsed time', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Record sample' }).click()
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible()
  await expect(page.getByText('0:02', { exact: true })).toBeVisible()
})

test('[A4] after stopping, detected frequency is within 80-85 Hz and cent offset within -50 to 50', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('String', { exact: true }).selectOption('E2')
  await playReference(page)
  const detected = await recordSample(page)
  inRange(detected, 80, 85)
  const rawOffset = await fieldValue(page, 'Cent offset')
  const offset = Number(rawOffset.replace(/[^\d.-]/g, ''))
  expect(Number.isFinite(offset), `"Cent offset" parsed as a number, saw ${rawOffset}`).toBe(true)
  inRange(offset, -50, 50)
})

test('[A5] saving to the log adds a row with the string, target, and detected frequency', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('String', { exact: true }).selectOption('E2')
  await playReference(page)
  const detectedText = await recordSampleText(page)
  await page.getByRole('button', { name: 'Save to log' }).click()
  const row = page.getByRole('row', { name: /E2/ }).last()
  await expect(row).toContainText('E2')
  await expect(row).toContainText('82.41')
  await expect(row).toContainText(detectedText)
})

test('[A6] deleting the last row removes it and shows "No entries yet" when empty', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('String', { exact: true }).selectOption('E2')
  await playReference(page)
  await recordSampleText(page)
  await page.getByRole('button', { name: 'Save to log' }).click()
  await expect(page.getByRole('row', { name: /E2/ }).last()).toBeVisible()
  await page.getByRole('row', { name: /E2/ }).last().getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('row', { name: /E2/ })).toHaveCount(0)
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('[A7] the History tab shows a session history table with the expected columns', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'History' }).click()
  const table = page.getByRole('table', { name: 'Session history' })
  await expect(table).toBeVisible()
  for (const column of ['Date', 'String', 'Target Hz', 'Detected Hz', 'Cents']) {
    await expect(table.getByRole('columnheader', { name: column, exact: true })).toBeVisible()
  }
})

test('[A8] selecting A4 updates the status text to "Selected A4 at 440.00 Hz"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('String', { exact: true }).selectOption('A4')
  await expect(page.getByText('Selected A4 at 440.00 Hz')).toBeVisible()
})

test('[A9] reload keeps the E2 row in the tuning log', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('String', { exact: true }).selectOption('E2')
  await playReference(page)
  const detectedText = await recordSampleText(page)
  await page.getByRole('button', { name: 'Save to log' }).click()
  await expect(page.getByRole('row', { name: /E2/ }).last()).toContainText(detectedText)
  await page.reload()
  const row = page.getByRole('row', { name: /E2/ }).last()
  await expect(row).toContainText('E2')
  await expect(row).toContainText('82.41')
  await expect(row).toContainText(detectedText)
})
