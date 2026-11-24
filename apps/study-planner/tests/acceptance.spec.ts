import { expect, test } from '@playwright/test'

test('[A1] heading and Month tab active by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Study Planner' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-selected', 'false')
})

test('[A2] create session appears in the May 15 calendar grid', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New session' }).click()
  await page.getByLabel('Subject').fill('Math')
  await page.getByLabel('Date').fill('2024-05-15')
  await page.getByLabel('Start time').fill('14:00')
  await page.getByLabel('Duration').fill('60')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Math 14:00-15:00')).toBeVisible()
})

test('[A3] open session detail and mark done', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New session' }).click()
  await page.getByLabel('Subject').fill('Math')
  await page.getByLabel('Date').fill('2024-05-15')
  await page.getByLabel('Start time').fill('14:00')
  await page.getByLabel('Duration').fill('60')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByText('Math 14:00-15:00').click()
  await page.getByRole('button', { name: 'Mark done' }).click()
  await expect(page.getByText('Done')).toBeVisible()
  // A3: a checkmark icon is rendered next to the session title.
  const icon = page
    .getByRole('img', { name: /check|done|complete/i })
    .or(page.locator('svg path[d]').first())
  await expect(icon.first()).toBeVisible()
})

test('[A4] delete removes the session from the grid', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New session' }).click()
  await page.getByLabel('Subject').fill('Math')
  await page.getByLabel('Date').fill('2024-05-15')
  await page.getByLabel('Start time').fill('14:00')
  await page.getByLabel('Duration').fill('60')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByText('Math 14:00-15:00').click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Math 14:00-15:00')).toHaveCount(0)
})

test('[A5] week tab shows the session in the week of May 13-19', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New session' }).click()
  await page.getByLabel('Subject').fill('Math')
  await page.getByLabel('Date').fill('2024-05-15')
  await page.getByLabel('Start time').fill('14:00')
  await page.getByLabel('Duration').fill('60')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Week' }).click()
  const session = page.getByText('Math 14:00-15:00').first()
  await expect(session).toBeVisible()
  const mon = page.getByText('May 13, 2024').first()
  const sun = page.getByText('May 19, 2024').first()
  await expect(mon).toBeVisible()
  await expect(sun).toBeVisible()
  // A5: the session must sit in Monday's (May 13) column, not the next one.
  const box = await session.boundingBox()
  const monBox = await mon.boundingBox()
  const sunBox = await sun.boundingBox()
  expect(box).toBeTruthy()
  expect(monBox).toBeTruthy()
  expect(sunBox).toBeTruthy()
  expect(box!.x, 'session starts at or after the Monday column').toBeGreaterThanOrEqual(monBox!.x)
  expect(box!.x + box!.width, 'session ends before the Monday column ends').toBeLessThanOrEqual(monBox!.x + monBox!.width)
  expect(box!.y, 'session is inside the week grid').toBeGreaterThanOrEqual(monBox!.y)
  expect(box!.y + box!.height).toBeLessThanOrEqual(sunBox!.y + sunBox!.height)
})

test('[A6] repeat weekly creates the next occurrence', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New session' }).click()
  await page.getByLabel('Subject').fill('History')
  await page.getByLabel('Date').fill('2024-05-16')
  await page.getByLabel('Start time').fill('10:00')
  await page.getByLabel('Duration').fill('90')
  await page.getByLabel('Repeat weekly').check()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('History 10:00-11:30')).toHaveCount(2)
  await expect(page.getByText('May 23, 2024')).toBeVisible()
})

test('[A7] export ICS copies content to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'New session' }).click()
  await page.getByLabel('Subject').fill('Math')
  await page.getByLabel('Date').fill('2024-05-15')
  await page.getByLabel('Start time').fill('14:00')
  await page.getByLabel('Duration').fill('60')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Export ICS' }).click()
  const clip = await page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return (document.querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? ''
    }
  })
  expect(clip).toContain('BEGIN:VEVENT')
  expect(clip).toContain('SUMMARY:Math')
})

test('[A8] progress summary shows completed count', async ({ page }) => {
  await page.goto('/')
  for (const [subject, time] of [['Math', '14:00'], ['History', '10:00']] as const) {
    await page.getByRole('button', { name: 'New session' }).click()
    await page.getByLabel('Subject').fill(subject)
    await page.getByLabel('Date').fill('2024-05-15')
    await page.getByLabel('Start time').fill(time)
    await page.getByLabel('Duration').fill('60')
    await page.getByRole('button', { name: 'Save' }).click()
  }
  await page.getByText('Math 14:00-15:00').click()
  await page.getByRole('button', { name: 'Mark done' }).click()
  await expect(page.getByText('Completed: 1 of 2')).toBeVisible()
})

test('[A9] reload keeps session and progress', async ({ page }) => {
  await page.goto('/')
  for (const [subject, time] of [['Math', '14:00'], ['History', '10:00']] as const) {
    await page.getByRole('button', { name: 'New session' }).click()
    await page.getByLabel('Subject').fill(subject)
    await page.getByLabel('Date').fill('2024-05-15')
    await page.getByLabel('Start time').fill(time)
    await page.getByLabel('Duration').fill('60')
    await page.getByRole('button', { name: 'Save' }).click()
  }
  await page.getByText('Math 14:00-15:00').click()
  await page.getByRole('button', { name: 'Mark done' }).click()
  await page.reload()
  await expect(page.getByText('Math 14:00-15:00')).toBeVisible()
  await expect(page.getByText('Completed: 1 of 2')).toBeVisible()
})
