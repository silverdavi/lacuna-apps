import { expect, test } from '@playwright/test'

test('[debug] A9 exact no saved check', async ({ page }) => {
  page.on('console', (msg) => {
    console.log('CONSOLE:', msg.text())
  })

  await page.goto('/')
  await page.getByLabel('Title').fill('Meeting notes')
  await page.getByRole('textbox').fill('Buy milk')
  await page.getByLabel('Passphrase').fill('secret123')
  await page.getByRole('button', { name: 'Save note' }).click()
  await page.getByRole('listitem').getByText('Meeting notes').click()
  await page.getByRole('textbox').fill('Buy eggs')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Meeting notes' })).toBeVisible()
  await page.getByRole('listitem').getByText('Meeting notes').click()
  await page.getByLabel('Passphrase').fill('secret123')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByRole('textbox')).toHaveText('Buy eggs', { timeout: 5000 })
})
