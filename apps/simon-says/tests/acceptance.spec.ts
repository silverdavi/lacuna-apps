import { test, expect } from '@playwright/test'

const PADS = ['Red', 'Blue', 'Green', 'Yellow', 'Red', 'Green', 'Blue', 'Yellow']

async function startRound(page: any, seed: string) {
  await page.getByLabel('Seed').fill(seed)
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: PADS[0], exact: true }).toBeEnabled({ timeout: 8000 })
}

test('[A1] initial page shows heading, prompt, and score', async ({ page }) => {
  await page.goto('/')
  expect(page.getByRole('heading', { name: 'Simon Says Game' })).toBeVisible()
  expect(page.getByText('Press Start to begin', { exact: true })).toBeVisible()
  expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
})

test('[A2] starting with seed 42 plays 4 pads and enables them', async ({ page }) => {
  await page.goto('/')
  const played: string[] = []
  page.on('console', (m: any) => {
    const t = m.text()
    for (const p of PADS.slice(0, 4)) {
      if (t === p) played.push(p)
    }
  })
  await startRound(page, '42')
  expect(played.length, 'exactly 4 pads played').toBe(4)
  expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
  for (const p of PADS.slice(0, 4)) {
    expect(page.getByRole('button', { name: p, exact: true })).toBeEnabled()
  }
})

test('[A3] completing the first sequence advances to Score: 1 and plays 5 pads', async ({ page }) => {
  await page.goto('/')
  await startRound(page, '42')
  for (const p of PADS.slice(0, 4)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  expect(page.getByText('Score: 1', { exact: true })).toBeVisible()
  const played: string[] = []
  page.on('console', (m: any) => {
    const t = m.text()
    for (const p of PADS.slice(0, 5)) {
      if (t === p) played.push(p)
    }
  })
  await page.getByRole('button', { name: PADS[4], exact: true }).toBeEnabled({ timeout: 8000 })
  expect(played.length, 'exactly 5 pads played').toBe(5)
})

test('[A4] clicking the wrong pad shows "Wrong pad" and keeps Score: 0', async ({ page }) => {
  await page.goto('/')
  await startRound(page, '42')
  await page.getByRole('button', { name: 'Blue', exact: true }).click()
  expect(page.getByText('Wrong pad', { exact: true })).toBeVisible()
  expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
})

test('[A5] restart resets score, clears message, and shows the prompt', async ({ page }) => {
  await page.goto('/')
  await startRound(page, '42')
  for (const p of PADS.slice(0, 4)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  expect(page.getByText('Score: 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
  expect(page.getByText('Press Start to begin', { exact: true })).toBeVisible()
})

test('[A6] completing the second sequence advances to Score: 2', async ({ page }) => {
  await page.goto('/')
  await startRound(page, '42')
  for (const p of PADS.slice(0, 4)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  expect(page.getByText('Score: 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: PADS[4], exact: true }).toBeEnabled({ timeout: 8000 })
  for (const p of PADS.slice(4, 9)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  expect(page.getByText('Score: 2', { exact: true })).toBeVisible()
})

test('[A7] history tab shows a row for seed 42 with best score 2', async ({ page }) => {
  await page.goto('/')
  await startRound(page, '42')
  for (const p of PADS.slice(0, 4)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  await page.getByRole('button', { name: PADS[4], exact: true }).toBeEnabled({ timeout: 8000 })
  for (const p of PADS.slice(4, 9)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  expect(page.getByText('Score: 2', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'History', exact: true }).click()
  expect(page.getByRole('columnheader', { name: 'Best Score', exact: true })).toBeVisible()
  expect(page.getByRole('cell', { name: '42', exact: true })).toBeVisible()
  expect(page.getByRole('cell', { name: '2', exact: true })).toBeVisible()
})

test('[A8] copy best shows a toast and copies the best score to the clipboard', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await startRound(page, '42')
  for (const p of PADS.slice(0, 4)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  await page.getByRole('button', { name: PADS[4], exact: true }).toBeEnabled({ timeout: 8000 })
  for (const p of PADS.slice(4, 9)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  expect(page.getByText('Score: 2', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'History', exact: true }).click()
  await page.getByRole('button', { name: 'Copy best', exact: true }).click()
  expect(page.getByText('Best score copied', { exact: true })).toBeVisible()
  const clipboard = await page.evaluate(async () => navigator.clipboard.readText())
  expect(clipboard, 'clipboard contents').toBe('Best score: 2')
})

test('[A9] reload keeps the best score in the history tab', async ({ page }) => {
  await page.goto('/')
  await startRound(page, '42')
  for (const p of PADS.slice(0, 4)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  await page.getByRole('button', { name: PADS[4], exact: true }).toBeEnabled({ timeout: 8000 })
  for (const p of PADS.slice(4, 9)) {
    await page.getByRole('button', { name: p, exact: true }).click()
    await page.getByRole('button', { name: PADS[0], exact: true }).toBeDisabled({ timeout: 8000 })
  }
  expect(page.getByText('Score: 2', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'History', exact: true }).click()
  await page.reload()
  expect(page.getByRole('tab', { name: 'History', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'History', exact: true }).click()
  expect(page.getByText('Best Score: 2', { exact: true })).toBeVisible()
})
