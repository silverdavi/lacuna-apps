import { expect, test } from '@playwright/test'

test('[A1] initial page shows heading, BPM field, time signature select, Start and Save preset', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Music Metronome' })).toBeVisible()
  await expect(page.getByLabel('BPM')).toHaveValue('120')
  await expect(page.getByLabel('Time signature')).toHaveValue('4/4')
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save preset' })).toBeVisible()
})

test('[A2] typing 90 in the BPM field updates the displayed BPM and interval', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('BPM').fill('90')
  await expect(page.getByLabel('BPM')).toHaveValue('90')
  await expect(page.getByText('667 ms', { exact: true })).toBeVisible()
})

test('[A3] clicking Start sets the button label to Stop and the status to Running', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect(page.getByText('Running', { exact: true })).toBeVisible()
})

test('[A4] clicking Stop sets the button label to Start and the status to Stopped', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  await expect(page.getByText('Stopped', { exact: true })).toBeVisible()
})

test('[A5] saving a preset adds a list item with the name and BPM and shows a toast', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('BPM').fill('120')
  await page.getByLabel('Preset name').fill('Jazz')
  await page.getByRole('button', { name: 'Save preset' }).click()
  await expect(page.getByText('Jazz')).toBeVisible()
  await expect(page.getByText('120 BPM')).toBeVisible()
  await expect(page.getByText('Preset saved')).toBeVisible()
})

test('[A6] clicking Delete Jazz removes the Jazz preset from the list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('BPM').fill('120')
  await page.getByLabel('Preset name').fill('Jazz')
  await page.getByRole('button', { name: 'Save preset' }).click()
  await expect(page.getByText('Jazz')).toBeVisible()
  await page.getByRole('button', { name: 'Delete Jazz' }).click()
  await expect(page.getByText('Jazz')).toHaveCount(0)
})

test('[A7] selecting 3/4 shows 1 / 3 on the first beat of the next cycle', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Time signature').selectOption('3/4')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('1 / 3', { exact: true })).toBeVisible()
})

test('[A8] the Presets tab lists saved presets', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('BPM').fill('120')
  await page.getByLabel('Preset name').fill('Jazz')
  await page.getByRole('button', { name: 'Save preset' }).click()
  await page.getByRole('tab', { name: 'Presets' }).click()
  await expect(page.getByText('Jazz')).toBeVisible()
  await expect(page.getByText('120 BPM')).toBeVisible()
})

test('[A9] reloading the page keeps the saved preset', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('BPM').fill('120')
  await page.getByLabel('Preset name').fill('Jazz')
  await page.getByRole('button', { name: 'Save preset' }).click()
  await page.reload()
  await page.getByRole('tab', { name: 'Presets' }).click()
  await expect(page.getByText('Jazz')).toBeVisible()
  await expect(page.getByText('120 BPM')).toBeVisible()
})
