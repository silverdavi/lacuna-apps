import { expect, test } from '@playwright/test'

test('[A1] Heading shown and empty state before any answers', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'This Or That' })).toBeVisible()
  await expect(page.getByText('No answers yet')).toBeVisible()
})

test('[A2] Start game shows the first question with both option buttons', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await expect(page.getByText('Coffee or Tea?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Coffee' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tea' })).toBeVisible()
})

test('[A3] Picking an option shows feedback and the Next question button', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: 'Coffee' }).click()
  await expect(page.getByText('You picked Coffee')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible()
})

test('[A4] Next question shows the second question and the updated score', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: 'Coffee' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  await expect(page.getByText('Cats or Dogs?')).toBeVisible()
  await expect(page.getByText('Score: 1')).toBeVisible()
})

test('[A5] Finishing all five questions shows Score: 5 and a Restart button', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: 'Coffee' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  await page.getByRole('button', { name: 'Cats' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  // Q3-Q5 are unnamed in the spec; pick each question's first option button.
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: page.getByText('or').first() }).click()
    await page.getByRole('button', { name: 'Next question' }).click()
  }
  await expect(page.getByText('Score: 5')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible()
})

test('[A6] Restart resets the score, shows the first question, and hides the empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: 'Coffee' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  await page.getByRole('button', { name: 'Cats' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: page.getByText('or').first() }).click()
    await page.getByRole('button', { name: 'Next question' }).click()
  }
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Coffee or Tea?')).toBeVisible()
  await expect(page.getByText('No answers yet')).not.toBeVisible()
})

test('[A7] Best score is recorded after completing a session', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: 'Coffee' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  await page.getByRole('button', { name: 'Cats' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: page.getByText('or').first() }).click()
    await page.getByRole('button', { name: 'Next question' }).click()
  }
  await expect(page.getByText('Best score: 5')).toBeVisible()
})

test('[A8] Results tab lists every answered question with its option and points', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: 'Coffee' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  await page.getByRole('button', { name: 'Cats' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: page.getByText('or').first() }).click()
    await page.getByRole('button', { name: 'Next question' }).click()
  }
  await page.getByRole('tab', { name: 'Results' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Coffee or Tea?' })
  await expect(row).toContainText('Coffee')
})

test('[A9] Completed answers persist across a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: 'Coffee' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  await page.getByRole('button', { name: 'Cats' }).click()
  await page.getByRole('button', { name: 'Next question' }).click()
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: page.getByText('or').first() }).click()
    await page.getByRole('button', { name: 'Next question' }).click()
  }
  await page.reload()
  await page.getByRole('tab', { name: 'Results' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Coffee or Tea?' })
  await expect(row).toContainText('Coffee')
})
