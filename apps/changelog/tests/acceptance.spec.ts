import { test, expect, type Page } from '@playwright/test'

async function addCommits(page: Page, messages: string[]) {
  for (const msg of messages) {
    await page.getByLabel('Commit message').fill(msg)
    await page.getByRole('button', { name: 'Add commit' }).click()
  }
}

test('[A1] heading and empty-state text are visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Changelog Generator', { exact: true })).toBeVisible()
  await expect(page.getByText('No commits yet')).toBeVisible()
})

test('[A2] adding a commit removes the empty state and shows the item', async ({ page }) => {
  await page.goto('/')
  await addCommits(page, ['feat: add login'])
  await expect(page.getByText('feat: add login')).toBeVisible()
  await expect(page.getByText('No commits yet')).toHaveCount(0)
})

test('[A3] commits are listed in the order they were added', async ({ page }) => {
  await page.goto('/')
  await addCommits(page, ['feat: add login', 'fix: null pointer', 'docs: update readme'])
  // A list item can hold more than the message text (e.g. a delete button);
  // compare the first line of each item so we match the order of the messages.
  const items = page.locator('li')
  expect(await items.count()).toBe(3)
  const firstLines = await items.evaluateAll((lis) =>
    lis.map((li) => li.textContent?.trim().split('\n')[0] ?? '')
  )
  expect(firstLines).toEqual(['feat: add login', 'fix: null pointer', 'docs: update readme'])
})

test('[A4] deleting a commit removes its item', async ({ page }) => {
  await page.goto('/')
  await addCommits(page, ['feat: add login', 'fix: null pointer', 'docs: update readme'])
  await page.getByRole('button', { name: 'Delete fix: null pointer' }).click()
  await expect(page.locator('li')).toHaveCount(2)
  await expect(page.locator('li').nth(0)).toContainText('feat: add login')
  await expect(page.locator('li').nth(1)).toContainText('docs: update readme')
  await expect(page.getByText('fix: null pointer')).toHaveCount(0)
})

test('[A5] generated changelog shows Features and Documentation sections', async ({ page }) => {
  await page.goto('/')
  await addCommits(page, ['feat: add login', 'docs: update readme'])
  await page.getByRole('button', { name: 'Generate changelog' }).click()
  // A7 shows the copied markdown uses "## " headings while A6 renders HTML;
  // the rendered preview therefore displays the section text without "## ".
  await expect(page.getByText('Features', { exact: true })).toBeVisible()
  await expect(page.getByText('Documentation', { exact: true })).toBeVisible()
  await expect(page.getByText('add login')).toBeVisible()
  await expect(page.getByText('update readme')).toBeVisible()
})

test('[A6] toggling the checkbox next to an item marks it checked', async ({ page }) => {
  await page.goto('/')
  await addCommits(page, ['feat: add login', 'docs: update readme'])
  await page.getByRole('button', { name: 'Generate changelog' }).click()
  // The checkbox and the item text share a row in the rendered preview.
  await page.locator('li', { hasText: 'add login' }).getByRole('checkbox').click()
  await expect(page.locator('li', { hasText: 'add login' }).getByRole('checkbox')).toBeChecked()
})

test('[A7] copying the markdown copies the exact text', async ({ page }) => {
  await page.goto('/')
  await addCommits(page, ['feat: add login', 'docs: update readme'])
  await page.getByRole('button', { name: 'Generate changelog' }).click()
  await page.getByRole('button', { name: 'Copy Markdown' }).click()
  // Reading the clipboard back from the page after the user action is allowed.
  const text = await page.evaluate(async () =>
    await navigator.clipboard.readText()
  )
  expect(text).toBe('## Features\n- [ ] add login\n\n## Documentation\n- [ ] update readme')
})

test('[A8] exporting as JSON downloads the correct array', async ({ page }) => {
  await page.goto('/')
  await addCommits(page, ['feat: add login', 'docs: update readme'])
  await page.getByRole('button', { name: 'Generate changelog' }).click()
  await page.getByRole('button', { name: 'Export' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'JSON' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('changelog.json')
  const tmp = '/tmp/changelog-download.json'
  await download.saveAs(tmp)
  const { readFileSync } = await import('node:fs')
  expect(JSON.parse(readFileSync(tmp, 'utf8'))).toEqual([
    { message: 'feat: add login', section: 'Features' },
    { message: 'docs: update readme', section: 'Documentation' },
  ])
})

test('[A9] the commit list persists across a reload', async ({ page }) => {
  await page.goto('/')
  await addCommits(page, ['feat: add login'])
  await page.reload()
  await expect(page.getByText('feat: add login')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate changelog' })).toBeVisible()
})
